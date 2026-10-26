import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EmpleadosService } from '../empleados.service';
import { Employee } from '../entities/employee.entity';
import { User } from '../../auth/entities/auth.entity';
import { CreateEmpleadoDto } from '../dto/create-empleado.dto';
import { createMockUser, MockType } from '../../../test/fixtures/user.fixture';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createValidDto } from '../../../test/fixtures/dto-factory.helper';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

describe('EmpleadosService - Manual Creation (create)', () => {
  let service: EmpleadosService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockUserRepo: MockType<Repository<User>>;
  let mockDataSource: MockType<DataSource>;
  let mockEntityManager: MockType<EntityManager>;

  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    mockEntityManager = {
      create: jest.fn((entityClass, dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn((cb: (em: unknown) => unknown) => cb(mockEntityManager)),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    mockUserRepo = {
      findOneBy: jest.fn(),
    };

    const module = await createEmpleadosServiceTestModule({
      employeeRepo: mockEmployeeRepo,
      userRepo: mockUserRepo,
      dataSource: mockDataSource,
    });
    service = module.service;
  });

  const createDto = createValidDto(CreateEmpleadoDto, {
    userId: MOCK_USER_ID,
    position: 'Docente de Ciencias',
    start_date: '2023-01-15',
    work_time: '07:30',
    hours_per_day: 6,
    work_schedule: 'Lunes a Viernes',
    schedules: [
      {
        nombre: 'Ciencias Naturales',
        aula: 'Lab 101',
        dias: ['Lunes'],
        horaInicio: '07:30',
        horaFin: '12:00',
        icono: 'flask',
        groups: [
          { nombre: '1er Año A', cantidadEstudiantes: 28 },
        ],
      },
    ],
  });

  it('should throw BadRequestException if user with given userId does not exist', async () => {
    (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    await expect(service.create(createDto)).rejects.toThrow(
      `No existe un usuario con id ${MOCK_USER_ID}`,
    );
  });

  it('should create employee, schedules, and groups inside a transaction and return populated record', async () => {
    const mockUser = createMockUser({ id: MOCK_USER_ID });
    (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(mockUser);

    const expectedEmployee = createMockEmployee({
      userId: MOCK_USER_ID,
      position: 'Docente de Ciencias',
    });
    (mockEntityManager.findOne as jest.Mock).mockResolvedValue(expectedEmployee);

    const result = await service.create(createDto);

    expect(mockDataSource.transaction).toHaveBeenCalled();
    expect(mockEntityManager.create).toHaveBeenCalledWith(
      Employee,
      expect.objectContaining({
        userId: MOCK_USER_ID,
        position: 'Docente de Ciencias',
        hours_per_day: 6,
      }),
    );
    expect(mockEntityManager.save).toHaveBeenCalled();
    expect(result).toBe(expectedEmployee);
  });
});
