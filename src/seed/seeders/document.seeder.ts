import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import {
  DocumentVerification,
  DocumentType,
  RecipientType,
  DocumentStatus,
} from '../../documents/entities/document-verification.entity';
import { CryptoService, QrDocumentPayload } from '../../crypto/crypto.service';
import { CANONICAL_DOCUMENTS } from '../data/documents.canonical';
import { SeededUsers } from './user.seeder';
import { SeededEmployees } from './employee.seeder';

export interface SeededDocuments {
  canonicalCount: number;
  bulkCount: number;
  totalCount: number;
}

@Injectable()
export class DocumentSeeder {
  constructor(
    @InjectRepository(DocumentVerification)
    private readonly docVerificationRepository: Repository<DocumentVerification>,
    private readonly cryptoService: CryptoService,
  ) {}

  async run(
    users: SeededUsers,
    employees: SeededEmployees,
  ): Promise<SeededDocuments> {
    // 1. Sembrar Documentos Canónicos (12 documentos institucionales con firma AES-256-GCM real)
    let canonicalCount = 0;
    for (const canonicalDoc of CANONICAL_DOCUMENTS) {
      const payload: QrDocumentPayload = {
        uuid: canonicalDoc.id,
        documentType: canonicalDoc.documentType,
        recipientType: canonicalDoc.recipientType,
        recipientIdentifier: canonicalDoc.recipientIdentifier,
        issuedAt: (canonicalDoc.issuedAt as Date).toISOString(),
        issuedByUserId: canonicalDoc.issuedByUserId,
      };

      // Cifra el sello digital con la clave criptográfica activa del entorno
      const realVerificationCode = this.cryptoService.encryptPayload(payload, 'DOC');

      const docRecord = this.docVerificationRepository.create({
        ...canonicalDoc,
        verificationCode: realVerificationCode,
      });

      await this.docVerificationRepository.save(docRecord);
      canonicalCount++;
    }

    // 2. Sembrar Documentos Históricos de Volumen (12 a 15 documentos para bulk employees)
    let bulkCount = 0;
    const documentTypes = [
      DocumentType.CONSTANCIA_TRABAJO,
      DocumentType.SOLVENCIA_ADMINISTRATIVA,
      DocumentType.RECIBO_PAGO,
      DocumentType.OTRO,
    ];

    const bulkEmployees = employees.bulk;
    const adminUser = users.admin;

    // Generar 12 documentos adicionales distribuidos entre los empleados de volumen
    for (let i = 0; i < 12; i++) {
      const empIndex = i % bulkEmployees.length;
      const emp = bulkEmployees[empIndex];
      const user = users.bulk[empIndex];

      const docId = randomUUID();
      const docType = documentTypes[i % documentTypes.length];
      const isRevoked = i === 4 || i === 9; // 2 documentos revocados para pruebas
      const status = isRevoked ? DocumentStatus.REVOKED : DocumentStatus.VALID;

      // Fechas aleatorias distribuidas entre 2025 y 2026
      const month = String((i % 12) + 1).padStart(2, '0');
      const year = i < 6 ? '2025' : '2026';
      const issuedAt = new Date(`${year}-${month}-15T10:00:00.000Z`);

      const payload: QrDocumentPayload = {
        uuid: docId,
        documentType: docType,
        recipientType: RecipientType.EMPLOYEE,
        recipientIdentifier: user.cedula || `V100000${empIndex + 1}`,
        issuedAt: issuedAt.toISOString(),
        issuedByUserId: adminUser.id,
      };

      const verificationCode = this.cryptoService.encryptPayload(payload, 'DOC');

      const bulkDoc = this.docVerificationRepository.create({
        id: docId,
        documentType: docType,
        recipientType: RecipientType.EMPLOYEE,
        recipientId: user.id,
        recipientIdentifier: user.cedula || `V100000${empIndex + 1}`,
        recipientName: user.fullName,
        issuedByUserId: adminUser.id,
        issuedByName: adminUser.fullName,
        status,
        metadata: {
          cargo: emp.position,
          departamento: 'Docencia General',
          periodo: `${year}-I`,
          ...(isRevoked
            ? { motivoRevocacion: 'Documento anulado por corrección administrativa.' }
            : {}),
        },
        verificationCode,
        issuedAt,
        updatedAt: issuedAt,
      });

      await this.docVerificationRepository.save(bulkDoc);
      bulkCount++;
    }

    return {
      canonicalCount,
      bulkCount,
      totalCount: canonicalCount + bulkCount,
    };
  }
}
