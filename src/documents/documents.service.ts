import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import {
  DocumentVerification,
  DocumentType,
  RecipientType,
  DocumentStatus,
} from './entities/document-verification.entity';
import { CryptoService, QrDocumentPayload } from '../crypto/crypto.service';
import { QrGeneratorService } from '../crypto/qr-generator.service';
import { randomUUID } from 'node:crypto';

import { User } from '../auth/entities/auth.entity';

export interface IssueDocumentParams {
  documentType: DocumentVerification['documentType'];
  recipientType: DocumentVerification['recipientType'];
  recipientId: DocumentVerification['recipientId'];
  recipientIdentifier: DocumentVerification['recipientIdentifier'];
  recipientName: DocumentVerification['recipientName'];
  issuedByUserId?: DocumentVerification['issuedByUserId'];
  issuedByName?: DocumentVerification['issuedByName'];
  metadata?: DocumentVerification['metadata'];
}

export interface VerificationResult {
  isValid: boolean;
  status: DocumentVerification['status'] | 'COUNTERFEIT';
  message: string;
  document?: {
    id: DocumentVerification['id'];
    documentType: DocumentVerification['documentType'] | string;
    recipientType: DocumentVerification['recipientType'];
    recipientId: DocumentVerification['recipientId'];
    recipientIdentifier: DocumentVerification['recipientIdentifier'];
    recipientName: DocumentVerification['recipientName'];
    issuedByName?: DocumentVerification['issuedByName'];
    issuedAt: DocumentVerification['issuedAt'];
    metadata?: DocumentVerification['metadata'];
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentVerification)
    private readonly docVerificationRepo: Repository<DocumentVerification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

    // Encrypt payload into tamper-proof token explicitly specifying 'DOC' subtype
    const verificationCode = this.cryptoService.encryptPayload(payload, 'DOC');

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
      issuedByName: params.issuedByName || 'Autoservicio',
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
   * 1. Inspects token header (determines whether it's DOC or EDID/DID).
   * 2. Decrypts AES-256-GCM cipher with MAC integrity check.
   * 3. Cross-references database record and revocation status.
   */
  async verifyDocument(code: string): Promise<VerificationResult> {
    const header = this.cryptoService.inspectToken(code);
    if (!header.isValidHeader) {
      throw new BadRequestException('Estructura de sello digital inválida o irreconocible.');
    }

    // Branch 1: Employee / Student Digital ID Verification
    if (header.subType === 'EDID' || header.subType === 'DID') {
      const payload = this.cryptoService.decryptPayload(code, 'EDID');
      const user = await this.userRepo.findOne({
        where: { id: payload.userId },
        relations: { employee: true },
      });

      if (!user) {
        return {
          isValid: false,
          status: 'COUNTERFEIT',
          message:
            'Carnet falsificado o no registrado: El identificador del usuario no existe en los registros de la institución.',
        };
      }

      if (!user.employee) {
        return {
          isValid: false,
          status: 'COUNTERFEIT',
          message:
            'El usuario asociado al carnet no posee registro de empleado docente ni administrativo.',
        };
      }

      if (!user.isActive) {
        return {
          isValid: false,
          status: DocumentStatus.REVOKED,
          message:
            'Credencial inactiva: El titular de este carnet se encuentra actualmente desvinculado o inactivo en la institución.',
          document: {
            id: user.employee.userId,
            documentType: 'CARNET_DIGITAL_EMPLEADO',
            recipientType: RecipientType.EMPLOYEE,
            recipientId: user.id,
            recipientIdentifier: user.cedula || payload.cedula,
            recipientName: user.fullName,
            issuedByName: 'Dirección del Plantel',
            issuedAt: new Date(payload.issuedAt),
            metadata: {
              cargo: user.employee.position,
              estatusLaboral: 'INACTIVO / DESVINCULADO',
            },
          },
        };
      }

      return {
        isValid: true,
        status: DocumentStatus.VALID,
        message: 'Carnet de Identificación Digital verificado con éxito.',
        document: {
          id: user.employee.userId,
          documentType: 'CARNET_DIGITAL_EMPLEADO',
          recipientType: RecipientType.EMPLOYEE,
          recipientId: user.id,
          recipientIdentifier: user.cedula || payload.cedula,
          recipientName: user.fullName,
          issuedByName: 'Dirección del Plantel',
          issuedAt: new Date(payload.issuedAt),
          metadata: {
            cargo: user.employee.position,
            correo: user.email,
            telefono: user.telefono,
          },
        },
      };
    }

    // Branch 2: Official Document Verification ('DOC')
    const payload = this.cryptoService.decryptPayload(code, 'DOC');

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
   * Finds a single document verification by UUID.
   */
  async findOne(id: string): Promise<DocumentVerification | null> {
    return this.docVerificationRepo.findOne({ where: { id } });
  }

  /**
   * Re-generates QR Data URL for an existing verification code.
   */
  async getQrDataUrl(verificationCode: string): Promise<string> {
    return this.qrGeneratorService.generateDataUrl(verificationCode);
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
   * Lists verifications for a specific recipient with optional filtering and pagination.
   */
  async findByRecipient(
    recipientId: string,
    options?: {
      status?: DocumentStatus;
      page?: number;
      limit?: number;
      documentType?: DocumentType;
      search?: string;
      from?: string;
      to?: string;
    },
  ): Promise<{ data: DocumentVerification[]; total: number; page: number; totalPages: number } | DocumentVerification[]> {
    const isPaginated =
      options?.page !== undefined ||
      options?.limit !== undefined ||
      options?.search !== undefined ||
      options?.documentType !== undefined ||
      options?.from !== undefined ||
      options?.to !== undefined ||
      options?.status !== undefined;

    if (!isPaginated) {
      return this.docVerificationRepo.find({
        where: { recipientId },
        order: { issuedAt: 'DESC' },
      });
    }

    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options?.limit) || 20));
    const skip = (page - 1) * limit;

    const baseWhere: any = { recipientId };
    if (options?.status) {
      baseWhere.status = options.status;
    }
    if (options?.documentType && (options.documentType as any) !== 'Todos') {
      baseWhere.documentType = options.documentType;
    }
    if (options?.from || options?.to) {
      const fromDate = options?.from ? new Date(options.from) : new Date(0);
      const toDate = options?.to ? new Date(options.to) : new Date('2099-12-31T23:59:59.999Z');
      baseWhere.issuedAt = Between(fromDate, toDate);
    }

    let where: any = baseWhere;
    const trimmed = options?.search?.trim();
    if (trimmed) {
      // Requisito 1.2: En /constancias, buscar por emisor / quien lo emitió
      where = {
        ...baseWhere,
        issuedByName: ILike(`%${trimmed}%`),
      };
    }

    const [data, total] = await this.docVerificationRepo.findAndCount({
      where,
      order: { issuedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lists all issued document verifications with optional filtering and pagination.
   */
  async findAll(options?: {
    status?: DocumentStatus;
    page?: number;
    limit?: number;
    documentType?: DocumentType;
    search?: string;
    from?: string;
    to?: string;
  }): Promise<{ data: DocumentVerification[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options?.limit) || 20));
    const skip = (page - 1) * limit;

    const baseWhere: any = {};
    if (options?.status) {
      baseWhere.status = options.status;
    }
    if (options?.documentType && (options.documentType as any) !== 'Todos') {
      baseWhere.documentType = options.documentType;
    }
    if (options?.from || options?.to) {
      const fromDate = options?.from ? new Date(options.from) : new Date(0);
      const toDate = options?.to ? new Date(options.to) : new Date('2099-12-31T23:59:59.999Z');
      baseWhere.issuedAt = Between(fromDate, toDate);
    }

    let where: any = baseWhere;
    const trimmed = options?.search?.trim();
    if (trimmed) {
      const cleanSearch = `%${trimmed}%`;
      const isCedulaPattern = /^[VEJG]?[-.\s]*\d[\d.\s]*$/i.test(trimmed);
      const rawDigits = trimmed.replace(/\D/g, '');

      // Requisito 1.1: Búsqueda por input restringida estrictamente al destinatario
      const searchConditions: any[] = [
        { ...baseWhere, recipientName: ILike(cleanSearch) },
      ];

      if (isCedulaPattern && rawDigits) {
        searchConditions.push(
          { ...baseWhere, recipientIdentifier: ILike(`%${rawDigits}%`) },
          { ...baseWhere, recipientIdentifier: ILike(cleanSearch) },
        );
      } else {
        searchConditions.push({
          ...baseWhere,
          recipientIdentifier: ILike(cleanSearch),
        });
      }

      where = searchConditions;
    }

    const [data, total] = await this.docVerificationRepo.findAndCount({
      where,
      order: { issuedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Returns verification statistics (total, valid, revoked).
   */
  async getStats(): Promise<{ total: number; valid: number; revoked: number }> {
    const total = await this.docVerificationRepo.count();
    const valid = await this.docVerificationRepo.count({
      where: { status: DocumentStatus.VALID },
    });
    const revoked = await this.docVerificationRepo.count({
      where: { status: DocumentStatus.REVOKED },
    });

    return { total, valid, revoked };
  }
}
