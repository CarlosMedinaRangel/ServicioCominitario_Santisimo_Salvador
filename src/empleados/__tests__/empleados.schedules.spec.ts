import { Repository } from 'typeorm';
import { EmpleadosService } from '../empleados.service';
import { Schedule } from '../entities/schedule.entity';
import { Group } from '../entities/group.entity';
import { Activity } from '../entities/activity.entity';
import { createMockSchedule, createMockGroup } from '../../../test/fixtures/schedule.fixture';
import { createMockActivity } from '../../../test/fixtures/activity.fixture';
import { MockType } from '../../../test/fixtures/user.fixture';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

describe('EmpleadosService - Schedules, Groups & Activities (Test 9)', () => {
  let service: EmpleadosService;
  let mockScheduleRepo: MockType<Repository<Schedule>>;
  let mockGroupRepo: MockType<Repository<Group>>;
  let mockActivityRepo: MockType<Repository<Activity>>;

  const MOCK_UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockScheduleRepo = {
      find: jest.fn(),
    };

    mockGroupRepo = {
      find: jest.fn(),
    };

    mockActivityRepo = {
      find: jest.fn(),
    };

    const module = await createEmpleadosServiceTestModule({
      scheduleRepo: mockScheduleRepo,
      groupRepo: mockGroupRepo,
      activityRepo: mockActivityRepo,
    });
    service = module.service;
  });

  it('should return schedules ordered by dias and horaInicio', async () => {
    const mockSchedules = [
      createMockSchedule({
        employeeId: MOCK_UUID,
        dias: ['Lunes'],
        horaInicio: '08:00',
        horaFin: '10:00',
      }),
    ];
    (mockScheduleRepo.find as jest.Mock).mockResolvedValue(mockSchedules);

    const result = await service.findSchedules(MOCK_UUID);

    expect(mockScheduleRepo.find).toHaveBeenCalledWith({
      where: { employeeId: MOCK_UUID },
      order: { dias: 'ASC', horaInicio: 'ASC' },
    });
    expect(result).toBe(mockSchedules);
  });

  it('should return groups for employee', async () => {
    const mockGroups = [
      createMockGroup({ employeeId: MOCK_UUID, nombre: '1er Año A' }),
    ];
    (mockGroupRepo.find as jest.Mock).mockResolvedValue(mockGroups);

    const result = await service.findGroups(MOCK_UUID);

    expect(mockGroupRepo.find).toHaveBeenCalledWith({
      where: { employeeId: MOCK_UUID },
    });
    expect(result).toBe(mockGroups);
  });

  it('should return activities ordered by timestamp DESC', async () => {
    const mockActivities = [
      createMockActivity({ employeeId: MOCK_UUID, tipo: 'Constancia Generada' }),
    ];
    (mockActivityRepo.find as jest.Mock).mockResolvedValue(mockActivities);

    const result = await service.findActivities(MOCK_UUID);

    expect(mockActivityRepo.find).toHaveBeenCalledWith({
      where: { employeeId: MOCK_UUID },
      order: { timestamp: 'DESC' },
    });
    expect(result).toBe(mockActivities);
  });
});
