import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EmpleadosService } from '../empleados.service';
import { Employee } from '../entities/employee.entity';
import { User } from '../../auth/entities/auth.entity';
import { CryptoService } from '../../crypto/crypto.service';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createMockUser, MockType } from '../../../test/fixtures/user.fixture';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

describe('EmpleadosService - Detail & Digital Carnet Token (Test 8)', () => {
  let service: EmpleadosService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockUserRepo: MockType<Repository<User>>;
  let mockCryptoService: MockType<CryptoService>;

  const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const MOCK_DIGITAL_TOKEN = 'SS-EDID:v1:iv.tag.cipher';

  beforeEach(async () => {
    mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    mockUserRepo = {
      findOneBy: jest.fn(),
    };

    mockCryptoService = {
      encryptPayload: jest.fn().mockReturnValue(MOCK_DIGITAL_TOKEN),
    };

    const module = await createEmpleadosServiceTestModule({
      employeeRepo: mockEmployeeRepo,
      userRepo: mockUserRepo,
      cryptoService: mockCryptoService,
    });
    service = module.service;
  });

  it('should find employee by UUID and inject signed digitalIdToken', async () => {
    const mockEmployee = createMockEmployee({
      userId: MOCK_UUID,
      position: 'Profesor de Química',
      user: createMockUser({
        id: MOCK_UUID,
        cedula: 'V-18765432',
        fullName: 'Mario Silva',
      }),
    });

    (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);

    const result = await service.findOne(MOCK_UUID);

    expect(mockCryptoService.encryptPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: MOCK_UUID,
        userId: MOCK_UUID,
        cedula: 'V-18765432',
        fullName: 'Mario Silva',
        cargo: 'Profesor de Química',
      }),
      'EDID',
    );
    expect(result.digitalIdToken).toBe(MOCK_DIGITAL_TOKEN);
  });

  it('should find employee by cedula when ID is not a UUID', async () => {
    const mockUser = createMockUser({
      id: MOCK_UUID,
      cedula: 'V18765432',
      fullName: 'Mario Silva',
    });
    const mockEmployee = createMockEmployee({
      userId: MOCK_UUID,
      position: 'Docente',
      user: mockUser,
    });

    (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(mockUser);
    (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);

    const result = await service.findOne('18765432');

    expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({
      cedula: 'V18765432',
    });
    expect(result.userId).toBe(MOCK_UUID);
    expect(result.digitalIdToken).toBe(MOCK_DIGITAL_TOKEN);
  });

  it('should throw BadRequestException if employee is not found', async () => {
    (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(null);
    (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('non-existent')).rejects.toThrow(BadRequestException);
  });
});
