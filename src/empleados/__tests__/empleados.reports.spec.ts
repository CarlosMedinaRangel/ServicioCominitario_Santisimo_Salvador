import { Repository } from 'typeorm';
import { EmpleadosService } from '../empleados.service';
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
  let service: EmpleadosService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockPrinterService: MockType<PrinterService>;
  let mockDocumentsService: MockType<DocumentsService>;
  let mockActivityService: MockType<ActivityService>;
  let mockCryptoService: MockType<CryptoService>;

  const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockEmployeeRepo = {
      findOne: jest.fn(),
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
    };

    mockCryptoService = {
      encryptPayload: jest.fn().mockReturnValue('SS-EDID:v1:mock'),
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
    service = module.service;
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
});
