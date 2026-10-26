import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EmpleadosService } from '../empleados.service';
import { Employee } from '../entities/employee.entity';
import { Group } from '../entities/group.entity';
import { Schedule } from '../entities/schedule.entity';
import { ActivityService } from '../activity-service/activity-service.service';
import { UpdateEmpleadoDto } from '../dto/update-empleado.dto';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createMockSchedule } from '../../../test/fixtures/schedule.fixture';
import { createValidDto } from '../../../test/fixtures/dto-factory.helper';
import { MockType } from '../../../test/fixtures/user.fixture';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

describe('EmpleadosService - Update Operations (update & updateByUserId)', () => {
  let service: EmpleadosService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockDataSource: MockType<DataSource>;
  let mockActivityService: MockType<ActivityService>;
  let mockEntityManager: MockType<EntityManager>;

  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockEntityManager = {
      create: jest.fn((entityClass, dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockDataSource = {
      transaction: jest.fn((cb: (em: unknown) => unknown) => cb(mockEntityManager)),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(createMockEmployee(e))),
    };

    mockActivityService = {
      logMany: jest.fn().mockResolvedValue(undefined),
    };

    const module = await createEmpleadosServiceTestModule({
      employeeRepo: mockEmployeeRepo,
      dataSource: mockDataSource,
      activityService: mockActivityService,
    });
    service = module.service;
  });

  describe('updateByUserId', () => {
    it('should throw NotFoundException if employee is not found for userId', async () => {
      (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateByUserId(MOCK_USER_ID, { position: 'Coordinador' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateByUserId(MOCK_USER_ID, { position: 'Coordinador' }),
      ).rejects.toThrow('No tienes datos de empleado registrados');
    });

    it('should find employee by userId and delegate to update with employee.userId', async () => {
      const existingEmployee = createMockEmployee({ userId: MOCK_USER_ID });
      (mockEmployeeRepo.findOne as jest.Mock).mockResolvedValue(existingEmployee);

      const updateSpy = jest.spyOn(service, 'update').mockResolvedValue(existingEmployee);

      const dto = createValidDto(UpdateEmpleadoDto, { position: 'Coordinador General' });
      const result = await service.updateByUserId(MOCK_USER_ID, dto);

      expect(updateSpy).toHaveBeenCalledWith(MOCK_USER_ID, dto);
      expect(result).toBe(existingEmployee);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if employee is not found by id', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('No hay empleado con este ID'));

      await expect(
        service.update('non-existent-id', createValidDto(UpdateEmpleadoDto, { position: 'Docente' })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update scalar fields inside transaction and trigger activity logging', async () => {
      const existingEmployee = Object.assign(
        createMockEmployee({
          userId: MOCK_USER_ID,
          position: 'Docente Auxiliar',
          hours_per_day: 4,
          work_schedule: 'Medio Tiempo',
        }),
        { digitalIdToken: 'SS-EDID:v1:mock.token' },
      );

      jest.spyOn(service, 'findOne').mockResolvedValue(existingEmployee);

      const updatedEmployee = {
        ...existingEmployee,
        position: 'Profesor Titular',
        hours_per_day: 8,
      };
      (mockEntityManager.findOne as jest.Mock).mockResolvedValue(updatedEmployee);

      const result = await service.update(
        MOCK_USER_ID,
        createValidDto(UpdateEmpleadoDto, {
          position: 'Profesor Titular',
          hours_per_day: 8,
        }),
      );

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Employee,
        { userId: MOCK_USER_ID },
        expect.objectContaining({
          position: 'Profesor Titular',
          hours_per_day: 8,
        }),
      );
      expect(mockActivityService.logMany).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.arrayContaining([
          expect.objectContaining({ tipo: 'Actualización Laboral' }),
        ]),
      );
      expect(result).toBe(updatedEmployee);
    });

    it('should delete orphaned schedules when omitted from incoming schedules array', async () => {
      const existingEmployee = Object.assign(
        createMockEmployee({ userId: MOCK_USER_ID }),
        { digitalIdToken: 'SS-EDID:v1:mock.token' },
      );
      jest.spyOn(service, 'findOne').mockResolvedValue(existingEmployee);

      const oldSchedule = createMockSchedule({ id: 'old-schedule-id', nombre: 'Física', aula: 'Laboratorio' });
      (mockEntityManager.find as jest.Mock).mockResolvedValueOnce([oldSchedule]); // existing schedules
      (mockEntityManager.findOne as jest.Mock).mockResolvedValue(existingEmployee);

      await service.update(
        MOCK_USER_ID,
        createValidDto(UpdateEmpleadoDto, {
          schedules: [], // All schedules removed
        }),
      );

      expect(mockEntityManager.delete).toHaveBeenCalledWith(
        Group,
        expect.objectContaining({ scheduleId: expect.anything() }),
      );
      expect(mockEntityManager.delete).toHaveBeenCalledWith(
        Schedule,
        expect.objectContaining({ id: expect.anything() }),
      );
      expect(mockActivityService.logMany).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.arrayContaining([
          expect.objectContaining({ tipo: 'Materia Eliminada', descripcion: 'Física' }),
        ]),
      );
    });
  });
});
