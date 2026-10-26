import { BadRequestException } from '@nestjs/common';
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
import { CreateUserDto } from '../dto/create-user.dto.user';
import { createMockUser, MockType } from '../../../test/fixtures/user.fixture';
import { createValidDto } from '../../../test/fixtures/dto-factory.helper';
import { createAuthServiceTestModule } from '../../../test/fixtures/auth-service.factory';

describe('AuthService - Registration (create)', () => {
  let service: AuthService;
  let mockUserRepo: MockType<Repository<User>>;

  beforeEach(async () => {
    mockUserRepo = {
      create: jest.fn((dto) => createMockUser(dto)),
      save: jest.fn((entity) => Promise.resolve(createMockUser(entity))),
    };

    const module = await createAuthServiceTestModule({
      userRepo: mockUserRepo,
    });
    service = module.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should hash password with bcrypt, persist user, and return user without password', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedPassword');

    const createUserDto = createValidDto(CreateUserDto, {
      fullName: 'Test User',
      email: 'test@santisimo.edu',
      password: 'Password123!',
    });

    const result = await service.create(
      'https://res.cloudinary.com/img.jpg',
      'pub-123',
      createUserDto,
    );

    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Test User',
        email: 'test@santisimo.edu',
        imagen: 'https://res.cloudinary.com/img.jpg',
        publicId: 'pub-123',
        password: '$2b$10$hashedPassword',
      }),
    );
    expect(mockUserRepo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it('should throw BadRequestException if duplicate key error 23505 occurs', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (mockUserRepo.save as jest.Mock).mockRejectedValue({
      code: '23505',
      detail: 'Key (email)=(test@santisimo.edu) already exists.',
    });

    const createUserDto = createValidDto(CreateUserDto, {
      fullName: 'Test User',
      email: 'test@santisimo.edu',
      password: 'Password123!',
    });

    await expect(service.create(null, null, createUserDto)).rejects.toThrow(
      BadRequestException,
    );
  });
});
