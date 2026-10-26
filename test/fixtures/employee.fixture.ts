import { DeepPartial } from 'typeorm';
import { Employee } from '../../src/empleados/entities/employee.entity';
import { createMockUser, EntityData } from './user.fixture';

/**
 * Creates a mock Employee entity with sensible defaults for unit tests.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Instead of casting blindly with `as Employee`, the default mock object is bound
 * via `satisfies EntityData<Employee>`.
 *
 * Why this matters:
 * If an engineer alters `Employee` (e.g., adds a mandatory column, renames a property,
 * or changes a data type in `src/empleados/entities/employee.entity.ts`), TypeScript will
 * fail compilation HERE immediately, ensuring our test suite reflects real database invariants.
 *
 * @param overrides Optional partial properties to override defaults.
 * @returns An actual `Employee` instance conforming 100% to the TypeORM schema.
 */
export function createMockEmployee(
  overrides: Partial<EntityData<Employee>> | DeepPartial<Employee> = {},
): Employee {
  const defaultUserId =
    'userId' in overrides && typeof overrides.userId === 'string'
      ? overrides.userId
      : 'emp-uuid-mock-1';

  const defaultEmployeeData = {
    userId: defaultUserId,
    position: 'Docente Titular',
    start_date: new Date('2020-01-15T00:00:00.000Z'),
    work_time: '08:00:00',
    hours_per_day: 8,
    work_schedule: 'Lunes a Viernes, 7:00am - 1:00pm',
    user: createMockUser({ id: defaultUserId }),
    schedules: [],
    groups: [],
    activities: [],
  } satisfies EntityData<Employee>;

  const employee = new Employee();
  return Object.assign(employee, defaultEmployeeData, overrides);
}
