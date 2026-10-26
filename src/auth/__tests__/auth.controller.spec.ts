import { Response, Request } from 'express';
import { AuthController, COOKIE_NAME } from '../auth.controller';
import { AuthService } from '../auth.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { CreateUserDto } from '../dto/create-user.dto.user';
import { LoginUserDto } from '../dto/Login-user.dto';
import { createMockUser } from '../../../test/fixtures/user.fixture';
import { createValidDto } from '../../../test/fixtures/dto-factory.helper';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockCloudinaryService: jest.Mocked<Partial<CloudinaryService>>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockAuthService = {
      create: jest.fn(),
      login: jest.fn(),
      getMyEmployeeProfile: jest.fn(),
      checkAuthStatus: jest.fn(),
      update: jest.fn(),
    };

    mockCloudinaryService = {
      uploadFile: jest.fn().mockResolvedValue({
        secureUrl: 'https://cloudinary.com/user.jpg',
        publicId: 'user_123',
      }),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    controller = new AuthController(
      mockAuthService as AuthService,
      mockCloudinaryService as CloudinaryService,
    );
  });

  describe('createUser (Register)', () => {
    const createUserDto = createValidDto(CreateUserDto, {
      email: 'profesor@santisimo.edu',
      password: 'Password123!',
      fullName: 'Profesor Carlos',
      cedula: 'V-18999888',
      telefono: '04141234567',
    });

    it('should create user without file when no image is uploaded', async () => {
      const expectedUser = createMockUser({ email: createUserDto.email });
      (mockAuthService.create as jest.Mock).mockResolvedValue(expectedUser);

      const result = await controller.createUser(
        createUserDto,
        mockResponse as Response,
        undefined,
      );

      expect(mockCloudinaryService.uploadFile).not.toHaveBeenCalled();
      expect(mockAuthService.create).toHaveBeenCalledWith(
        undefined,
        undefined,
        createUserDto,
      );
      expect(result).toBe(expectedUser);
    });

    it('should upload image to cloudinary and attach secureUrl and publicId to create', async () => {
      const mockFile = { buffer: Buffer.from('image-data') } as Express.Multer.File;
      const expectedUser = createMockUser({
        email: createUserDto.email,
        imagen: 'https://cloudinary.com/user.jpg',
      });
      (mockAuthService.create as jest.Mock).mockResolvedValue(expectedUser);

      const result = await controller.createUser(
        createUserDto,
        mockResponse as Response,
        mockFile,
      );

      expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(mockFile, 'usuarios');
      expect(mockAuthService.create).toHaveBeenCalledWith(
        'https://cloudinary.com/user.jpg',
        'user_123',
        createUserDto,
      );
      expect(result).toBe(expectedUser);
    });
  });

  describe('LoginUser', () => {
    const loginDto = createValidDto(LoginUserDto, {
      email: 'user@santisimo.edu',
      password: 'Password123!',
      turnstileToken: '1x00000000000000000000AA',
    });

    it('should set httpOnly cookie, strip token from response body, and return safe user data', async () => {
      const mockUser = createMockUser({ email: loginDto.email });
      (mockAuthService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        token: 'jwt.sample.token',
      });

      const mockRequest = {
        ip: '192.168.1.100',
        connection: {},
      } as unknown as Request;

      const result = await controller.LoginUser(
        loginDto,
        mockResponse as Response,
        mockRequest,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, '192.168.1.100');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        'jwt.sample.token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
      // Invariant: token must not be in returned object body
      expect(result).toEqual({ user: mockUser });
      expect((result as Record<string, unknown>).token).toBeUndefined();
    });

    it('should set 15 days maxAge on cookie when rememberMe is true', async () => {
      const mockUser = createMockUser({ email: loginDto.email });
      (mockAuthService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        token: 'jwt.persistent.token',
      });

      const mockRequest = {
        ip: '127.0.0.1',
      } as unknown as Request;

      await controller.LoginUser(
        { ...loginDto, rememberMe: true },
        mockResponse as Response,
        mockRequest,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        'jwt.persistent.token',
        expect.objectContaining({
          maxAge: 1000 * 60 * 60 * 24 * 15,
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear the auth_token cookie with path / and return ok message', () => {
      const result = controller.logout(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, { path: '/' });
      expect(result).toEqual({ ok: true, message: 'Sesión cerrada exitosamente' });
    });
  });

  describe('checkAuthStatus', () => {
    it('should delegate to authService.checkAuthStatus with the current user and return safe user data', () => {
      const mockUser = createMockUser();
      const safeUser = {
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
        isActive: mockUser.isActive,
        roles: mockUser.roles,
      };
      (mockAuthService.checkAuthStatus as jest.Mock).mockReturnValue(safeUser);

      const result = controller.checkAuthStatus(mockUser);

      expect(mockAuthService.checkAuthStatus).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(safeUser);
    });
  });

  describe('getMyEmployeeProfile', () => {
    it('should delegate to authService.getMyEmployeeProfile using user ID', () => {
      const mockUser = createMockUser({ id: 'user-uuid-999' });
      const mockProfile = { id: 'emp-1', position: 'Profesor' };
      (mockAuthService.getMyEmployeeProfile as jest.Mock).mockReturnValue(mockProfile);

      const result = controller.getMyEmployeeProfile(mockUser);

      expect(mockAuthService.getMyEmployeeProfile).toHaveBeenCalledWith('user-uuid-999');
      expect(result).toBe(mockProfile);
    });
  });
});
