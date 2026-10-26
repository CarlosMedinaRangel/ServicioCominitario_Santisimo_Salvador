import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  compareSync: jest.fn(),
}));

import { AuthService } from '../auth.service';
import { User } from '../entities/auth.entity';
import { createMockUser, createMockAdminUser, MockType } from '../../../test/fixtures/user.fixture';
import { LoginUserDto } from '../dto/Login-user.dto';
import { createValidDto } from '../../../test/fixtures/dto-factory.helper';
import { createAuthServiceTestModule } from '../../../test/fixtures/auth-service.factory';

describe('AuthService - Authentication & Lockout (login)', () => {
  let service: AuthService;
  let mockUserRepo: MockType<Repository<User>>;
  let mockJwtService: MockType<JwtService>;
  let mockTurnstileService: MockType<TurnstileService>;

  const MOCK_JWT = 'mocked.jwt.token';

  const loginDto = createValidDto(LoginUserDto, {
    email: 'admin@santisimo.edu',
    password: 'CorrectPassword123!',
    turnstileToken: 'dummy-token',
  });

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(createMockUser(entity))),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue(MOCK_JWT),
    };

    mockTurnstileService = {
      verifyToken: jest.fn().mockResolvedValue(true),
    };

    const module = await createAuthServiceTestModule({
      userRepo: mockUserRepo,
      jwtService: mockJwtService,
      turnstileService: mockTurnstileService,
    });
    service = module.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call Turnstile verification before checking user', async () => {
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.login(loginDto, '127.0.0.1')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTurnstileService.verifyToken).toHaveBeenCalledWith('dummy-token', '127.0.0.1');
  });

  it('should throw UnauthorizedException if user does not exist', async () => {
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    await expect(service.login(loginDto)).rejects.toThrow('Credenciales inválidas');
  });

  it('should throw HttpException with HttpStatus.LOCKED (423) if account is locked', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue(
      createMockUser({
        id: 'user-1',
        email: 'admin@santisimo.edu',
        password: '$2b$10$hashed',
        lockedUntil,
      }),
    );

    await expect(service.login(loginDto)).rejects.toThrow(HttpException);

    try {
      await service.login(loginDto);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.LOCKED);
      expect(err.getResponse().message).toContain('Cuenta bloqueada temporalmente');
    }
  });

  it('should increment failedLoginAttempts and throw UnauthorizedException on wrong password', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const mockUser = createMockUser({
      id: 'user-1',
      email: 'admin@santisimo.edu',
      password: '$2b$10$hashed',
      failedLoginAttempts: 2,
      lockedUntil: null,
    });
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);

    await expect(
      service.login({ ...loginDto, password: 'WrongPassword' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockUser.failedLoginAttempts).toBe(3);
    expect(mockUserRepo.save).toHaveBeenCalledWith(mockUser);
  });

  it('should lock account for 15 minutes when 5th consecutive failed attempt occurs', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const mockUser = createMockUser({
      id: 'user-1',
      email: 'admin@santisimo.edu',
      password: '$2b$10$hashed',
      failedLoginAttempts: 4,
      lockedUntil: null,
    });
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);

    try {
      await service.login({ ...loginDto, password: 'WrongPassword' });
      fail('Expected HttpException 423 to be thrown');
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.LOCKED);
      expect(err.getResponse().message).toContain('Cuenta bloqueada por 15 minutos');
      expect(mockUser.failedLoginAttempts).toBe(5);
      expect(mockUser.lockedUntil).toBeDefined();
      expect(mockUserRepo.save).toHaveBeenCalledWith(mockUser);
    }
  });

  it('should authenticate successfully, reset failed attempts, and return user info with token', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const mockUser = createMockAdminUser({
      id: 'user-1',
      email: 'admin@santisimo.edu',
      password: '$2b$10$hashed',
      fullName: 'Administrador Principal',
      failedLoginAttempts: 3,
      lockedUntil: null,
    });
    (mockUserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);

    const response = await service.login(loginDto);

    expect(mockUser.failedLoginAttempts).toBe(0);
    expect(mockUserRepo.save).toHaveBeenCalledWith(mockUser);
    expect(response.token).toBe(MOCK_JWT);
    expect((response as Record<string, unknown>).password).toBeUndefined();
    expect(response.fullName).toBe('Administrador Principal');
  });
});
