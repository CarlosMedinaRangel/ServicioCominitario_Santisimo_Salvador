import { Repository } from 'typeorm';
import { DocumentsService, IssueDocumentParams } from '../documents.service';
import {
  DocumentVerification,
  DocumentType,
  RecipientType,
  DocumentStatus,
} from '../entities/document-verification.entity';
import { User } from '../../auth/entities/auth.entity';
import { CryptoService } from '../../crypto/crypto.service';
import { QrGeneratorService } from '../../crypto/qr-generator.service';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';
import { MockType } from '../../../test/fixtures/user.fixture';
import { createDocumentsServiceTestModule } from '../../../test/fixtures/documents-service.factory';

describe('DocumentsService - Document Issuance (issueDocument)', () => {
  let service: DocumentsService;
  let mockDocRepo: MockType<Repository<DocumentVerification>>;
  let mockUserRepo: MockType<Repository<User>>;
  let mockCryptoService: MockType<CryptoService>;
  let mockQrGeneratorService: MockType<QrGeneratorService>;

  const MOCK_TOKEN = 'SS-DOC:v1:iv1234567890.authTag1234567890.cipher123456';
  const MOCK_QR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';

  beforeEach(async () => {
    mockDocRepo = {
      create: jest.fn((dto) => createMockDocumentVerification(dto)),
      save: jest.fn((entity) => Promise.resolve(createMockDocumentVerification(entity))),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    mockCryptoService = {
      encryptPayload: jest.fn().mockReturnValue(MOCK_TOKEN),
    };

    mockQrGeneratorService = {
      generateDataUrl: jest.fn().mockResolvedValue(MOCK_QR_DATA_URL),
    };

    const module = await createDocumentsServiceTestModule({
      docVerificationRepo: mockDocRepo,
      userRepo: mockUserRepo,
      cryptoService: mockCryptoService,
      qrGeneratorService: mockQrGeneratorService,
    });
    service = module.service;
  });

  it('should encrypt payload with DOC subtype, generate QR code, and persist record with status VALID', async () => {
    const params: IssueDocumentParams = {
      documentType: DocumentType.CONSTANCIA_TRABAJO,
      recipientType: RecipientType.EMPLOYEE,
      recipientId: 'emp-uuid-123',
      recipientIdentifier: 'V-12345678',
      recipientName: 'Juan Pérez',
      issuedByUserId: 'admin-uuid-456',
      issuedByName: 'Director Carlos Medina',
      metadata: { cargo: 'Docente de Aula' },
    };

    const result = await service.issueDocument(params);

    // Verify crypto encryption called with 'DOC' subtype
    expect(mockCryptoService.encryptPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        recipientType: RecipientType.EMPLOYEE,
        recipientIdentifier: 'V-12345678',
        issuedByUserId: 'admin-uuid-456',
      }),
      'DOC',
    );

    // Verify QR generation
    expect(mockQrGeneratorService.generateDataUrl).toHaveBeenCalledWith(MOCK_TOKEN);

    // Verify repository persistence
    expect(mockDocRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        recipientType: RecipientType.EMPLOYEE,
        recipientId: 'emp-uuid-123',
        recipientIdentifier: 'V-12345678',
        recipientName: 'Juan Pérez',
        verificationCode: MOCK_TOKEN,
        status: DocumentStatus.VALID,
      }),
    );
    expect(mockDocRepo.save).toHaveBeenCalled();

    // Verify return structure
    expect(result.verificationCode).toBe(MOCK_TOKEN);
    expect(result.qrDataUrl).toBe(MOCK_QR_DATA_URL);
    expect(result.record).toBeDefined();
    expect(result.record.status).toBe(DocumentStatus.VALID);
  });
});
