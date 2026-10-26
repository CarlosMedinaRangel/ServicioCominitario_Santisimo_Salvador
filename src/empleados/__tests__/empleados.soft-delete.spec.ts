import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EmpleadosService } from '../empleados.service';
import { Employee } from '../entities/employee.entity';
import { User } from '../../auth/entities/auth.entity';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createMockUser, MockType } from '../../../test/fixtures/user.fixture';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

describe('EmpleadosService - Soft Delete & Status Management (Test 7 & 10)', () => {
  let service: EmpleadosService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockUserRepo: MockType<Repository<User>>;

  const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockEmployeeRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockUserRepo = {
      findOneBy: jest.fn(),
      save: jest.fn((u) => Promise.resolve(createMockUser(u))),
    };

    const mockCryptoService = {
      encryptPayload: jest.fn().mockReturnValue('SS-EDID:v1:mock.token'),
    };

    const module = await createEmpleadosServiceTestModule({
      employeeRepo: mockEmployeeRepo,
      userRepo: mockUserRepo,
      cryptoService: mockCryptoService,
    });
    service = module.service;
  });

  describe('findAll - Soft Delete Invariant', () => {
    it('should return only active employees by default (user.isActive === true)', async () => {
      const activeEmployees = [
        createMockEmployee({ user: createMockUser({ isActive: true }) }),
      ];

      (mockEmployeeRepo.find as jest.Mock).mockResolvedValue(activeEmployees);

      const result = await service.findAll();

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { user: { isActive: true } },
        relations: { user: true },
      });
      expect(result).toBe(activeEmployees);
    });

    it('should return all employees including soft-deleted ones when status="all"', async () => {
      const allEmployees = [
        createMockEmployee({ user: createMockUser({ isActive: true }) }),
        createMockEmployee({ user: createMockUser({ isActive: false }) }),
      ];

      (mockEmployeeRepo.find as jest.Mock).mockResolvedValue(allEmployees);

      const result = await service.findAll('all');

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: {},
        relations: { user: true },
      });
      expect(result).toHaveLength(2);
    });

    it('should return only inactive employees when status="inactive"', async () => {
      const inactiveEmployees = [
        createMockEmployee({ user: createMockUser({ isActive: false }) }),
      ];

      (mockEmployeeRepo.find as jest.Mock).mockResolvedValue(inactiveEmployees);

      const result = await service.findAll('inactive');

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { user: { isActive: false } },
        relations: { user: true },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('remove & toggleStatus - Physical Persistence Preserved', () => {
    it('should soft-delete employee by setting user.isActive = false without deleting rows', async () => {
      const mockEmployee = createMockEmployee({
        userId: MOCK_UUID,
        user: createMockUser({ id: MOCK_UUID, isActive: true }),
      });
      const mockUser = createMockUser({ id: MOCK_UUID, isActive: true });

      (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);
      (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.remove(MOCK_UUID);

      expect(mockUser.isActive).toBe(false);
      expect(mockUserRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result?.isActive).toBe(false);
      expect(result?.message).toContain('desactivado exitosamente (eliminación lógica)');
    });

    it('should toggle employee active status and persist change', async () => {
      const mockEmployee = createMockEmployee({
        userId: MOCK_UUID,
        user: createMockUser({ id: MOCK_UUID, isActive: false }),
      });
      const mockUser = createMockUser({ id: MOCK_UUID, isActive: false });

      (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);
      (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.toggleStatus(MOCK_UUID);

      expect(mockUser.isActive).toBe(true);
      expect(mockUserRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result?.isActive).toBe(true);
      expect(result?.message).toContain('activado exitosamente');
    });

    it('should throw NotFoundException if user is not found during remove', async () => {
      const mockEmployee = createMockEmployee({ userId: MOCK_UUID });

      (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(mockEmployee);
      (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(MOCK_UUID)).rejects.toThrow(NotFoundException);
    });
  });
});
