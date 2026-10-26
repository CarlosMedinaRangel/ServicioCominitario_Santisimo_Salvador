import { BadRequestException } from '@nestjs/common';
import { EmpleadosController } from '../empleados.controller';
import { EmpleadosService } from '../empleados.service';
import { CreateEmpleadoDto } from '../dto/create-empleado.dto';
import { UpdateEmpleadoDto } from '../dto/update-empleado.dto';
import { createMockUser } from '../../../test/fixtures/user.fixture';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createValidDto } from '../../../test/fixtures/dto-factory.helper';

describe('EmpleadosController', () => {
  let controller: EmpleadosController;
  let mockEmpleadosService: jest.Mocked<Partial<EmpleadosService>>;

  beforeEach(() => {
    mockEmpleadosService = {
      create: jest.fn(),
      uploadFile: jest.fn(),
      updateByUserId: jest.fn(),
      getCounts: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findSchedules: jest.fn(),
      findGroups: jest.fn(),
      findActivities: jest.fn(),
      seedActivities: jest.fn(),
      update: jest.fn(),
      toggleStatus: jest.fn(),
      remove: jest.fn(),
    };

    controller = new EmpleadosController(mockEmpleadosService as EmpleadosService);
  });

  describe('create', () => {
    it('should forward createEmpleadoDto to empleadosService.create', async () => {
      const dto = createValidDto(CreateEmpleadoDto, {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        position: 'Docente de Matemáticas',
        start_date: '2024-01-15',
        work_time: '08:00',
        hours_per_day: 8,
        work_schedule: 'Lunes a Viernes',
      });

      const mockCreated = createMockEmployee({ userId: '550e8400-e29b-41d4-a716-446655440000', position: 'Docente de Matemáticas' });
      (mockEmpleadosService.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await controller.create(dto);

      expect(mockEmpleadosService.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockCreated);
    });
  });

  describe('upload (Bulk Excel Upload)', () => {
    const mockFile = {
      buffer: Buffer.from('test-excel'),
      originalname: 'nomina.xlsx',
    } as Express.Multer.File;

    it('should parse stringified JSON mapping and pass to empleadosService.uploadFile', async () => {
      const mappingRaw = JSON.stringify({ cedula: 0, fullName: 1, email: 2 });
      const mockUploadResult = {
        success: true,
        created: 5,
        updated: 2,
        errors: [],
      };
      (mockEmpleadosService.uploadFile as jest.Mock).mockResolvedValue(mockUploadResult);

      const result = await controller.upload(mockFile, mappingRaw);

      expect(mockEmpleadosService.uploadFile).toHaveBeenCalledWith(mockFile, {
        cedula: 0,
        fullName: 1,
        email: 2,
      });
      expect(result).toBe(mockUploadResult);
    });

    it('should throw BadRequestException if mapping string is invalid JSON', async () => {
      const invalidJson = '{ not-valid-json';

      await expect(controller.upload(mockFile, invalidJson)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(mockFile, invalidJson)).rejects.toThrow(
        'El campo "mapping" debe ser un JSON válido',
      );
      expect(mockEmpleadosService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('getCounts', () => {
    it('should delegate to empleadosService.getCounts', async () => {
      const mockCounts = { total: 50, active: 45, inactive: 5 };
      (mockEmpleadosService.getCounts as jest.Mock).mockResolvedValue(mockCounts);

      const result = await controller.getCounts();

      expect(mockEmpleadosService.getCounts).toHaveBeenCalled();
      expect(result).toBe(mockCounts);
    });
  });

  describe('findAll', () => {
    it('should pass status, page, and limit query parameters to empleadosService.findAll', async () => {
      const mockList = [createMockEmployee({ userId: 'emp-1' })];
      (mockEmpleadosService.findAll as jest.Mock).mockResolvedValue(mockList);

      const result = await controller.findAll('active', 1, 20);

      expect(mockEmpleadosService.findAll).toHaveBeenCalledWith('active', 1, 20);
      expect(result).toBe(mockList);
    });
  });

  describe('findOne', () => {
    it('should pass employee id to empleadosService.findOne', async () => {
      const mockEmp = createMockEmployee({ userId: 'emp-123', position: 'Docente' });
      (mockEmpleadosService.findOne as jest.Mock).mockResolvedValue(mockEmp);

      const result = await controller.findOne('emp-123');

      expect(mockEmpleadosService.findOne).toHaveBeenCalledWith('emp-123');
      expect(result).toBe(mockEmp);
    });
  });

  describe('update & updateMyEmployee', () => {
    const updateDto = createValidDto(UpdateEmpleadoDto, { position: 'Coordinador General' });

    it('should update employee by admin with id parameter', async () => {
      const mockUpdated = createMockEmployee({ userId: 'emp-123', position: 'Coordinador General' });
      (mockEmpleadosService.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await controller.update('emp-123', updateDto);

      expect(mockEmpleadosService.update).toHaveBeenCalledWith('emp-123', updateDto);
      expect(result).toBe(mockUpdated);
    });

    it('should update own employee data with authenticated user id', async () => {
      const mockUser = createMockUser({ id: 'user-auth-uuid' });
      const mockUpdated = createMockEmployee({ userId: mockUser.id, position: 'Coordinador General' });
      (mockEmpleadosService.updateByUserId as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await controller.updateMyEmployee(mockUser, updateDto);

      expect(mockEmpleadosService.updateByUserId).toHaveBeenCalledWith('user-auth-uuid', updateDto);
      expect(result).toBe(mockUpdated);
    });
  });

  describe('toggleStatus & remove (Soft Delete)', () => {
    it('should toggle employee status via toggleStatus', async () => {
      const mockToggle = { userId: 'emp-123', isActive: false, message: 'desactivado' };
      (mockEmpleadosService.toggleStatus as jest.Mock).mockResolvedValue(mockToggle);

      const result = await controller.toggleStatus('emp-123');

      expect(mockEmpleadosService.toggleStatus).toHaveBeenCalledWith('emp-123');
      expect(result).toBe(mockToggle);
    });

    it('should perform soft-delete via remove', async () => {
      const mockRemoved = { userId: 'emp-123', isActive: false, message: 'desactivado exitosamente' };
      (mockEmpleadosService.remove as jest.Mock).mockResolvedValue(mockRemoved);

      const result = await controller.remove('emp-123');

      expect(mockEmpleadosService.remove).toHaveBeenCalledWith('emp-123');
      expect(result).toBe(mockRemoved);
    });
  });

  describe('schedules, groups & activities sub-routes', () => {
    it('should call findSchedules', async () => {
      (mockEmpleadosService.findSchedules as jest.Mock).mockResolvedValue([]);
      await controller.findSchedules('emp-1');
      expect(mockEmpleadosService.findSchedules).toHaveBeenCalledWith('emp-1');
    });

    it('should call findGroups', async () => {
      (mockEmpleadosService.findGroups as jest.Mock).mockResolvedValue([]);
      await controller.findGroups('emp-1');
      expect(mockEmpleadosService.findGroups).toHaveBeenCalledWith('emp-1');
    });

    it('should call findActivities', async () => {
      (mockEmpleadosService.findActivities as jest.Mock).mockResolvedValue([]);
      await controller.findActivities('emp-1');
      expect(mockEmpleadosService.findActivities).toHaveBeenCalledWith('emp-1');
    });

    it('should call seedActivities with month parameter or default to current month', async () => {
      (mockEmpleadosService.seedActivities as jest.Mock).mockResolvedValue([]);
      await controller.seedActivities('emp-1', '2026-08');
      expect(mockEmpleadosService.seedActivities).toHaveBeenCalledWith('emp-1', '2026-08');
    });
  });
});
