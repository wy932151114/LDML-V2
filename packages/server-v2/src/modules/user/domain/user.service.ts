import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@/database/mongoose/schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /** 获取个人资料 */
  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('用户不存在');
    return this.sanitize(user);
  }

  /** 更新个人资料 */
  async updateProfile(userId: string, data: {
    nickname?: string;
    realName?: string;
    gender?: string;
    birthday?: string;
    bio?: string;
    timezone?: string;
    language?: string;
    theme?: string;
  }) {
    const update: any = {};
    if (data.nickname) update.nickname = data.nickname;
    if (data.realName || data.gender || data.birthday || data.bio || data.timezone || data.language || data.theme) {
      update.profile = {};
      if (data.realName !== undefined) update.profile.realName = data.realName;
      if (data.gender !== undefined) update.profile.gender = data.gender;
      if (data.birthday !== undefined) update.profile.birthday = data.birthday;
      if (data.bio !== undefined) update.profile.bio = data.bio;
      if (data.timezone !== undefined) update.profile.timezone = data.timezone;
      if (data.language !== undefined) update.profile.language = data.language;
      if (data.theme !== undefined) update.profile.theme = data.theme;
    }

    const user = await this.userModel.findByIdAndUpdate(userId, { $set: update }, { new: true }).exec();
    if (!user) throw new NotFoundException('用户不存在');
    return this.sanitize(user);
  }

  /** 更新头像 */
  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.userModel.findByIdAndUpdate(userId, { avatarUrl }, { new: true }).exec();
    if (!user) throw new NotFoundException('用户不存在');
    return { avatarUrl: user.avatarUrl };
  }

  /** 获取用户配置 */
  async getPreferences(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('用户不存在');
    return user.preferences || {};
  }

  /** 更新用户配置 */
  async updatePreferences(userId: string, preferences: Record<string, any>) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true },
    ).exec();
    if (!user) throw new NotFoundException('用户不存在');
    return user.preferences;
  }

  /** 获取用户列表（管理后台用） */
  async getUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.userModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments().exec(),
    ]);
    return {
      items: items.map(u => this.sanitize(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private sanitize(user: UserDocument) {
    return {
      id: user._id.toString(),
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      membershipLevel: user.membershipLevel,
      isGuest: user.isGuest,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      profile: user.profile,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
