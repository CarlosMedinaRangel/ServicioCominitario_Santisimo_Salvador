import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

/**
 * Creates and strictly validates an instance of a NestJS DTO class using
 * `class-transformer` and `class-validator`.
 *
 * RATIONALE & ARCHITECTURE:
 * Unit tests frequently suffer from "silent mock drift", where tests pass because they provide
 * mock objects that bypass controller validation pipes. By wrapping DTO construction in this
 * factory, tests will fail immediately if:
 * 1. A required field is missing.
 * 2. An invalid format is provided (e.g., malformed email, password length).
 * 3. Extra unwhitelisted properties are passed (`forbidNonWhitelisted: true`).
 *
 * @template T Type of the DTO class
 * @param cls The class constructor of the DTO
 * @param data The payload data conforming to Partial<T> or Record<string, unknown>
 * @returns A validated instance of T
 * @throws Error if validation fails, detailing each violated constraint
 */
function formatValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
  const result: string[] = [];
  for (const err of errors) {
    const currentPath = parentPath ? `${parentPath}.${err.property}` : err.property;
    if (err.constraints) {
      result.push(
        `  - Propiedad '${currentPath}': ${Object.values(err.constraints).join(', ')} (valor recibido: ${JSON.stringify(err.value)})`,
      );
    }
    if (err.children && err.children.length > 0) {
      result.push(...formatValidationErrors(err.children, currentPath));
    }
  }
  return result;
}

export function createValidDto<T extends object>(
  cls: new () => T,
  data: Partial<T> | Record<string, unknown>,
): T {
  const instance = plainToInstance(cls, data);
  const errors: ValidationError[] = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorDetails = formatValidationErrors(errors).join('\n');

    throw new Error(
      `[createValidDto] Error de validación para el DTO '${cls.name}':\n${errorDetails}`,
    );
  }

  return instance;
}
