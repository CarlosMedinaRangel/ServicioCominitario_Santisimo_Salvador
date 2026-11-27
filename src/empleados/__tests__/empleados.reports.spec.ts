import { Repository } from 'typeorm';
import { ConstanciaService } from '../services/constancia.service';
import { Employee } from '../entities/employee.entity';
import { PrinterService } from '../../printer/printer.service';
import { DocumentsService } from '../../documents/documents.service';
import { CryptoService } from '../../crypto/crypto.service';
import { ActivityService } from '../activity-service/activity-service.service';
import { DocumentStatus, DocumentType, RecipientType } from '../../documents/entities/document-verification.entity';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createMockUser, MockType } from '../../../test/fixtures/user.fixture';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

describe('EmpleadosService - Constancias & Cryptographic QR PDF (Test 11 & 12)', () => {
  let service: ConstanciaService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockPrinterService: MockType<PrinterService>;
  let mockDocumentsService: MockType<DocumentsService>;
  let mockActivityService: MockType<ActivityService>;
  let mockCryptoService: MockType<CryptoService>;

  const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockEmployeeRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    mockPrinterService = {
      createPdf: jest.fn().mockResolvedValue(Buffer.from('MOCK_PDF_BUFFER')),
    };

    mockDocumentsService = {
      issueDocument: jest.fn().mockResolvedValue({
        record: createMockDocumentVerification({
          id: 'doc-uuid-123',
          documentType: DocumentType.CONSTANCIA_TRABAJO,
          recipientType: RecipientType.EMPLOYEE,
          recipientId: MOCK_UUID,
          recipientIdentifier: 'V-18765432',
          recipientName: 'Mario Silva',
          status: DocumentStatus.VALID,
        }),
        verificationCode: 'SS-DOC:v1:mock.token',
        qrDataUrl: 'data:image/png;base64,mockQr',
      }),
      findValidByRecipientAndPeriod: jest.fn().mockResolvedValue(null),
      getQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mockQr'),
    };

    mockCryptoService = {
      encryptPayload: jest.fn().mockReturnValue('SS-EDID:v1:mock'),
      decryptPayload: jest.fn().mockReturnValue({
        uuid: 'doc-uuid-123',
        issuedAt: new Date().toISOString(),
      }),
    };

    mockActivityService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module = await createEmpleadosServiceTestModule({
      employeeRepo: mockEmployeeRepo,
      printerService: mockPrinterService,
      documentsService: mockDocumentsService,
      cryptoService: mockCryptoService,
      activityService: mockActivityService,
    });
    service = module.constanciaService;
  });

  it('should issue cryptographic seal with DocumentsService, generate PDF and log activity', async () => {
    const mockEmployee = createMockEmployee({
      userId: MOCK_UUID,
      position: 'Docente Titular',
      hours_per_day: 8,
      work_schedule: 'Lunes a Viernes 7:00am - 1:00pm',
      start_date: new Date('2020-01-15'),
      user: createMockUser({
        id: MOCK_UUID,
        cedula: 'V-18765432',
        fullName: 'Mario Silva',
      }),
    });

    (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);

    const pdf = await service.ConstanciaEmpleadoByID(MOCK_UUID, {
      employerName: 'Carlos Medina',
      employerPosition: 'Director',
      employerCompany: 'Colegio Santísimo Salvador',
    });

    expect(mockDocumentsService.issueDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        recipientType: RecipientType.EMPLOYEE,
        recipientId: MOCK_UUID,
        recipientIdentifier: 'V-18765432',
        recipientName: 'Mario Silva',
        issuedByName: 'Carlos Medina (Director)',
      }),
    );

    expect(mockPrinterService.createPdf).toHaveBeenCalled();
    expect(mockActivityService.log).toHaveBeenCalledWith(
      MOCK_UUID,
      expect.objectContaining({
        tipo: 'Constancia Generada',
        descripcion: 'Constancia de trabajo',
      }),
    );

    expect(pdf).toBeDefined();
    expect(Buffer.isBuffer(pdf)).toBe(true);
  });

  it('should reuse existing valid document when one already exists for the recipient and period', async () => {
    const mockEmployee = createMockEmployee({
      userId: MOCK_UUID,
      position: 'Docente Titular',
      hours_per_day: 8,
      work_schedule: 'Lunes a Viernes 7:00am - 1:00pm',
      start_date: new Date('2020-01-15'),
      user: createMockUser({
        id: MOCK_UUID,
        cedula: 'V-18765432',
        fullName: 'Mario Silva',
      }),
    });

    (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);
    (mockDocumentsService.findValidByRecipientAndPeriod as jest.Mock).mockResolvedValue(
      createMockDocumentVerification({
        id: 'existing-doc-uuid',
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        recipientId: MOCK_UUID,
        recipientIdentifier: 'V-18765432',
        recipientName: 'Mario Silva',
        status: DocumentStatus.VALID,
        verificationCode: 'SS-DOC:v1:existing.code',
      }),
    );

    const pdf = await service.ConstanciaEmpleadoByID(MOCK_UUID, {
      month: '2026-10',
    });

    // Should NOT issue a new document
    expect(mockDocumentsService.issueDocument).not.toHaveBeenCalled();
    // Should reuse existing QR
    expect(mockDocumentsService.getQrDataUrl).toHaveBeenCalledWith('SS-DOC:v1:existing.code');
    expect(mockPrinterService.createPdf).toHaveBeenCalled();
    expect(pdf).toBeDefined();
  });

  it('should automatically resolve Directora and Rector Administrativo when no manual signer is provided', async () => {
    const mockEmployee = createMockEmployee({
      userId: MOCK_UUID,
      position: 'Docente Titular',
      user: createMockUser({
        id: MOCK_UUID,
        cedula: 'V-18765432',
        fullName: 'Mario Silva',
      }),
    });

    const directora = createMockEmployee({
      userId: 'a0000000-0000-4000-8000-000000000006',
      position: 'Directora',
      user: createMockUser({
        id: 'a0000000-0000-4000-8000-000000000006',
        fullName: 'Prof. Sussy Margarita Morales',
      }),
    });

    const rector = createMockEmployee({
      userId: 'a0000000-0000-4000-8000-000000000007',
      position: 'Rector Administrativo',
      user: createMockUser({
        id: 'a0000000-0000-4000-8000-000000000007',
        fullName: 'Lcdo. Ronald Medina',
      }),
    });

    (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);
    (mockEmployeeRepo.find as jest.Mock).mockResolvedValue([directora, rector]);

    await service.ConstanciaEmpleadoByID(MOCK_UUID);

    expect(mockDocumentsService.issueDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        issuedByName: 'Prof. Sussy Margarita Morales (Directora) / Lcdo. Ronald Medina (Rector Administrativo)',
      }),
    );
  });

  it('should record the authenticated issuer as issuedByUserId/issuedByName while keeping institutional signatories', async () => {
    const mockEmployee = createMockEmployee({
      userId: MOCK_UUID,
      position: 'Docente Titular',
      user: createMockUser({
        id: MOCK_UUID,
        cedula: 'V-18765432',
        fullName: 'Mario Silva',
      }),
    });

    const issuerUser = createMockUser({
      id: 'admin-emitter-uuid',
      fullName: 'Administrador del Sistema',
      roles: ['admin'],
    });

    (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);
    (mockEmployeeRepo.find as jest.Mock).mockResolvedValue([]);

    await service.ConstanciaEmpleadoByID(MOCK_UUID, {
      issuedByUser: issuerUser,
    });

    expect(mockDocumentsService.issueDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        issuedByUserId: 'admin-emitter-uuid',
        issuedByName: 'Administrador del Sistema',
        metadata: expect.objectContaining({
          firmantes: [
            'Prof. Sussy Margarita Morales (Directora)',
            'Lcdo. Ronald Medina (Rector Administrativo)',
          ],
        }),
      }),
    );
  });
});
