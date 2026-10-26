import { DeepPartial } from 'typeorm';
import { User } from '../../src/auth/entities/auth.entity';
import { EntityData } from '../../src/common/types/entity-data.type';

export type { EntityData };

/**
 * Generic mock type for services and repositories in unit tests.
 * Strongly types mock methods while avoiding overloaded signature conflicts in TypeORM.
 */
export type MockType<T> = {
  [P in keyof T]?: jest.Mock<unknown>;
};

/**
 * Creates a mock User entity with sensible defaults for unit tests.
 *
 * 🛡️ SCHEMA DRIFT TRIPWIRE:
 * Instead of casting blindly with `as User`, the default mock object is bound
 * via `satisfies EntityData<User>`.
 *
 * Why this matters:
 * If an engineer alters `User` (e.g., adds a mandatory column, renames a property,
 * or changes a data type in `src/auth/entities/auth.entity.ts`), TypeScript will
 * fail compilation HERE immediately, preventing test data from silently drifting
 * from the database schema.
 *
 * @param overrides Optional partial properties to override defaults.
 * @returns An actual `User` instance conforming 100% to the TypeORM schema.
 */
export function createMockUser(
  overrides: Partial<EntityData<User>> | DeepPartial<User> = {},
): User {
  const defaultUserData = {
    id: 'user-uuid-mock-1',
    email: 'docente@santisimo.edu',
    password: '$2b$10$mockHashedPassword1234567890',
    fullName: 'Prof. Mario Silva',
    cedula: 'V-18765432',
    telefono: '0414-1234567',
    roles: ['user'],
    isActive: true,
    imagen: 'https://res.cloudinary.com/dummy/profile.jpg',
    publicId: 'dummy/profile',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastFailedAttemptAt: null,
    employee: undefined,
  } satisfies EntityData<User>;

  const user = new User();
  return Object.assign(user, defaultUserData, overrides);
}

/**
 * Creates a mock Admin User entity for testing privileged endpoints.
 *
 * @param overrides Optional partial properties to override admin defaults.
 * @returns An actual `User` instance with administrator role permissions.
 */
export function createMockAdminUser(
  overrides: Partial<EntityData<User>> | DeepPartial<User> = {},
): User {
  return createMockUser({
    id: 'admin-uuid-mock-1',
    email: 'admin@santisimo.edu',
    fullName: 'Administrador del Sistema',
    roles: ['admin'],
    ...overrides,
  });
}
