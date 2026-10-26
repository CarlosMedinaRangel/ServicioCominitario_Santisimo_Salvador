import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { SeedController } from '../seed.controller';
import { SeedService } from '../seed.service';
import {
  createMockUser,
  createMockAdminUser,
  MockType,
} from '../../../test/fixtures/user.fixture';

describe('SeedController (HTTP Integration with Supertest)', () => {
  let app: INestApplication;
  let mockSeedService: MockType<SeedService>;

  const mockNormalUser = createMockUser({
    id: 'user-uuid-1',
    roles: ['user'],
  });

  const mockAdminUser = createMockAdminUser({
    id: 'admin-uuid-1',
    roles: ['admin'],
  });

  beforeEach(async () => {
    mockSeedService = {
      runSeed: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SeedController],
      providers: [
        { provide: SeedService, useValue: mockSeedService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers['authorization'];
          if (!authHeader) {
            throw new UnauthorizedException('Token no proporcionado');
          }
          if (authHeader === 'Bearer admin-token') {
            req.user = mockAdminUser;
            return true;
          }
          if (authHeader === 'Bearer user-token') {
            req.user = mockNormalUser;
            return true;
          }
          throw new UnauthorizedException('Token inválido');
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /seed', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/seed')
        .expect(401);

      expect(mockSeedService.runSeed).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden when a standard user attempts seeding', async () => {
      const res = await request(app.getHttpServer())
        .get('/seed')
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(res.body.message).toContain('need a valid role: Admin');
      expect(mockSeedService.runSeed).not.toHaveBeenCalled();
    });

    it('should return 200 OK when an admin executes seeding', async () => {
      const resultMessage = 'Seed ejecutado exitosamente';
      (mockSeedService.runSeed as jest.Mock).mockResolvedValue(resultMessage);

      const res = await request(app.getHttpServer())
        .get('/seed')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.text).toBe(resultMessage);
      expect(mockSeedService.runSeed).toHaveBeenCalled();
    });
  });
});
