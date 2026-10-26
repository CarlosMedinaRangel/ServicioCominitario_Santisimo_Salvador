import { User } from '../../auth/entities/auth.entity';
import { EntityData } from '../../common/types/entity-data.type';

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ ARQUETIPOS CANÓNICOS DE USUARIOS (Colegio Santísimo Salvador)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * ¿QUÉ SON ESTOS DATOS Y POR QUÉ EXISTEN AQUÍ?
 * Representan las identidades escolares modelo para el desarrollo local y las pruebas.
 * Sirven como FUENTE ÚNICA DE VERDAD compartida entre:
 * 1. El Seeder de Desarrollo (`UserSeeder`): Puebla PostgreSQL con cuentas deterministas.
 * 2. Las Pruebas Automatizadas (Unit Tests y Supertest): Validan contratos con datos estables.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Cada arquetipo está fuertemente tipado mediante `satisfies EntityData<User>`.
 * Si una columna se modifica, añade o elimina en `src/auth/entities/auth.entity.ts`,
 * TypeScript romperá la compilación en este archivo inmediatamente.
 * ════════════════════════════════════════════════════════════════════════════════
 */

export const CANONICAL_ADMIN_USER = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'admin@santisimo.edu',
  password: '$2b$10$mockHashedPasswordAdmin1234567890abcdef',
  fullName: 'Administrador del Sistema',
  cedula: 'V12345678',
  telefono: '04141234567',
  roles: ['admin'],
  isActive: true,
  imagen: null,
  publicId: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastFailedAttemptAt: null,
  employee: undefined,
} satisfies EntityData<User>;

export const CANONICAL_ELENA_USER = {
  id: 'a0000000-0000-0000-0000-000000000002',
  email: 'elena.rodriguez@academia.edu',
  password: '$2b$10$mockHashedPasswordElena1234567890abcdef',
  fullName: 'Dr. Elena Rodríguez',
  cedula: 'V30882924',
  telefono: '04145550189',
  roles: ['user'],
  isActive: true,
  imagen: null,
  publicId: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastFailedAttemptAt: null,
  employee: undefined,
} satisfies EntityData<User>;

export const CANONICAL_CARLOS_USER = {
  id: 'a0000000-0000-0000-0000-000000000003',
  email: 'carlos.perez@academia.edu',
  password: '$2b$10$mockHashedPasswordCarlos123456789abcdef',
  fullName: 'Ing. Carlos Pérez',
  cedula: 'V1234567',
  telefono: '04125550001',
  roles: ['user'],
  isActive: true,
  imagen: null,
  publicId: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastFailedAttemptAt: null,
  employee: undefined,
} satisfies EntityData<User>;

export const CANONICAL_ANA_USER = {
  id: 'a0000000-0000-0000-0000-000000000004',
  email: 'ana.torres@academia.edu',
  password: '$2b$10$mockHashedPasswordAna1234567890abcdef',
  fullName: 'Lic. Ana Torres',
  cedula: 'V30114724',
  telefono: '04165550189',
  roles: ['user'],
  isActive: true,
  imagen: null,
  publicId: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastFailedAttemptAt: null,
  employee: undefined,
} satisfies EntityData<User>;

export const CANONICAL_INACTIVE_USER = {
  id: 'a0000000-0000-0000-0000-000000000005',
  email: 'docente.inactivo@santisimo.edu',
  password: '$2b$10$mockHashedPasswordInactive123456789abc',
  fullName: 'Prof. Inactivo Retirado',
  cedula: 'V9999999',
  telefono: '04149999999',
  roles: ['user'],
  isActive: false, // Soft-deleted para probar filtros y reactivación
  imagen: null,
  publicId: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastFailedAttemptAt: null,
  employee: undefined,
} satisfies EntityData<User>;

export const CANONICAL_USERS = {
  admin: CANONICAL_ADMIN_USER,
  elena: CANONICAL_ELENA_USER,
  carlos: CANONICAL_CARLOS_USER,
  ana: CANONICAL_ANA_USER,
  inactive: CANONICAL_INACTIVE_USER,
};
