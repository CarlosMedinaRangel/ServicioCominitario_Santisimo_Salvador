import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmpleadosService } from '../../src/empleados/empleados.service';
import { Employee } from '../../src/empleados/entities/employee.entity';
import { Schedule } from '../../src/empleados/entities/schedule.entity';
import { Group } from '../../src/empleados/entities/group.entity';
import { Activity } from '../../src/empleados/entities/activity.entity';
import { User } from '../../src/auth/entities/auth.entity';
import { PrinterService } from '../../src/printer/printer.service';
import { DocumentsService } from '../../src/documents/documents.service';
import { CryptoService } from '../../src/crypto/crypto.service';
import { ActivityService } from '../../src/empleados/activity-service/activity-service.service';
import { MockType } from './user.fixture';

export interface EmpleadosMocks {
  employeeRepo: MockType<Repository<Employee>>;
  scheduleRepo: MockType<Repository<Schedule>>;
  groupRepo: MockType<Repository<Group>>;
  activityRepo: MockType<Repository<Activity>>;
  userRepo: MockType<Repository<User>>;
  printerService: MockType<PrinterService>;
  documentsService: MockType<DocumentsService>;
  cryptoService: MockType<CryptoService>;
  dataSource: MockType<DataSource>;
  activityService: MockType<ActivityService>;
}

/**
 * Creates a standard NestJS testing module for EmpleadosService.
 *
 * Eliminates the anti-pattern of manual instantiation with `{} as unknown as Repository<X>`.
 * Each dependency is registered through Nest's Dependency Injection system using `useValue`,
 * providing full type-safety, minimal test boilerplate, and zero type lies.
 *
 * @param overrides Optional partial mock implementations for specific test requirements.
 * @returns An initialized `EmpleadosService` and the collection of injected typed mocks.
 */
export async function createEmpleadosServiceTestModule(
  overrides: Partial<EmpleadosMocks> = {},
): Promise<{ service: EmpleadosService; mocks: EmpleadosMocks }> {
  const mocks: EmpleadosMocks = {
    employeeRepo: overrides.employeeRepo ?? {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    },
    scheduleRepo: overrides.scheduleRepo ?? {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    },
    groupRepo: overrides.groupRepo ?? {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
      delete: jest.fn(),
    },
    activityRepo: overrides.activityRepo ?? {
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    },
    userRepo: overrides.userRepo ?? {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    },
    printerService: overrides.printerService ?? {
      createPdf: jest.fn(),
    },
    documentsService: overrides.documentsService ?? {
      generateSeal: jest.fn(),
    },
    cryptoService: overrides.cryptoService ?? {
      encryptDigitalIdToken: jest.fn(),
    },
    dataSource: overrides.dataSource ?? {
      transaction: jest.fn((cb: (em: unknown) => unknown) => cb({})),
    },
    activityService: overrides.activityService ?? {
      log: jest.fn(),
      logMany: jest.fn(),
    },
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      EmpleadosService,
      { provide: getRepositoryToken(Employee), useValue: mocks.employeeRepo },
      { provide: getRepositoryToken(Schedule), useValue: mocks.scheduleRepo },
      { provide: getRepositoryToken(Group), useValue: mocks.groupRepo },
      { provide: getRepositoryToken(Activity), useValue: mocks.activityRepo },
      { provide: getRepositoryToken(User), useValue: mocks.userRepo },
      { provide: PrinterService, useValue: mocks.printerService },
      { provide: DocumentsService, useValue: mocks.documentsService },
      { provide: CryptoService, useValue: mocks.cryptoService },
      { provide: DataSource, useValue: mocks.dataSource },
      { provide: ActivityService, useValue: mocks.activityService },
    ],
  }).compile();

  const service = moduleRef.get<EmpleadosService>(EmpleadosService);
  return { service, mocks };
}
