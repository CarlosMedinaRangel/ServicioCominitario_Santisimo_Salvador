import { Employee } from '../../empleados/entities/employee.entity';
import { EntityData } from '../../common/types/entity-data.type';
import {
  CANONICAL_ELENA_USER,
  CANONICAL_CARLOS_USER,
  CANONICAL_ANA_USER,
  CANONICAL_INACTIVE_USER,
} from './users.canonical';

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ ARQUETIPOS CANÓNICOS DE EMPLEADOS (Colegio Santísimo Salvador)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Fuente de verdad para los perfiles laborales docentes del colegio.
 * Cada empleado canónico está vinculado a su usuario correspondiente
 * y cuenta con horarios, turnos y grupos consistentes.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Cada arquetipo está fuertemente tipado mediante `satisfies EntityData<Employee>`.
 * Si se añaden, renombran o alteran columnas en `src/empleados/entities/employee.entity.ts`,
 * el compilador fallará aquí inmediatamente.
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const CANONICAL_ELENA_EMPLOYEE = {
  userId: CANONICAL_ELENA_USER.id,
  position: 'Docente Titular',
  start_date: new Date('2018-09-01T00:00:00.000Z'),
  work_time: '08:00:00',
  hours_per_day: 8,
  work_schedule: 'Lunes a Viernes, 8am - 4pm',
  user: CANONICAL_ELENA_USER,
  schedules: [],
  groups: [],
  activities: [],
} satisfies EntityData<Employee>;

export const CANONICAL_CARLOS_EMPLOYEE = {
  userId: CANONICAL_CARLOS_USER.id,
  position: 'Profesor de Matemáticas',
  start_date: new Date('2020-02-15T00:00:00.000Z'),
  work_time: '07:30:00',
  hours_per_day: 8,
  work_schedule: 'Lunes a Viernes, 7:30am - 3:30pm',
  user: CANONICAL_CARLOS_USER,
  schedules: [],
  groups: [],
  activities: [],
} satisfies EntityData<Employee>;

export const CANONICAL_ANA_EMPLOYEE = {
  userId: CANONICAL_ANA_USER.id,
  position: 'Coordinadora Académica',
  start_date: new Date('2022-06-01T00:00:00.000Z'),
  work_time: '08:00:00',
  hours_per_day: 8,
  work_schedule: 'Lunes a Viernes, 8am - 4pm',
  user: CANONICAL_ANA_USER,
  schedules: [],
  groups: [],
  activities: [],
} satisfies EntityData<Employee>;

export const CANONICAL_INACTIVE_EMPLOYEE = {
  userId: CANONICAL_INACTIVE_USER.id,
  position: 'Docente Suplente',
  start_date: new Date('2021-01-10T00:00:00.000Z'),
  work_time: '07:00:00',
  hours_per_day: 4,
  work_schedule: 'Lunes y Miércoles, 7am - 11am',
  user: CANONICAL_INACTIVE_USER,
  schedules: [],
  groups: [],
  activities: [],
} satisfies EntityData<Employee>;

export const CANONICAL_EMPLOYEES = {
  elena: CANONICAL_ELENA_EMPLOYEE,
  carlos: CANONICAL_CARLOS_EMPLOYEE,
  ana: CANONICAL_ANA_EMPLOYEE,
  inactive: CANONICAL_INACTIVE_EMPLOYEE,
} as const;
