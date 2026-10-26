import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityService, LogActivityInput } from './activity-service.service';
import { Activity } from '../entities/activity.entity';
import { Employee } from '../entities/employee.entity';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createMockActivity } from '../../../test/fixtures/activity.fixture';
import { MockType } from '../../../test/fixtures/user.fixture';

describe('ActivityService', () => {
  let service: ActivityService;
  let mockActivityRepo: MockType<Repository<Activity>>;
  let mockEmployeeRepo: MockType<Repository<Employee>>;

  const MOCK_USER_ID = 'user-uuid-123';

  beforeEach(async () => {
    mockActivityRepo = {
      create: jest.fn((dto) => createMockActivity(dto)),
      save: jest.fn((entity) => Promise.resolve(createMockActivity(entity))),
    };

    mockEmployeeRepo = {
      findOneBy: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: getRepositoryToken(Activity), useValue: mockActivityRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe('log', () => {
    const input: LogActivityInput = {
      tipo: 'Actualización de Horario',
      descripcion: 'Turno de la mañana modificado',
      detalle: 'Lunes 7:30 a 12:00',
      destacada: true,
    };

    it('should silently ignore logging if employee is not found for userId', async () => {
      (mockEmployeeRepo.findOneBy as jest.Mock).mockResolvedValue(null);

      await service.log(MOCK_USER_ID, input);

      expect(mockActivityRepo.create).not.toHaveBeenCalled();
      expect(mockActivityRepo.save).not.toHaveBeenCalled();
    });

    it('should create and persist activity when employee is found', async () => {
      const mockEmployee = createMockEmployee({ userId: MOCK_USER_ID });
      (mockEmployeeRepo.findOneBy as jest.Mock).mockResolvedValue(mockEmployee);

      await service.log(MOCK_USER_ID, input);

      expect(mockActivityRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: MOCK_USER_ID,
          tipo: 'Actualización de Horario',
          descripcion: 'Turno de la mañana modificado',
          detalle: 'Lunes 7:30 a 12:00',
          destacada: true,
        }),
      );
      expect(mockActivityRepo.save).toHaveBeenCalled();
    });

    it('should catch repository errors silently to never interrupt main operation', async () => {
      const mockEmployee = createMockEmployee({ userId: MOCK_USER_ID });
      (mockEmployeeRepo.findOneBy as jest.Mock).mockResolvedValue(mockEmployee);
      (mockActivityRepo.save as jest.Mock).mockRejectedValue(new Error('DB Connection Dropped'));

      // Should not throw
      await expect(service.log(MOCK_USER_ID, input)).resolves.not.toThrow();
    });
  });

  describe('logMany', () => {
    it('should iterate over all inputs and log each one', async () => {
      const logSpy = jest.spyOn(service, 'log').mockResolvedValue(undefined);

      const inputs: LogActivityInput[] = [
        { tipo: 'A', descripcion: 'Desc A', detalle: 'Det A' },
        { tipo: 'B', descripcion: 'Desc B', detalle: 'Det B' },
      ];

      await service.logMany(MOCK_USER_ID, inputs);

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(MOCK_USER_ID, inputs[0]);
      expect(logSpy).toHaveBeenCalledWith(MOCK_USER_ID, inputs[1]);
    });
  });
});
