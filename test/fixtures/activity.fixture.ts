import { DeepPartial } from 'typeorm';
import { Activity } from '../../src/empleados/entities/activity.entity';
import { Employee } from '../../src/empleados/entities/employee.entity';
import { EntityData } from './user.fixture';

/**
 * Creates a mock Activity entity with sensible defaults for unit tests.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Uses `satisfies EntityData<Activity>` to guarantee that audit trail records
 * in tests match 100% of the TypeORM entity properties and types.
 *
 * Why this matters:
 * If an engineer alters `Activity` (e.g., adds a mandatory column, renames `destacada`,
 * or changes a data type in `src/empleados/entities/activity.entity.ts`), TypeScript will
 * fail compilation HERE immediately, ensuring our test suite reflects real database invariants.
 *
 * @param overrides Optional partial properties to override activity defaults.
 * @returns A real `Activity` instance bound to the database entity.
 */
export function createMockActivity(
  overrides: Partial<EntityData<Activity>> | DeepPartial<Activity> = {},
): Activity {
  const defaultActivityData = {
    id: 'activity-uuid-mock-1',
    employeeId: 'emp-uuid-mock-1',
    employee: undefined,
    tipo: 'Actualización Laboral',
    descripcion: 'Horario laboral actualizado',
    detalle: 'Lunes a Viernes, 7am - 1pm',
    timestamp: new Date('2026-02-01T10:00:00.000Z'),
    destacada: false,
  } satisfies EntityData<Activity>;

  const activity = new Activity();
  return Object.assign(activity, defaultActivityData, overrides);
}
