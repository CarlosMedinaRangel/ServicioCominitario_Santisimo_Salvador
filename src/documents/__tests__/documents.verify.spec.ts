import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DocumentsService } from '../documents.service';
import {
  DocumentVerification,
  DocumentType,
  RecipientType,
  DocumentStatus,
} from '../entities/document-verification.entity';
import { User } from '../../auth/entities/auth.entity';
import { CryptoService, QrTokenHeader } from '../../crypto/crypto.service';
import { QrGeneratorService } from '../../crypto/qr-generator.service';
import { createMockUser } from '../../../test/fixtures/user.fixture';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';

describe('DocumentsService - Verification (verifyDocument)', () => {
  let service: DocumentsService;
  let mockDocRepo: jest.Mocked<Partial<Repository<DocumentVerification>>>;
  let mockUserRepo: jest.Mocked<Partial<Repository<User>>>;
  let mockCryptoService: jest.Mocked<Partial<CryptoService>>;
  let mockQrGeneratorService: jest.Mocked<Partial<QrGeneratorService>>;

  const MOCK_DOC_ID = '8f2a1b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c';
  const MOCK_TOKEN = 'SS-DOC:v1:iv1234567890.authTag1234567890.cipher123456';

  beforeEach(() => {
    mockDocRepo = {
      findOne: jest.fn(),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    mockCryptoService = {
      inspectToken: jest.fn(),
      decryptPayload: jest.fn(),
    };

    mockQrGeneratorService = {};

    service = new DocumentsService(
      mockDocRepo as Repository<DocumentVerification>,
      mockUserRepo as Repository<User>,
      mockCryptoService as CryptoService,
      mockQrGeneratorService as QrGeneratorService,
    );
  });

  describe('Token Header Inspection', () => {
    it('should throw BadRequestException if token header is invalid or unparseable', async () => {
      (mockCryptoService.inspectToken as jest.Mock).mockReturnValue({
        isValidHeader: false,
      } as QrTokenHeader);

      await expect(service.verifyDocument('MALFORMED-TOKEN')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyDocument('MALFORMED-TOKEN')).rejects.toThrow(
        'Estructura de sello digital inválida o irreconocible.',
      );
    });
  });

  describe('Digital ID Branch (EDID / DID)', () => {
    const edidInspection: QrTokenHeader = {
      isValidHeader: true,
      institution: 'SS',
      subType: 'EDID',
      version: 'v1',
    };

    const edidPayload = {
      userId: 'user-uuid-999',
      cedula: 'V-12345678',
      issuedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      (mockCryptoService.inspectToken as jest.Mock).mockReturnValue(edidInspection);
      (mockCryptoService.decryptPayload as jest.Mock).mockReturnValue(edidPayload);
    });

    it('should return COUNTERFEIT if user does not exist in DB', async () => {
      (mockUserRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyDocument('SS-EDID:v1:fake');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('COUNTERFEIT');
      expect(result.message).toContain('Carnet falsificado o no registrado');
    });

    it('should return COUNTERFEIT if user exists but has no employee relation', async () => {
      (mockUserRepo.findOne as jest.Mock).mockResolvedValue(
        createMockUser({
          id: 'user-uuid-999',
          fullName: 'Carlos Medina',
          employee: undefined,
        }),
      );

      const result = await service.verifyDocument('SS-EDID:v1:no-employee');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('COUNTERFEIT');
      expect(result.message).toContain('no posee registro de empleado');
    });

    it('should return REVOKED if user exists and is an employee, but isActive is false', async () => {
      (mockUserRepo.findOne as jest.Mock).mockResolvedValue(
        createMockUser({
          id: 'user-uuid-999',
          fullName: 'Carlos Medina',
          cedula: 'V-12345678',
          isActive: false,
          employee: createMockEmployee({
            userId: 'user-uuid-999',
            position: 'Docente',
          }),
        }),
      );

      const result = await service.verifyDocument('SS-EDID:v1:inactive');

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(DocumentStatus.REVOKED);
      expect(result.message).toContain('Credencial inactiva');
      expect(result.document?.metadata?.estatusLaboral).toBe('INACTIVO / DESVINCULADO');
    });

    it('should return VALID with full profile data if user is an active employee', async () => {
      (mockUserRepo.findOne as jest.Mock).mockResolvedValue(
        createMockUser({
          id: 'user-uuid-999',
          fullName: 'Carlos Medina',
          cedula: 'V-12345678',
          email: 'carlos@santisimo.edu',
          telefono: '0414-1234567',
          isActive: true,
          employee: createMockEmployee({
            userId: 'user-uuid-999',
            position: 'Coordinador Académico',
          }),
        }),
      );

      const result = await service.verifyDocument('SS-EDID:v1:active');

      expect(result.isValid).toBe(true);
      expect(result.status).toBe(DocumentStatus.VALID);
      expect(result.message).toContain('verificado con éxito');
      expect(result.document?.documentType).toBe('CARNET_DIGITAL_EMPLEADO');
      expect(result.document?.recipientName).toBe('Carlos Medina');
      expect(result.document?.metadata?.cargo).toBe('Coordinador Académico');
      expect(result.document?.metadata?.correo).toBe('carlos@santisimo.edu');
    });
  });

  describe('Official Document Branch (DOC)', () => {
    const docInspection: QrTokenHeader = {
      isValidHeader: true,
      institution: 'SS',
      subType: 'DOC',
      version: 'v1',
    };

    beforeEach(() => {
      (mockCryptoService.inspectToken as jest.Mock).mockReturnValue(docInspection);
    });

    it('should throw BadRequestException if decrypted payload does not contain uuid', async () => {
      (mockCryptoService.decryptPayload as jest.Mock).mockReturnValue({
        documentType: 'CONSTANCIA_TRABAJO',
      });

      await expect(service.verifyDocument(MOCK_TOKEN)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyDocument(MOCK_TOKEN)).rejects.toThrow(
        'El código no contiene un UUID válido.',
      );
    });

    it('should return COUNTERFEIT if document record is not found in database', async () => {
      (mockCryptoService.decryptPayload as jest.Mock).mockReturnValue({
        uuid: MOCK_DOC_ID,
      });
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.verifyDocument(MOCK_TOKEN);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe('COUNTERFEIT');
      expect(result.message).toContain('no fue registrado en el sistema');
    });

    it('should return REVOKED if document status in DB is REVOKED', async () => {
      (mockCryptoService.decryptPayload as jest.Mock).mockReturnValue({
        uuid: MOCK_DOC_ID,
      });
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(
        createMockDocumentVerification({
          id: MOCK_DOC_ID,
          documentType: DocumentType.CONSTANCIA_TRABAJO,
          recipientType: RecipientType.EMPLOYEE,
          recipientId: 'emp-uuid',
          recipientIdentifier: 'V-12345678',
          recipientName: 'Juan Pérez',
          status: DocumentStatus.REVOKED,
          issuedAt: new Date(),
        }),
      );

      const result = await service.verifyDocument(MOCK_TOKEN);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(DocumentStatus.REVOKED);
      expect(result.message).toContain('ANULADO o REVOCADO');
      expect(result.document?.recipientName).toBe('Juan Pérez');
    });

    it('should return VALID with document details if document exists and is VALID', async () => {
      (mockCryptoService.decryptPayload as jest.Mock).mockReturnValue({
        uuid: MOCK_DOC_ID,
      });
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(
        createMockDocumentVerification({
          id: MOCK_DOC_ID,
          documentType: DocumentType.CONSTANCIA_TRABAJO,
          recipientType: RecipientType.EMPLOYEE,
          recipientId: 'emp-uuid',
          recipientIdentifier: 'V-12345678',
          recipientName: 'Juan Pérez',
          status: DocumentStatus.VALID,
          issuedByName: 'Dirección del Plantel',
          issuedAt: new Date('2026-10-20T10:00:00.000Z'),
          metadata: { period: '2026-10' },
        }),
      );

      const result = await service.verifyDocument(MOCK_TOKEN);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe(DocumentStatus.VALID);
      expect(result.message).toContain('auténtico y verificado');
      expect(result.document?.id).toBe(MOCK_DOC_ID);
      expect(result.document?.documentType).toBe(DocumentType.CONSTANCIA_TRABAJO);
      expect(result.document?.metadata?.period).toBe('2026-10');
    });
  });
});
