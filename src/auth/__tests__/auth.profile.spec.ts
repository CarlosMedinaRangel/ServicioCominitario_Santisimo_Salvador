import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { ActivityService } from '../../empleados/activity-service/activity-service.service';
import { ValidRoles } from '../interfaces/valid-roles';
import { createMockUser, createMockAdminUser, MockType } from '../../../test/fixtures/user.fixture';
import { createMockEmployee } from '../../../test/fixtures/employee.fixture';
import { createAuthServiceTestModule } from '../../../test/fixtures/auth-service.factory';

describe('AuthService - Profiles, Status & Updates', () => {
  let service: AuthService;
  let mockUserRepo: MockType<Repository<User>>;
  let mockJwtService: MockType<JwtService>;
  let mockCloudinaryService: MockType<CloudinaryService>;
  let mockCryptoService: MockType<CryptoService>;
  let mockActivityService: MockType<ActivityService>;

  const MOCK_JWT = 'mocked.jwt.token';
  const MOCK_DIGITAL_TOKEN = 'SS-EDID:v1:iv.tag.cipher';

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      preload: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(createMockUser(entity))),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue(MOCK_JWT),
    };

    mockCloudinaryService = {
      deleteFile: jest.fn().mockResolvedValue({ result: 'ok' }),
    };

    mockCryptoService = {
      encryptPayload: jest.fn().mockReturnValue(MOCK_DIGITAL_TOKEN),
    };

    mockActivityService = {
      logMany: jest.fn().mockResolvedValue(undefined),
    };

    const module = await createAuthServiceTestModule({
      userRepo: mockUserRepo,
      jwtService: mockJwtService,
      cloudinaryService: mockCloudinaryService,
      cryptoService: mockCryptoService,
      activityService: mockActivityService,
    });
    service = module.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyEmployeeProfile', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      (mockUserRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyEmployeeProfile('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should generate digitalIdToken when user has employee record and return full profile', async () => {
      const mockUser = createMockUser({
        id: 'user-uuid-1',
        email: 'docente@santisimo.edu',
        fullName: 'Prof. Roberto Gómez',
        cedula: 'V-12345678',
        telefono: '0414-1112233',
        isActive: true,
        roles: ['user'],
        imagen: 'https://res.cloudinary.com/img.jpg',
        employee: createMockEmployee({
          userId: 'emp-uuid-1',
          position: 'Profesor de Matemáticas',
          schedules: [],
          groups: [],
          activities: [],
        }),
      });

      (mockUserRepo.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getMyEmployeeProfile('user-uuid-1');

      expect(mockCryptoService.encryptPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          cedula: 'V-12345678',
          cargo: 'Profesor de Matemáticas',
        }),
        'EDID',
      );
      expect(result.digitalIdToken).toBe(MOCK_DIGITAL_TOKEN);
      expect(result.user.fullName).toBe('Prof. Roberto Gómez');
    });
  });

  describe('checkAuthStatus', () => {
    it('should return safe user allowlist projection without signing a new token or leaking sensitive fields', () => {
      const user = createMockUser({
        id: 'user-123',
        fullName: 'María Santos',
        email: 'maria@santisimo.edu',
        failedLoginAttempts: 3,
      });

      const result = service.checkAuthStatus(user);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
      expect(result.id).toBe('user-123');
      expect(result.fullName).toBe('María Santos');
      expect(result.email).toBe('maria@santisimo.edu');
      expect('token' in result).toBe(false);
      expect('password' in result).toBe(false);
      expect('failedLoginAttempts' in result).toBe(false);
    });
  });

  describe('update', () => {
    const existingUser = createMockUser({
      id: 'user-123',
      password: '$2b$10$oldHashedPassword',
      publicId: 'old-cloudinary-id',
      fullName: 'Antiguo Nombre',
      email: 'antiguo@santisimo.edu',
    });

    beforeEach(() => {
      (mockUserRepo.findOne as jest.Mock).mockResolvedValue({ ...existingUser });
      (mockUserRepo.preload as jest.Mock).mockImplementation(async (entity) => ({
        ...existingUser,
        ...entity,
      }));
    });

    it('should throw BadRequestException if non-admin attempts to change password without currentPassword', async () => {
      const requestingUser = createMockUser({ roles: [ValidRoles.user] });

      await expect(
        service.update(
          'user-123',
          undefined,
          undefined,
          { newPassword: 'NewPassword123!' },
          requestingUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if non-admin supplies incorrect currentPassword', async () => {
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);
      const requestingUser = createMockUser({ roles: [ValidRoles.user] });

      await expect(
        service.update(
          'user-123',
          undefined,
          undefined,
          { currentPassword: 'WrongPassword', newPassword: 'NewPassword123!' },
          requestingUser,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should allow admin to change password without supplying currentPassword', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newHashedPassword');
      const adminUser = createMockAdminUser({ roles: [ValidRoles.admin] });

      const result = await service.update(
        'user-123',
        undefined,
        undefined,
        { newPassword: 'AdminOverridePassword123!' },
        adminUser,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('AdminOverridePassword123!', 10);
      expect(mockActivityService.logMany).toHaveBeenCalledWith(
        'user-123',
        expect.arrayContaining([
          expect.objectContaining({ tipo: 'Cambio de Contraseña' }),
        ]),
      );
      expect(result).toBeDefined();
    });

    it('should delete old cloudinary image when new image is uploaded and log activity', async () => {
      const result = await service.update(
        'user-123',
        'https://res.cloudinary.com/new-img.jpg',
        'new-pub-id',
        { fullName: 'Nuevo Nombre' },
      );

      expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith('old-cloudinary-id');
      expect(mockActivityService.logMany).toHaveBeenCalledWith(
        'user-123',
        expect.arrayContaining([
          expect.objectContaining({ tipo: 'Actualización de Perfil', descripcion: 'Nombre actualizado' }),
          expect.objectContaining({ tipo: 'Actualización de Perfil', descripcion: 'Foto de perfil actualizada' }),
        ]),
      );
      expect(result).toBeDefined();
    });
  });
});
