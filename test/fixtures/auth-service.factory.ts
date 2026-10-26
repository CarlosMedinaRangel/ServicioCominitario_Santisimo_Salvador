import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';
import { User } from '../../src/auth/entities/auth.entity';
import { CloudinaryService } from '../../src/cloudinary/cloudinary.service';
import { TurnstileService } from '../../src/auth/services/turnstile.service';
import { CryptoService } from '../../src/crypto/crypto.service';
import { ActivityService } from '../../src/empleados/activity-service/activity-service.service';
import { MockType, createMockUser } from './user.fixture';

export interface AuthMocks {
  userRepo: MockType<Repository<User>>;
  jwtService: MockType<JwtService>;
  cloudinaryService: MockType<CloudinaryService>;
  turnstileService: MockType<TurnstileService>;
  cryptoService: MockType<CryptoService>;
  activityService: MockType<ActivityService>;
}

/**
 * Creates a standard NestJS testing module for AuthService.
 *
 * Eliminates the anti-pattern of manual instantiation with `{} as unknown as Service`.
 * Provides full type safety, clean dependency injection, and zero cast lies.
 *
 * @param overrides Optional partial mock implementations for specific test requirements.
 * @returns Initialized `AuthService` alongside the collection of injected typed mocks.
 */
export async function createAuthServiceTestModule(
  overrides: Partial<AuthMocks> = {},
): Promise<{ service: AuthService; mocks: AuthMocks }> {
  const mocks: AuthMocks = {
    userRepo: overrides.userRepo ?? {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((dto) => createMockUser(dto)),
      save: jest.fn((entity) => Promise.resolve(createMockUser(entity))),
    },
    jwtService: overrides.jwtService ?? {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    },
    cloudinaryService: overrides.cloudinaryService ?? {
      uploadFile: jest.fn().mockResolvedValue({
        secure_url: 'https://cloudinary.com/dummy/profile.jpg',
        public_id: 'dummy/profile',
      }),
      deleteFile: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
    turnstileService: overrides.turnstileService ?? {
      verifyToken: jest.fn().mockResolvedValue(true),
    },
    cryptoService: overrides.cryptoService ?? {
      encryptPayload: jest.fn().mockReturnValue('SS-EDID:v1:mock.token'),
    },
    activityService: overrides.activityService ?? {
      log: jest.fn(),
      logMany: jest.fn(),
    },
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(User), useValue: mocks.userRepo },
      { provide: JwtService, useValue: mocks.jwtService },
      { provide: CloudinaryService, useValue: mocks.cloudinaryService },
      { provide: TurnstileService, useValue: mocks.turnstileService },
      { provide: CryptoService, useValue: mocks.cryptoService },
      { provide: ActivityService, useValue: mocks.activityService },
    ],
  }).compile();

  const service = moduleRef.get<AuthService>(AuthService);
  return { service, mocks };
}
