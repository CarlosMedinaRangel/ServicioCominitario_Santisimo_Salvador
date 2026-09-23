import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentVerification,
  DocumentType,
  RecipientType,
  DocumentStatus,
} from './entities/document-verification.entity';
import { CryptoService, QrDocumentPayload } from '../crypto/crypto.service';
import { QrGeneratorService } from '../crypto/qr-generator.service';
import { randomUUID } from 'node:crypto';

export interface IssueDocumentParams {
  documentType: DocumentType;
  recipientType: RecipientType;
  recipientId: string;
  recipientIdentifier: string;
  recipientName: string;
  issuedByUserId?: string;
  issuedByName?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  isValid: boolean;
  status: DocumentStatus | 'COUNTERFEIT';
  message: string;
  document?: {
    id: string;
    documentType: DocumentType;
    recipientType: RecipientType;
    recipientId: string;
    recipientIdentifier: string;
    recipientName: string;
    issuedByName?: string;
    issuedAt: Date;
    metadata?: Record<string, any>;
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentVerification)
    private readonly docVerificationRepo: Repository<DocumentVerification>,
    private readonly cryptoService: CryptoService,
    private readonly qrGeneratorService: QrGeneratorService,
  ) {}

  /**
   * Registers a new issued document in DB, encrypts its cryptographic seal and creates the QR image.
   */
  async issueDocument(params: IssueDocumentParams): Promise<{
    record: DocumentVerification;
    verificationCode: string;
    qrDataUrl: string;
  }> {
    const docId = randomUUID();
    const issuedAt = new Date();

    const payload: QrDocumentPayload = {
      uuid: docId,
      documentType: params.documentType,
      recipientType: params.recipientType,
      recipientIdentifier: params.recipientIdentifier,
      issuedAt: issuedAt.toISOString(),
      issuedByUserId: params.issuedByUserId,
    };

    // Encrypt payload into tamper-proof token
    const verificationCode = this.cryptoService.encryptPayload(payload);

    // Generate QR Code PNG base64 Data URL for PDF insertion
    const qrDataUrl =
      await this.qrGeneratorService.generateDataUrl(verificationCode);

    // Persist in DB
    const record = this.docVerificationRepo.create({
      id: docId,
      documentType: params.documentType,
      recipientType: params.recipientType,
      recipientId: params.recipientId,
      recipientIdentifier: params.recipientIdentifier,
      recipientName: params.recipientName,
      issuedByUserId: params.issuedByUserId,
      issuedByName: params.issuedByName,
      metadata: params.metadata,
      verificationCode,
      status: DocumentStatus.VALID,
    });

    await this.docVerificationRepo.save(record);

    return {
      record,
      verificationCode,
      qrDataUrl,
    };
  }

  /**
   * Validates a physical/scanned QR code:
   * 1. Decrypts AES-256-GCM cipher with MAC integrity check.
   * 2. Cross-references database record.
   * 3. Checks revocation status.
   */
  async verifyDocument(code: string): Promise<VerificationResult> {
    // Step 1: Decrypt and check cryptographic authentication tag
    const payload = this.cryptoService.decryptPayload<QrDocumentPayload>(code);

    if (!payload || !payload.uuid) {
      throw new BadRequestException('El código no contiene un UUID válido.');
    }

    // Step 2: Query DB record
    const record = await this.docVerificationRepo.findOne({
      where: { id: payload.uuid },
    });

    if (!record) {
      return {
        isValid: false,
        status: 'COUNTERFEIT',
        message:
          'El documento posee un formato criptográfico válido pero no fue registrado en el sistema.',
      };
    }

    if (record.status === DocumentStatus.REVOKED) {
      return {
        isValid: false,
        status: DocumentStatus.REVOKED,
        message:
          'Este documento fue formalmente ANULADO o REVOCADO por la institución.',
        document: {
          id: record.id,
          documentType: record.documentType,
          recipientType: record.recipientType,
          recipientId: record.recipientId,
          recipientIdentifier: record.recipientIdentifier,
          recipientName: record.recipientName,
          issuedByName: record.issuedByName,
          issuedAt: record.issuedAt,
          metadata: record.metadata,
        },
      };
    }

    return {
      isValid: true,
      status: DocumentStatus.VALID,
      message: 'Documento auténtico y verificado con éxito.',
      document: {
        id: record.id,
        documentType: record.documentType,
        recipientType: record.recipientType,
        recipientId: record.recipientId,
        recipientIdentifier: record.recipientIdentifier,
        recipientName: record.recipientName,
        issuedByName: record.issuedByName,
        issuedAt: record.issuedAt,
        metadata: record.metadata,
      },
    };
  }

  /**
   * Revokes an existing issued document.
   */
  async revokeDocument(id: string): Promise<DocumentVerification> {
    const record = await this.docVerificationRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado.`);
    }

    record.status = DocumentStatus.REVOKED;
    return this.docVerificationRepo.save(record);
  }

  /**
   * Lists verifications for a specific recipient.
   */
  async findByRecipient(recipientId: string): Promise<DocumentVerification[]> {
    return this.docVerificationRepo.find({
      where: { recipientId },
      order: { issuedAt: 'DESC' },
    });
  }
}
