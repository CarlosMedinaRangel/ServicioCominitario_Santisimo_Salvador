import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jew.strategy';
import { User } from '../entities/auth.entity';
import { JwtPayload } from '../interfaces/jwt-payload';
import { createMockUser } from '../../../test/fixtures/user.fixture';

describe('JwtStrategy (HttpOnly Cookie & Session Validation)', () => {
  let strategy: JwtStrategy;
  let mockUserRepo: jest.Mocked<Partial<Repository<User>>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockUserRepo = {
      findOneBy: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('super-secret-jwt-key-12345'),
    };

    strategy = new JwtStrategy(
      mockUserRepo as Repository<User>,
      mockConfigService as ConfigService,
    );
  });

  describe('validate', () => {
    it('should return user when user exists and isActive is true', async () => {
      const activeUser = createMockUser({
        id: MOCK_USER_ID,
        isActive: true,
      });

      (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(activeUser);

      const payload: JwtPayload = { id: MOCK_USER_ID };
      const result = await strategy.validate(payload);

      expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({ id: MOCK_USER_ID });
      expect(result).toBe(activeUser);
      expect(result.isActive).toBe(true);
    });

    it('should throw UnauthorizedException if user is not found in database', async () => {
      (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(null);

      const payload: JwtPayload = { id: 'non-existent-user-id' };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('Token No valid');
    });

    it('should throw UnauthorizedException if user is soft-deleted (isActive: false)', async () => {
      const inactiveUser = createMockUser({
        id: MOCK_USER_ID,
        isActive: false,
      });

      (mockUserRepo.findOneBy as jest.Mock).mockResolvedValue(inactiveUser);

      const payload: JwtPayload = { id: MOCK_USER_ID };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User Is inactive, talk with an admin',
      );
    });
  });
});
