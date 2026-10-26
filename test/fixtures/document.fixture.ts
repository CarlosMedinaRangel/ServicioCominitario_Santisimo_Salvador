import { DeepPartial } from 'typeorm';
import {
  DocumentVerification,
  DocumentType,
  RecipientType,
  DocumentStatus,
} from '../../src/documents/entities/document-verification.entity';
import { EntityData } from './user.fixture';

/**
 * Creates a mock DocumentVerification entity with sensible defaults for unit tests.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Uses `satisfies EntityData<DocumentVerification>` to guarantee that cryptographic seal
 * records adhere strictly to the immutable public contract and TypeORM schema.
 *
 * @param overrides Optional partial properties to override defaults.
 * @returns A real `DocumentVerification` instance bound to the database entity.
 */
export function createMockDocumentVerification(
  overrides: Partial<EntityData<DocumentVerification>> | DeepPartial<DocumentVerification> = {},
): DocumentVerification {
  const defaultDocData = {
    id: '8f2a1b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
    documentType: DocumentType.CONSTANCIA_TRABAJO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: 'emp-uuid-mock-1',
    recipientIdentifier: 'V-18765432',
    recipientName: 'Prof. Mario Silva',
    issuedByUserId: 'admin-uuid-mock-1',
    issuedByName: 'Dirección del Plantel',
    status: DocumentStatus.VALID,
    metadata: { cargo: 'Docente Titular', periodo: '2026-I' },
    verificationCode: 'SS-DOC:v1:ivMock123456.authTagMock1234.cipherMock1234567890',
    issuedAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  } satisfies EntityData<DocumentVerification>;

  const doc = new DocumentVerification();
  return Object.assign(doc, defaultDocData, overrides);
}
