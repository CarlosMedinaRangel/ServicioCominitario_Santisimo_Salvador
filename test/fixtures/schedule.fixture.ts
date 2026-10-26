import { DeepPartial } from 'typeorm';
import { Schedule } from '../../src/empleados/entities/schedule.entity';
import { Group } from '../../src/empleados/entities/group.entity';
import { Employee } from '../../src/empleados/entities/employee.entity';
import { EntityData } from './user.fixture';

/**
 * Creates a mock Schedule entity with sensible defaults for unit tests.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Uses `satisfies EntityData<Schedule>` to ensure all required TypeORM columns
 * are declared and typed correctly.
 *
 * @param overrides Optional partial properties to override schedule defaults.
 * @returns A real `Schedule` instance matching the database entity definition.
 */
export function createMockSchedule(
  overrides: Partial<EntityData<Schedule>> | DeepPartial<Schedule> = {},
): Schedule {
  const defaultScheduleData = {
    id: 'schedule-uuid-mock-1',
    employeeId: 'emp-uuid-mock-1',
    employee: undefined,
    groups: [],
    nombre: 'Matemáticas Avanzadas',
    aula: 'Aula 102',
    horaInicio: '07:30',
    horaFin: '09:00',
    dias: ['Lunes', 'Miércoles'],
    icono: 'book',
    activa: true,
  } satisfies EntityData<Schedule>;

  const schedule = new Schedule();
  return Object.assign(schedule, defaultScheduleData, overrides);
}

/**
 * Creates a mock Group entity with sensible defaults for unit tests.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Uses `satisfies EntityData<Group>` to ensure group relations and student counts
 * remain strictly aligned with the database entity schema.
 *
 * @param overrides Optional partial properties to override group defaults.
 * @returns A real `Group` instance matching the database entity definition.
 */
export function createMockGroup(
  overrides: Partial<EntityData<Group>> | DeepPartial<Group> = {},
): Group {
  const defaultGroupData = {
    id: 'group-uuid-mock-1',
    employeeId: 'emp-uuid-mock-1',
    employee: undefined,
    scheduleId: 'schedule-uuid-mock-1',
    schedule: undefined,
    nombre: 'Sección 3-A',
    cantidadEstudiantes: 32,
  } satisfies EntityData<Group>;

  const group = new Group();
  return Object.assign(group, defaultGroupData, overrides);
}
