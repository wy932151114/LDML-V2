// ============================================================
// DZS-OS V2 — Auth 模块单元测试
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation(async (data: string, saltOrRounds?: string | number) =>
    `$2a$${typeof saltOrRounds === 'number' ? saltOrRounds : 12}$${data}`),
  compare: jest.fn().mockImplementation(async (data: string, hash: string) => true),
  genSalt: jest.fn().mockResolvedValue('$2a$12$fakesalt'),
  getRounds: jest.fn().mockReturnValue(12),
}));

import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/modules/auth/domain/auth.service';
import { User } from '../src/database/mongoose/schemas/user.schema';
import { Session } from '../src/database/mongoose/schemas/session.schema';
import { RedisService } from '../src/database/redis/redis.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userModel: Model<any>;
  let sessionModel: Model<any>;
  let jwtService: JwtService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedpassword',
    nickname: 'TestUser',
    role: 'user',
    isGuest: false,
    isVerified: false,
    emailVerified: false,
    phoneVerified: false,
    isActive: true,
    membershipLevel: 'none',
    avatarUrl: null,
    phone: null,
    profile: {},
    preferences: {},
    refreshTokens: [],
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    save: jest.fn().mockResolvedValue(true),
  };

  const mockSession = {
    _id: 'session123',
    userId: mockUser._id,
    refreshToken: 'refresh-token-123',
    accessToken: 'access-token-123',
    isRevoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
              }),
            }),
            findById: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
              }),
            }),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken(Session.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            updateOne: jest.fn(),
            updateMany: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('access-token-123'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                JWT_ACCESS_EXPIRY: '15m',
                JWT_REFRESH_EXPIRY: '7d',
                JWT_SECRET: 'test-secret',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(true),
            set: jest.fn().mockResolvedValue(true),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    sessionModel = module.get(getModelToken(Session.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      jest.spyOn(userModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(userModel, 'create').mockResolvedValue({
        ...mockUser,
        toObject: () => mockUser,
      } as any);
      jest.spyOn(sessionModel, 'create').mockResolvedValue(mockSession as any);

      // Act
      const result = await authService.register('new@example.com', 'password123', 'NewUser');

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      jest.spyOn(userModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Act & Assert
      await expect(
        authService.register('existing@example.com', 'password123', 'DupUser'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      const selectMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      jest.spyOn(userModel, 'findOne').mockReturnValue({
        select: selectMock,
      } as any);
      jest.spyOn(sessionModel, 'create').mockResolvedValue(mockSession as any);

      // Act
      const result = await authService.login('test@example.com', 'password123');

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token-123');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      const selectMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      jest.spyOn(userModel, 'findOne').mockReturnValue({
        select: selectMock,
      } as any);

      // Act & Assert
      await expect(
        authService.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const selectMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      jest.spyOn(userModel, 'findOne').mockReturnValue({
        select: selectMock,
      } as any);

      // Act & Assert
      await expect(
        authService.login('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for disabled account', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      const disabledUser = { ...mockUser, isActive: false };
      const selectMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(disabledUser),
      });
      jest.spyOn(userModel, 'findOne').mockReturnValue({
        select: selectMock,
      } as any);

      // Act & Assert
      await expect(
        authService.login('disabled@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('guestLogin', () => {
    it('should create a guest user successfully', async () => {
      // Arrange
      jest.spyOn(userModel, 'create').mockResolvedValue({
        ...mockUser,
        isGuest: true,
        role: 'guest',
        toObject: () => ({ ...mockUser, isGuest: true, role: 'guest' }),
      } as any);
      jest.spyOn(sessionModel, 'create').mockResolvedValue(mockSession as any);

      // Act
      const result = await authService.guestLogin();

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token-123');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      jest.spyOn(sessionModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      } as any);
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      jest.spyOn(sessionModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      } as any);
      jest.spyOn(sessionModel, 'create').mockResolvedValue({
        ...mockSession,
        refreshToken: 'new-refresh-token',
      } as any);

      // Act
      const result = await authService.refreshTokens('valid-refresh-token');

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access-token-123');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      jest.spyOn(sessionModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(
        authService.refreshTokens('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('$2a$12$newhash');
      const selectMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      jest.spyOn(userModel, 'findById').mockReturnValue({
        select: selectMock,
      } as any);
      jest.spyOn(sessionModel, 'updateMany').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      } as any);

      // Act
      await authService.changePassword(mockUser._id, 'oldPassword', 'newPassword123');

      // Assert
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when old password is wrong', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      const selectMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      jest.spyOn(userModel, 'findById').mockReturnValue({
        select: selectMock,
      } as any);

      // Act & Assert
      await expect(
        authService.changePassword(mockUser._id, 'wrongPassword', 'newPassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout and revoke all sessions', async () => {
      // Arrange
      jest.spyOn(sessionModel, 'updateMany').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      } as any);

      // Act
      await authService.logout(mockUser._id);

      // Assert
      expect(sessionModel.updateMany).toHaveBeenCalledWith(
        { userId: mockUser._id, isRevoked: false },
        { isRevoked: true },
      );
    });

    it('should logout and revoke specific session', async () => {
      // Arrange
      jest.spyOn(sessionModel, 'updateOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      } as any);

      // Act
      await authService.logout(mockUser._id, 'specific-refresh-token');

      // Assert
      expect(sessionModel.updateOne).toHaveBeenCalledWith(
        { refreshToken: 'specific-refresh-token' },
        { isRevoked: true },
      );
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification code and return it in dev mode', async () => {
      // Act
      const result = await authService.sendEmailVerification('test@example.com');

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code.length).toBe(6);
    });
  });
});
