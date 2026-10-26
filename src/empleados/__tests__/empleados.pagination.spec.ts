import { Repository } from 'typeorm';
import { EmpleadosService } from '../empleados.service';
import { Employee } from '../entities/employee.entity';
import { User } from '../../auth/entities/auth.entity';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createMockUser, MockType } from '../../../test/fixtures/user.fixture';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

describe('EmpleadosService - Pagination & Counts', () => {
  let service: EmpleadosService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockUserRepo: MockType<Repository<User>>;

  beforeEach(async () => {
    mockEmployeeRepo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
    };

    mockUserRepo = {
      findOneBy: jest.fn(),
    };

    const module = await createEmpleadosServiceTestModule({
      employeeRepo: mockEmployeeRepo,
      userRepo: mockUserRepo,
    });
    service = module.service;
  });

  describe('findAll - Paginated Mode', () => {
    it('should return paginated structure with default page=1 and limit=20', async () => {
      const mockList = [
        createMockEmployee({ user: createMockUser({ isActive: true }) }),
      ];

      (mockEmployeeRepo.findAndCount as jest.Mock).mockResolvedValue([mockList, 35]);

      const result = await service.findAll(undefined, 1, 20);

      expect(mockEmployeeRepo.findAndCount).toHaveBeenCalledWith({
        where: { user: { isActive: true } },
        relations: { user: true },
        skip: 0,
        take: 20,
      });

      expect(result).toEqual({
        data: mockList,
        total: 35,
        page: 1,
        totalPages: 2,
      });
    });

    it('should calculate skip and take correctly for page 3 with limit 10', async () => {
      const mockList = [
        createMockEmployee({ user: createMockUser({ isActive: true }) }),
      ];

      (mockEmployeeRepo.findAndCount as jest.Mock).mockResolvedValue([mockList, 25]);

      const result = await service.findAll('all', 3, 10);

      expect(mockEmployeeRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: { user: true },
        skip: 20,
        take: 10,
      });

      expect(result).toEqual({
        data: mockList,
        total: 25,
        page: 3,
        totalPages: 3,
      });
    });

    it('should filter by inactive employees when status="inactive"', async () => {
      const mockList = [
        createMockEmployee({ user: createMockUser({ isActive: false }) }),
      ];

      (mockEmployeeRepo.findAndCount as jest.Mock).mockResolvedValue([mockList, 8]);

      const result = await service.findAll('inactive', 1, 10);

      expect(mockEmployeeRepo.findAndCount).toHaveBeenCalledWith({
        where: { user: { isActive: false } },
        relations: { user: true },
        skip: 0,
        take: 10,
      });

      expect(result).toEqual({
        data: mockList,
        total: 8,
        page: 1,
        totalPages: 1,
      });
    });
  });

  describe('findAll - Legacy Mode (Backwards Compatibility)', () => {
    it('should return a flat array when page is undefined or null', async () => {
      const mockList = [
        createMockEmployee({ user: createMockUser({ isActive: true }) }),
      ];

      (mockEmployeeRepo.find as jest.Mock).mockResolvedValue(mockList);

      const result = await service.findAll();

      expect(mockEmployeeRepo.find).toHaveBeenCalledWith({
        where: { user: { isActive: true } },
        relations: { user: true },
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toBe(mockList);
    });
  });

  describe('getCounts', () => {
    it('should return total, active, and inactive employee counts', async () => {
      (mockEmployeeRepo.count as jest.Mock).mockImplementation((opts?: any) => {
        if (!opts) return Promise.resolve(50);
        if (opts.where?.user?.isActive === true) return Promise.resolve(42);
        if (opts.where?.user?.isActive === false) return Promise.resolve(8);
        return Promise.resolve(0);
      });

      const counts = await service.getCounts();

      expect(counts).toEqual({
        total: 50,
        active: 42,
        inactive: 8,
      });
    });
  });
});
