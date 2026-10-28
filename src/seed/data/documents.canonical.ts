import {
  DocumentVerification,
  DocumentType,
  RecipientType,
  DocumentStatus,
} from '../../documents/entities/document-verification.entity';
import { EntityData } from '../../common/types/entity-data.type';
import {
  CANONICAL_ADMIN_USER,
  CANONICAL_ELENA_USER,
  CANONICAL_CARLOS_USER,
  CANONICAL_ANA_USER,
  CANONICAL_INACTIVE_USER,
} from './users.canonical';

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ ARQUETIPOS CANÓNICOS DE DOCUMENTOS (Colegio Santísimo Salvador)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * ¿QUÉ SON ESTOS DATOS Y POR QUÉ EXISTEN AQUÍ?
 * Representan el archivo histórico institucional y sellos digitales QR de prueba.
 * Cada empleado canónico cuenta con 3 documentos:
 *   1. Constancia de Trabajo vigente (VALID).
 *   2. Solvencia Administrativa / Asignación vigente (VALID).
 *   3. Documento histórico anulado por rectificación o egreso (REVOKED).
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Cada arquetipo está fuertemente tipado mediante `satisfies EntityData<DocumentVerification>`.
 * Si una columna se modifica, añade o elimina en `src/documents/entities/document-verification.entity.ts`,
 * TypeScript romperá la compilación en este archivo inmediatamente.
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const CANONICAL_ELENA_DOCUMENTS: EntityData<DocumentVerification>[] = [
  {
    id: 'd0000000-0000-4000-8000-000000000001',
    documentType: DocumentType.CONSTANCIA_TRABAJO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_ELENA_USER.id,
    recipientIdentifier: CANONICAL_ELENA_USER.cedula,
    recipientName: CANONICAL_ELENA_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      cargo: 'Docente Titular',
      departamento: 'Ciencias y Biología',
      fechaIngreso: '2018-09-01',
      periodo: '2025-2026',
    },
    verificationCode: 'SS-DOC:v1:mockElenaDoc1Iv12.mockElenaDoc1Tag16.mockElenaDoc1CipherValid',
    issuedAt: new Date('2025-10-15T09:30:00.000Z'),
    updatedAt: new Date('2025-10-15T09:30:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000002',
    documentType: DocumentType.SOLVENCIA_ADMINISTRATIVA,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_ELENA_USER.id,
    recipientIdentifier: CANONICAL_ELENA_USER.cedula,
    recipientName: CANONICAL_ELENA_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      tipoSolvencia: 'Administrativa y Académica',
      periodo: '2025-2026',
    },
    verificationCode: 'SS-DOC:v1:mockElenaDoc2Iv12.mockElenaDoc2Tag16.mockElenaDoc2CipherValid',
    issuedAt: new Date('2026-01-10T14:15:00.000Z'),
    updatedAt: new Date('2026-01-10T14:15:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000003',
    documentType: DocumentType.RECIBO_PAGO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_ELENA_USER.id,
    recipientIdentifier: CANONICAL_ELENA_USER.cedula,
    recipientName: CANONICAL_ELENA_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.REVOKED,
    metadata: {
      concepto: 'Bono Docente Septiembre 2024',
      motivoRevocacion: 'Anulado por reajuste administrativo de tabulador salarial.',
    },
    verificationCode: 'SS-DOC:v1:mockElenaDoc3Iv12.mockElenaDoc3Tag16.mockElenaDoc3CipherRevoked',
    issuedAt: new Date('2024-09-30T16:00:00.000Z'),
    updatedAt: new Date('2024-10-02T11:00:00.000Z'),
  },
];

export const CANONICAL_CARLOS_DOCUMENTS: EntityData<DocumentVerification>[] = [
  {
    id: 'd0000000-0000-4000-8000-000000000004',
    documentType: DocumentType.CONSTANCIA_TRABAJO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_CARLOS_USER.id,
    recipientIdentifier: CANONICAL_CARLOS_USER.cedula,
    recipientName: CANONICAL_CARLOS_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      cargo: 'Profesor de Matemáticas',
      departamento: 'Matemáticas y Física',
      fechaIngreso: '2020-02-15',
      periodo: '2025-2026',
    },
    verificationCode: 'SS-DOC:v1:mockCarlosDoc1Iv.mockCarlosDoc1Tag.mockCarlosDoc1CipherValid',
    issuedAt: new Date('2025-11-05T08:00:00.000Z'),
    updatedAt: new Date('2025-11-05T08:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000005',
    documentType: DocumentType.SOLVENCIA_ADMINISTRATIVA,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_CARLOS_USER.id,
    recipientIdentifier: CANONICAL_CARLOS_USER.cedula,
    recipientName: CANONICAL_CARLOS_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      tipoSolvencia: 'Solvencia de Material Educativo',
      periodo: '2025-2026',
    },
    verificationCode: 'SS-DOC:v1:mockCarlosDoc2Iv.mockCarlosDoc2Tag.mockCarlosDoc2CipherValid',
    issuedAt: new Date('2026-01-20T11:45:00.000Z'),
    updatedAt: new Date('2026-01-20T11:45:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000006',
    documentType: DocumentType.CONSTANCIA_TRABAJO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_CARLOS_USER.id,
    recipientIdentifier: CANONICAL_CARLOS_USER.cedula,
    recipientName: CANONICAL_CARLOS_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.REVOKED,
    metadata: {
      cargo: 'Profesor Suplente',
      motivoRevocacion: 'Reemplazado por constancia con cargo titular definitivo.',
    },
    verificationCode: 'SS-DOC:v1:mockCarlosDoc3Iv.mockCarlosDoc3Tag.mockCarlosDoc3CipherRevoked',
    issuedAt: new Date('2025-01-10T10:00:00.000Z'),
    updatedAt: new Date('2025-01-15T09:00:00.000Z'),
  },
];

export const CANONICAL_ANA_DOCUMENTS: EntityData<DocumentVerification>[] = [
  {
    id: 'd0000000-0000-4000-8000-000000000007',
    documentType: DocumentType.CONSTANCIA_TRABAJO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_ANA_USER.id,
    recipientIdentifier: CANONICAL_ANA_USER.cedula,
    recipientName: CANONICAL_ANA_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      cargo: 'Coordinadora Académica',
      departamento: 'Dirección Pedagógica',
      fechaIngreso: '2022-06-01',
      periodo: '2025-2026',
    },
    verificationCode: 'SS-DOC:v1:mockAnaDoc1Iv123.mockAnaDoc1Tag16.mockAnaDoc1CipherValid',
    issuedAt: new Date('2025-09-22T10:30:00.000Z'),
    updatedAt: new Date('2025-09-22T10:30:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000008',
    documentType: DocumentType.SOLVENCIA_ADMINISTRATIVA,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_ANA_USER.id,
    recipientIdentifier: CANONICAL_ANA_USER.cedula,
    recipientName: CANONICAL_ANA_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      tipoSolvencia: 'Solvencia de Coordinación',
      periodo: '2025-2026',
    },
    verificationCode: 'SS-DOC:v1:mockAnaDoc2Iv123.mockAnaDoc2Tag16.mockAnaDoc2CipherValid',
    issuedAt: new Date('2026-02-01T15:20:00.000Z'),
    updatedAt: new Date('2026-02-01T15:20:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000009',
    documentType: DocumentType.RECIBO_PAGO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_ANA_USER.id,
    recipientIdentifier: CANONICAL_ANA_USER.cedula,
    recipientName: CANONICAL_ANA_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.REVOKED,
    metadata: {
      concepto: 'Asignación Extraordinaria Noviembre 2024',
      motivoRevocacion: 'Anulado por error en cálculo de deducciones gremiales.',
    },
    verificationCode: 'SS-DOC:v1:mockAnaDoc3Iv123.mockAnaDoc3Tag16.mockAnaDoc3CipherRevoked',
    issuedAt: new Date('2024-11-28T12:00:00.000Z'),
    updatedAt: new Date('2024-12-01T08:30:00.000Z'),
  },
];

export const CANONICAL_INACTIVE_DOCUMENTS: EntityData<DocumentVerification>[] = [
  {
    id: 'd0000000-0000-4000-8000-000000000010',
    documentType: DocumentType.CONSTANCIA_TRABAJO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_INACTIVE_USER.id,
    recipientIdentifier: CANONICAL_INACTIVE_USER.cedula,
    recipientName: CANONICAL_INACTIVE_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      cargo: 'Docente Suplente (Retirado)',
      periodoServicio: '2021 - 2024',
      observacion: 'Constancia histórica de prestación de servicios.',
    },
    verificationCode: 'SS-DOC:v1:mockInacDoc1Iv12.mockInacDoc1Tag16.mockInacDoc1CipherValid',
    issuedAt: new Date('2024-07-15T09:00:00.000Z'),
    updatedAt: new Date('2024-07-15T09:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000011',
    documentType: DocumentType.SOLVENCIA_ADMINISTRATIVA,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_INACTIVE_USER.id,
    recipientIdentifier: CANONICAL_INACTIVE_USER.cedula,
    recipientName: CANONICAL_INACTIVE_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.VALID,
    metadata: {
      tipoSolvencia: 'Solvencia de Egreso y Desincorporación',
      periodo: '2024',
    },
    verificationCode: 'SS-DOC:v1:mockInacDoc2Iv12.mockInacDoc2Tag16.mockInacDoc2CipherValid',
    issuedAt: new Date('2024-07-20T11:00:00.000Z'),
    updatedAt: new Date('2024-07-20T11:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000012',
    documentType: DocumentType.OTRO,
    recipientType: RecipientType.EMPLOYEE,
    recipientId: CANONICAL_INACTIVE_USER.id,
    recipientIdentifier: CANONICAL_INACTIVE_USER.cedula,
    recipientName: CANONICAL_INACTIVE_USER.fullName,
    issuedByUserId: CANONICAL_ADMIN_USER.id,
    issuedByName: CANONICAL_ADMIN_USER.fullName,
    status: DocumentStatus.REVOKED,
    metadata: {
      descripcion: 'Carnet Físico / Credencial Institucional 2024',
      motivoRevocacion: 'Revocado por cese de funciones y desincorporación del personal.',
    },
    verificationCode: 'SS-DOC:v1:mockInacDoc3Iv12.mockInacDoc3Tag16.mockInacDoc3CipherRevoked',
    issuedAt: new Date('2024-01-15T08:00:00.000Z'),
    updatedAt: new Date('2024-07-31T17:00:00.000Z'),
  },
];

export const CANONICAL_DOCUMENTS = [
  ...CANONICAL_ELENA_DOCUMENTS,
  ...CANONICAL_CARLOS_DOCUMENTS,
  ...CANONICAL_ANA_DOCUMENTS,
  ...CANONICAL_INACTIVE_DOCUMENTS,
] as const;
