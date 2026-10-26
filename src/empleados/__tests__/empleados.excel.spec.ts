import { Readable } from 'stream';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { EmpleadosService } from '../empleados.service';
import { Employee } from '../entities/employee.entity';
import { User } from '../../auth/entities/auth.entity';
import { createMockUser, MockType } from '../../../test/fixtures/user.fixture';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createEmpleadosServiceTestModule } from '../../../test/fixtures/empleados-service.factory';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_test_password'),
}));

function createExcelFileBuffer(rows: unknown[][]): Express.Multer.File {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return {
    buffer,
    fieldname: 'file',
    originalname: 'empleados_test.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    destination: '',
    filename: 'empleados_test.xlsx',
    path: '',
    stream: Readable.from(buffer),
  };
}

describe('EmpleadosService - Excel Bulk Upload (uploadFile)', () => {
  let service: EmpleadosService;
  let mockEmployeeRepo: MockType<Repository<Employee>>;
  let mockUserRepo: MockType<Repository<User>>;

  const mapping = {
    cedula: 0,
    fullName: 1,
    email: 2,
    position: 3,
    start_date: 4,
    hours_per_day: 5,
  };

  beforeEach(async () => {
    mockEmployeeRepo = {
      findOneBy: jest.fn(),
      create: jest.fn((dto) => createMockEmployee(dto)),
      save: jest.fn((entity) => Promise.resolve(createMockEmployee(entity))),
    };

    mockUserRepo = {
      findOneBy: jest.fn(),
      create: jest.fn((dto) => createMockUser(dto)),
      save: jest.fn((entity) => Promise.resolve(createMockUser(entity))),
    };

    const module = await createEmpleadosServiceTestModule({
      employeeRepo: mockEmployeeRepo,
      userRepo: mockUserRepo,
    });
    service = module.service;
  });

  it('should record an error if a row has neither email nor cedula', async () => {
    const file = createExcelFileBuffer([
      ['Cédula', 'Nombre Completo', 'Email', 'Cargo', 'Fecha Ingreso', 'Horas'],
      ['', 'Juan Sin Identificacion', '', 'Docente', '2023-01-15', 8],
    ]);

    const result = await service.uploadFile(file, mapping);

    expect(result.success).toBe(false);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      row: 2,
      field: 'email/cedula',
      message: 'Email o cédula es requerido',
    });
  });

  it('should create new user and new employee when neither exists in database', async () => {
    (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(null);
    (mockEmployeeRepo.findOneBy as jest.Mock).mockResolvedValue(null);

    const file = createExcelFileBuffer([
      ['Cédula', 'Nombre Completo', 'Email', 'Cargo', 'Fecha Ingreso', 'Horas'],
      ['V-20111222', 'Elena Rostova', 'elena@santisimo.edu', 'Coordinadora', '2022-09-01', 8],
    ]);

    const result = await service.uploadFile(file, mapping);

    expect(result.success).toBe(true);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);

    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'elena@santisimo.edu',
        fullName: 'Elena Rostova',
        password: 'hashed_test_password',
      }),
    );
    expect(mockUserRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cedula: 'V-20111222',
      }),
    );
    expect(mockEmployeeRepo.create).toHaveBeenCalled();
    expect(mockEmployeeRepo.save).toHaveBeenCalled();
  });

  it('should update existing user and employee when already present', async () => {
    const existingUser = createMockUser({
      id: 'existing-user-uuid',
      cedula: 'V-15000000',
      fullName: 'Antiguo Nombre',
      email: 'antiguo@santisimo.edu',
    });
    const existingEmployee = createMockEmployee({
      userId: existingUser.id,
      position: 'Docente Auxiliar',
    });

    (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(existingUser);
    (mockEmployeeRepo.findOneBy as jest.Mock).mockResolvedValue(existingEmployee);

    const file = createExcelFileBuffer([
      ['Cédula', 'Nombre Completo', 'Email', 'Cargo', 'Fecha Ingreso', 'Horas'],
      ['15.000.000', 'Nuevo Nombre Actualizado', 'antiguo@santisimo.edu', 'Profesor Titular', '2020-01-01', 6],
    ]);

    const result = await service.uploadFile(file, mapping);

    expect(result.success).toBe(true);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(0);

    expect(mockUserRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Nuevo Nombre Actualizado',
        cedula: 'V15000000',
      }),
    );
    expect(mockEmployeeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        position: 'Profesor Titular',
        hours_per_day: 6,
      }),
    );
  });

  it('should catch database errors during row processing and log them to error accumulator without halting next rows', async () => {
    (mockUserRepo.findOneBy as jest.Mock).mockRejectedValueOnce(new Error('DB Connection Timeout'));

    const file = createExcelFileBuffer([
      ['Cédula', 'Nombre Completo', 'Email', 'Cargo', 'Fecha Ingreso', 'Horas'],
      ['V-99999999', 'Fallo Fila', 'fallo@santisimo.edu', 'Obrero', '2021-01-01', 8],
    ]);

    const result = await service.uploadFile(file, mapping);

    expect(result.success).toBe(false);
    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].message).toContain('DB Connection Timeout');
  });
});
