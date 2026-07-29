// ============================================================
// DZS-OS V2 — User 模块单元测试
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';

import { UserService } from '../src/modules/user/domain/user.service';
import { User } from '../src/database/mongoose/schemas/user.schema';

describe('UserService', () => {
  let userService: UserService;
  let userModel: Model<any>;

  const mockUserId = '507f1f77bcf86cd799439011';

  const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    phone: null,
    nickname: 'TestUser',
    avatarUrl: null,
    role: 'user',
    membershipLevel: 'none',
    isGuest: false,
    isVerified: false,
    emailVerified: false,
    phoneVerified: false,
    profile: {
      realName: '',
      gender: '',
      birthday: '',
      bio: '',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN',
      theme: 'light',
    },
    preferences: {},
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userModel = module.get(getModelToken(User.name));
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Act
      const result = await userService.getProfile(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUserId);
      expect(result.email).toBe('test@example.com');
      expect(result.nickname).toBe('TestUser');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(userService.getProfile('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      // Arrange
      const updatedUser = {
        ...mockUser,
        nickname: 'UpdatedNickname',
        profile: { ...mockUser.profile, gender: '男' },
      };
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      } as any);

      // Act
      const result = await userService.updateProfile(mockUserId, {
        nickname: 'UpdatedNickname',
        gender: '男',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.nickname).toBe('UpdatedNickname');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act & Assert
      await expect(
        userService.updateProfile('nonexistent-id', { nickname: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAvatar', () => {
    it('should update avatar URL', async () => {
      // Arrange
      const newAvatarUrl = 'https://example.com/avatar.jpg';
      const updatedUser = { ...mockUser, avatarUrl: newAvatarUrl };
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      } as any);

      // Act
      const result = await userService.updateAvatar(mockUserId, newAvatarUrl);

      // Assert
      expect(result).toBeDefined();
      expect(result.avatarUrl).toBe(newAvatarUrl);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        userService.updateAvatar('nonexistent-id', 'https://example.com/avatar.jpg'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      // Arrange
      const userWithPrefs = { ...mockUser, preferences: { theme: 'dark', language: 'en' } };
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithPrefs),
      } as any);

      // Act
      const result = await userService.getPreferences(mockUserId);

      // Assert
      expect(result).toEqual({ theme: 'dark', language: 'en' });
    });

    it('should return empty object when no preferences', async () => {
      jest.spyOn(userModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await userService.getPreferences(mockUserId);
      expect(result).toEqual({});
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      // Arrange
      const newPrefs = { theme: 'dark', language: 'en' };
      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockUser, preferences: newPrefs }),
      } as any);

      // Act
      const result = await userService.updatePreferences(mockUserId, newPrefs);

      // Assert
      expect(result).toEqual(newPrefs);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users list', async () => {
      // Arrange
      jest.spyOn(userModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockUser, mockUser]),
      } as any);
      jest.spyOn(userModel, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(10),
      } as any);

      // Act
      const result = await userService.getUsers(1, 20);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });
  });
});
