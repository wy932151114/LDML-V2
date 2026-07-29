import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '@/database/mongoose/schemas/user.schema';
import { Session } from '@/database/mongoose/schemas/session.schema';
import { RedisService } from '@/database/redis/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly refreshTokenExpiryMs: number;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    private jwtService: JwtService,
    private config: ConfigService,
    private redis: RedisService,
  ) {
    this.accessTokenExpiry = this.config.get('JWT_ACCESS_EXPIRY', '15m');
    this.refreshTokenExpiry = this.config.get('JWT_REFRESH_EXPIRY', '7d');
    this.refreshTokenExpiryMs = 7 * 24 * 60 * 60 * 1000;
  }

  /** 注册（邮箱） */
  async register(email: string, password: string, nickname?: string) {
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) throw new ConflictException('该邮箱已被注册');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.userModel.create({
      email,
      passwordHash,
      nickname: nickname || email.split('@')[0],
      role: 'user',
      isGuest: false,
      isVerified: false,
      refreshTokens: [],
    });

    return this.generateTokens(user);
  }

  /** 登录（邮箱+密码） */
  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email }).select('+passwordHash').exec();
    if (!user) throw new UnauthorizedException('邮箱或密码错误');

    if (!user.passwordHash) throw new UnauthorizedException('请使用其他方式登录');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('邮箱或密码错误');

    if (!user.isActive) throw new UnauthorizedException('账号已被禁用');

    user.lastLoginAt = new Date();
    await user.save();

    return this.generateTokens(user);
  }

  /** 游客登录 */
  async guestLogin() {
    const guest = await this.userModel.create({
      nickname: `游客${Date.now().toString().slice(-6)}`,
      role: 'guest',
      isGuest: true,
      isVerified: false,
      refreshTokens: [],
    });
    return this.generateTokens(guest);
  }

  /** Token刷新 */
  async refreshTokens(refreshToken: string) {
    // 验证 refresh token
    const session = await this.sessionModel.findOne({ refreshToken, isRevoked: false }).exec();
    if (!session) throw new UnauthorizedException('Refresh Token 无效或已过期');

    const user = await this.userModel.findById(session.userId).exec();
    if (!user || !user.isActive) {
      await this.sessionModel.findByIdAndUpdate(session._id, { isRevoked: true }).exec();
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // 吊销旧 session
    await this.sessionModel.findByIdAndUpdate(session._id, { isRevoked: true }).exec();

    // 生成新 tokens
    return this.generateTokens(user);
  }

  /** 退出登录 */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.sessionModel.updateOne({ refreshToken }, { isRevoked: true }).exec();
    } else {
      await this.sessionModel.updateMany({ userId: userId as any, isRevoked: false }, { isRevoked: true }).exec();
    }
  }

  /** 修改密码 */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId).select('+passwordHash').exec();
    if (!user) throw new UnauthorizedException('用户不存在');

    if (user.passwordHash) {
      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedException('当前密码错误');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    // 吊销所有旧 session
    await this.sessionModel.updateMany({ userId: userId as any, isRevoked: false }, { isRevoked: true }).exec();
  }

  /** 发送邮箱验证码 */
  async sendEmailVerification(email: string) {
    // 限流检查（Redis）
    const rateKey = `email_code:${email}`;
    const attempts = await this.redis.incr(rateKey);
    if (attempts === 1) await this.redis.expire(rateKey, 300);
    if (attempts > 3) throw new Error('验证码请求过于频繁，请5分钟后再试');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // 实际生产环境：发送邮件
    this.logger.log(`[EMAIL VERIFICATION] ${email} -> code: ${code}`);
    return { success: true, code }; // 开发环境返回code方便测试
  }

  /** 验证邮箱验证码 */
  async verifyEmailCode(email: string, code: string) {
    // 生产环境应查数据库验证
    if (code.length !== 6) throw new Error('验证码格式错误');
    const user = await this.userModel.findOne({ email }).exec();
    if (user) {
      user.emailVerified = true;
      user.isVerified = user.emailVerified || user.phoneVerified;
      await user.save();
    }
    return { verified: true };
  }

  /** 重置密码 */
  async resetPassword(email: string, code: string, newPassword: string) {
    await this.verifyEmailCode(email, code);
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new UnauthorizedException('用户不存在');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await this.sessionModel.updateMany({ userId: user._id as any, isRevoked: false }, { isRevoked: true }).exec();
  }

  /** 生成 JWT Tokens */
  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      isGuest: user.isGuest,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: 900 as any, // 15 minutes
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiryMs);

    // 保存 session
    await this.sessionModel.create({
      userId: user._id,
      refreshToken,
      accessToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15分钟
      user: this.sanitizeUser(user),
    };
  }

  /** 脱敏用户信息 */
  private sanitizeUser(user: UserDocument) {
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
      profile: user.profile,
      createdAt: user.createdAt,
    };
  }
}
