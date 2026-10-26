import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AuthController, COOKIE_NAME } from '../auth.controller';
import { AuthService } from '../auth.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import {
  createMockUser,
  createMockAdminUser,
  MockType,
} from '../../../test/fixtures/user.fixture';

describe('AuthController (Exhaustive HTTP Integration with Supertest)', () => {
  let app: INestApplication;
  let mockAuthService: MockType<AuthService>;
  let mockCloudinaryService: MockType<CloudinaryService>;

  const MOCK_JWT_TOKEN = 'mocked.signed.jwt.token.12345';
  const mockNormalUser = createMockUser({
    id: 'user-uuid-1',
    email: 'docente@santisimo.edu',
    fullName: 'Prof. Mario Silva',
    roles: ['user'],
  });

  const mockAdminUser = createMockAdminUser({
    id: 'admin-uuid-1',
    email: 'director@santisimo.edu',
    fullName: 'Directora Elena Gómez',
    roles: ['admin'],
  });

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      checkAuthStatus: jest.fn(),
      getMyEmployeeProfile: jest.fn(),
    };

    mockCloudinaryService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
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
          throw new UnauthorizedException('Token inválido o expirado');
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 1. POST /auth/login - Antispam, Validation, Status Codes & Invariants
  // ════════════════════════════════════════════════════════════════════════════════
  describe('POST /auth/login', () => {
    it('should return 400 Bad Request if email format is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('email must be an email')]),
      );
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request if unwhitelisted properties are injected', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'valid@santisimo.edu',
          password: 'Password123!',
          maliciousPayload: 'DROP TABLE users;',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('property maliciousPayload should not exist')]),
      );
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden when Turnstile anti-bot verification fails', async () => {
      (mockAuthService.login as jest.Mock).mockRejectedValue(
        new ForbiddenException('Verificación anti-bot fallida. Por favor recarga e intenta nuevamente.'),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'docente@santisimo.edu',
          password: 'CorrectPassword123!',
          turnstileToken: 'invalid-bot-token',
        })
        .expect(403);

      expect(res.body.message).toContain('anti-bot');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('should return 401 Unauthorized when credentials are incorrect', async () => {
      (mockAuthService.login as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Credentials are not valid (email or password)'),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'docente@santisimo.edu',
          password: 'WrongPassword123!',
          turnstileToken: 'valid-turnstile-token',
        })
        .expect(401);

      expect(res.body.message).toContain('Credentials are not valid');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('should return 200 OK, set HttpOnly cookie, strip JWT from body, and return user', async () => {
      (mockAuthService.login as jest.Mock).mockResolvedValue({
        ...mockNormalUser,
        token: MOCK_JWT_TOKEN,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'docente@santisimo.edu',
          password: 'CorrectPassword123!',
          turnstileToken: 'valid-turnstile-token',
          rememberMe: false,
        })
        .expect(200);

      // 🛡️ SECURITY INVARIANT 1: Token MUST NOT be present in JSON body
      expect(res.body.token).toBeUndefined();
      expect(res.body.email).toBe('docente@santisimo.edu');
      expect(res.body.fullName).toBe('Prof. Mario Silva');

      // 🛡️ SECURITY INVARIANT 2: Token MUST be securely stored in an HttpOnly cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c: string) => c.startsWith(`${COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('Path=/');
      expect(authCookie).toContain('SameSite=Strict');

      // Session cookie: should NOT have Max-Age/Expires for persistent retention
      expect(authCookie).not.toContain('Max-Age=');
    });

    it('should set 15-day Max-Age on HttpOnly cookie when rememberMe is true', async () => {
      (mockAuthService.login as jest.Mock).mockResolvedValue({
        ...mockNormalUser,
        token: MOCK_JWT_TOKEN,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'docente@santisimo.edu',
          password: 'CorrectPassword123!',
          turnstileToken: 'valid-turnstile-token',
          rememberMe: true,
        })
        .expect(200);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const authCookie = cookies.find((c: string) => c.startsWith(`${COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('Max-Age=1296000');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 2. POST /auth/logout - Cookie Invalidation & Status
  // ════════════════════════════════════════════════════════════════════════════════
  describe('POST /auth/logout', () => {
    it('should clear the HttpOnly auth cookie and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(res.body).toEqual({
        ok: true,
        message: 'Sesión cerrada exitosamente',
      });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c: string) => c.startsWith(`${COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 3. POST /auth/register - Creation, Validation & Cookie Emission
  // ════════════════════════════════════════════════════════════════════════════════
  describe('POST /auth/register', () => {
    it('should return 400 Bad Request if password does not meet complexity requirements', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'nuevo@santisimo.edu',
          fullName: 'Nuevo Usuario',
          password: 'simplepassword', // Missing uppercase and number
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('password must have a Uppercase')]),
      );
      expect(mockAuthService.create).not.toHaveBeenCalled();
    });

    it('should return 201 Created and return user data without password', async () => {
      (mockAuthService.create as jest.Mock).mockResolvedValue(mockNormalUser);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'docente@santisimo.edu',
          password: 'Password123!',
          fullName: 'Prof. Mario Silva',
          cedula: 'V-18765432',
        })
        .expect(201);

      expect(res.body.token).toBeUndefined();
      expect(res.body.email).toBe('docente@santisimo.edu');
      expect(res.body.fullName).toBe('Prof. Mario Silva');
      expect(mockAuthService.create).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 4. GET /auth/me/employee - Guard Enforcement & Profile Retrieval
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /auth/me/employee', () => {
    it('should return 401 Unauthorized when request lacks authorization', async () => {
      await request(app.getHttpServer())
        .get('/auth/me/employee')
        .expect(401);

      expect(mockAuthService.getMyEmployeeProfile).not.toHaveBeenCalled();
    });

    it('should return 200 OK and employee profile when authenticated', async () => {
      const mockProfile = {
        id: 'employee-uuid-1',
        cedula: 'V-18765432',
        cargo: 'Docente Titular',
        user: { id: mockNormalUser.id, email: mockNormalUser.email },
      };
      (mockAuthService.getMyEmployeeProfile as jest.Mock).mockResolvedValue(mockProfile);

      const res = await request(app.getHttpServer())
        .get('/auth/me/employee')
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(res.body.id).toBe('employee-uuid-1');
      expect(res.body.cargo).toBe('Docente Titular');
      expect(mockAuthService.getMyEmployeeProfile).toHaveBeenCalledWith(mockNormalUser.id);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 5. GET /auth/me & GET /auth/check-status - Session Verification (/auth/me)
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /auth/me and GET /auth/check-status', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(mockAuthService.checkAuthStatus).not.toHaveBeenCalled();
    });

    it('should return 200 OK with safe user projection on GET /auth/me', async () => {
      (mockAuthService.checkAuthStatus as jest.Mock).mockReturnValue({
        id: mockNormalUser.id,
        email: mockNormalUser.email,
        fullName: mockNormalUser.fullName,
        isActive: mockNormalUser.isActive,
        roles: mockNormalUser.roles,
      });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(res.headers['set-cookie']).toBeUndefined();
      expect(res.body.token).toBeUndefined();
      expect(res.body.failedLoginAttempts).toBeUndefined();
      expect(res.body.email).toBe(mockNormalUser.email);
      expect(res.body.fullName).toBe(mockNormalUser.fullName);
    });

    it('should maintain backward-compatibility with GET /auth/check-status alias', async () => {
      (mockAuthService.checkAuthStatus as jest.Mock).mockReturnValue({
        id: mockNormalUser.id,
        email: mockNormalUser.email,
        fullName: mockNormalUser.fullName,
        isActive: mockNormalUser.isActive,
        roles: mockNormalUser.roles,
      });

      const res = await request(app.getHttpServer())
        .get('/auth/check-status')
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(res.body.email).toBe(mockNormalUser.email);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 6. PATCH /auth/update-profile/:id - Role Guard (Admin Only) Protection
  // ════════════════════════════════════════════════════════════════════════════════
  describe('PATCH /auth/update-profile/:id', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .patch('/auth/update-profile/target-user-uuid')
        .send({ fullName: 'Nuevo Nombre' })
        .expect(401);
    });

    it('should return 403 Forbidden when a standard user attempts to update another profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/auth/update-profile/target-user-uuid')
        .set('Authorization', 'Bearer user-token')
        .send({ fullName: 'Intento de Cambio' })
        .expect(403);

      expect(res.body.message).toContain('need a valid role: Admin');
      expect(mockAuthService.update).not.toHaveBeenCalled();
    });

    it('should return 200 OK when an admin updates the profile', async () => {
      const updatedUser = {
        ...mockNormalUser,
        fullName: 'Prof. Mario Silva Editado',
      };
      (mockAuthService.update as jest.Mock).mockResolvedValue(updatedUser);

      const res = await request(app.getHttpServer())
        .patch(`/auth/update-profile/${mockNormalUser.id}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ fullName: 'Prof. Mario Silva Editado' })
        .expect(200);

      expect(res.body.fullName).toBe('Prof. Mario Silva Editado');
      expect(mockAuthService.update).toHaveBeenCalledWith(
        mockNormalUser.id,
        undefined,
        undefined,
        expect.objectContaining({ fullName: 'Prof. Mario Silva Editado' }),
        mockAdminUser,
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 7. PATCH /auth/update-profile - Own Profile Update
  // ════════════════════════════════════════════════════════════════════════════════
  describe('PATCH /auth/update-profile', () => {
    it('should return 200 OK when an authenticated user updates their own profile', async () => {
      const updatedUser = {
        ...mockNormalUser,
        telefono: '0412-9999999',
      };
      (mockAuthService.update as jest.Mock).mockResolvedValue(updatedUser);

      const res = await request(app.getHttpServer())
        .patch('/auth/update-profile')
        .set('Authorization', 'Bearer user-token')
        .send({ telefono: '0412-9999999' })
        .expect(200);

      expect(res.body.telefono).toBe('0412-9999999');
      expect(mockAuthService.update).toHaveBeenCalledWith(
        mockNormalUser.id,
        undefined,
        undefined,
        expect.objectContaining({ telefono: '0412-9999999' }),
        mockNormalUser,
      );
    });
  });
});
