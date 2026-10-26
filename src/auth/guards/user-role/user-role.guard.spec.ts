import { BadRequestException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoleGuard } from './user-role.guard';
import { META_ROLES } from '../../Decorators/role-protected.decorator';
import { ValidRoles } from '../../interfaces';

describe('UserRoleGuard (Role-Based Access Control)', () => {
  let guard: UserRoleGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new UserRoleGuard(reflector);
  });

  function createMockExecutionContext(user?: any): ExecutionContext {
    return {
      getHandler: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required on endpoint handler', () => {
    reflector.get.mockReturnValue(undefined);
    const context = createMockExecutionContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if empty roles array is configured', () => {
    reflector.get.mockReturnValue([]);
    const context = createMockExecutionContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw BadRequestException if user is not present in request', () => {
    reflector.get.mockReturnValue([ValidRoles.admin]);
    const context = createMockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    expect(() => guard.canActivate(context)).toThrow('User Not found (Request)');
  });

  it('should allow access if user has one of the required roles', () => {
    reflector.get.mockReturnValue([ValidRoles.admin]);
    const context = createMockExecutionContext({
      fullName: 'Administrador Principal',
      roles: [ValidRoles.admin],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks the required role', () => {
    reflector.get.mockReturnValue([ValidRoles.admin]);
    const context = createMockExecutionContext({
      fullName: 'Prof. Mario Silva',
      roles: [ValidRoles.user],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(/need a valid role/);
  });
});
