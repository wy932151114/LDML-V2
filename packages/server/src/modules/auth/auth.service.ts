// ============================================================
// 道之自然·命理AI系统 ?Auth模块：认证服?// 微信一键登?+ JWT + 匿名访客
// ============================================================

import { Injectable, UnauthorizedException, ConflictException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../database/schemas';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * 微信小程序登?   * 流程：前端调用wx.login ?获取code ?后端调微信接??获取openid
   */
  async wechatLogin(code: string): Promise<{ token: string; user: any; isNew: boolean }> {
    // 这里需要用 code 调微信服务器获取 openid
    // 真实环境：https://api.weixin.qq.com/sns/jscode2session
    // 当前用模拟数据做骨架，实际接入时替换
    const mockOpenid = `wx_${code}_${Date.now()}`;

    let user = await this.userModel.findOne({ wechatOpenid: mockOpenid }).exec();
    let isNew = false;

    if (!user) {
      user = await this.userModel.create({
        nickname: `道友${code.substring(0, 4)}`,
        wechatOpenid: mockOpenid,
        membershipLevel: 'free',
      });
      isNew = true;
    }

    // 更新最后登?    user.lastLoginAt = new Date();
    await user.save();

    const token = this.jwtService.sign({
      sub: user._id,
      openid: user.wechatOpenid,
    });

    return {
      token,
      user: this.sanitizeUser(user),
      isNew,
    };
  }

  /**
   * 手机号注?登录
   */
  async phoneLogin(phone: string, nickname?: string): Promise<{ token: string; user: any; isNew: boolean }> {
    let user = await this.userModel.findOne({ phone }).exec();
    let isNew = false;

    if (!user) {
      user = await this.userModel.create({
        nickname: nickname || `道友${phone.slice(-4)}`,
        phone,
        membershipLevel: 'free',
      });
      isNew = true;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = this.jwtService.sign({
      sub: user._id,
      phone: user.phone,
    });

    return { token, user: this.sanitizeUser(user), isNew };
  }

  /**
   * 访客登录（无需注册?   */
  async guestLogin(): Promise<{ token: string; user: any }> {
    const guest = await this.userModel.create({
      nickname: `游客${Date.now().toString().slice(-6)}`,
      membershipLevel: 'free',
    });

    const token = this.jwtService.sign({ sub: guest._id, isGuest: true });

    return { token, user: this.sanitizeUser(guest) };
  }

  /**
   * 验证Token有效?   */
  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Token无效或已过期');
    }
  }

  // ========== 註冊 ==========
  async register(email: string, password: string, nickname: string) {
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { phone: email }] }).exec();
    if (existingUser) throw new ConflictException("該郵箱或手機號已註冊");
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.userModel.create({
      email, passwordHash, nickname, membershipLevel: 'free', role: 'user',
      failedLoginAttempts: 0, lockedUntil: null, isEmailVerified: false, loginHistory: []
    });
    const accessToken = this.jwtService.sign(
      { sub: user._id, role: user.role, membershipLevel: user.membershipLevel },
      { expiresIn: '15m' }
    );
    const refreshToken = this.jwtService.sign(
      { sub: user._id, type: 'refresh' },
      { expiresIn: '7d' }
    );
    return { accessToken, refreshToken, user: this.sanitizeUser(user) };
  }

  // ========== 郵箱登錄 ==========
  async loginByEmail(email: string, password: string) {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) { await this.delay(1000); throw new UnauthorizedException("郵箱或密碼錯誤"); }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new HttpException("賬戶被鎖定，請等待" + remainingTime + "秒後重試", HttpStatus.TOO_MANY_REQUESTS);
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts++;
      if (user.failedLoginAttempts >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await user.save(); await this.delay(1000); throw new UnauthorizedException("郵箱或密碼錯誤");
    }
    user.failedLoginAttempts = 0; user.lockedUntil = null; user.lastLoginAt = new Date();
    user.loginHistory.push(new Date().toISOString() + "-" + this.getClientIP());
    await user.save();
    const accessToken = this.jwtService.sign({ sub: user._id, role: user.role, membershipLevel: user.membershipLevel }, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ sub: user._id, type: 'refresh' }, { expiresIn: '7d' });
    return { accessToken, refreshToken, user: this.sanitizeUser(user) };
  }

  // ========== 手機號登錄 ==========
  async loginByPhone(phone: string, password: string) {
    const user = await this.userModel.findOne({ phone }).exec();
    if (!user) { await this.delay(1000); throw new UnauthorizedException("手機號或密碼錯誤"); }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new HttpException("賬戶被鎖定，請等待" + remainingTime + "秒後重試", HttpStatus.TOO_MANY_REQUESTS);
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts++;
      if (user.failedLoginAttempts >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await user.save(); await this.delay(1000); throw new UnauthorizedException("手機號或密碼錯誤");
    }
    user.failedLoginAttempts = 0; user.lockedUntil = null; user.lastLoginAt = new Date();
    user.loginHistory.push(new Date().toISOString() + "-" + this.getClientIP());
    await user.save();
    const accessToken = this.jwtService.sign({ sub: user._id, role: user.role, membershipLevel: user.membershipLevel }, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ sub: user._id, type: 'refresh' }, { expiresIn: '7d' });
    return { accessToken, refreshToken, user: this.sanitizeUser(user) };
  }

  // ========== 修改密碼 ==========
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException("用戶不存在");
    if (!(await bcrypt.compare(oldPassword, user.passwordHash))) throw new UnauthorizedException("舊密碼錯誤");
    user.passwordHash = await bcrypt.hash(newPassword, 12); await user.save();
  }

  // ========== 刷新Token ==========
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.type !== 'refresh') throw new UnauthorizedException("無效的刷新令牌");
      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || !user.isActive) throw new UnauthorizedException("用戶不存在或已被禁用");
      const accessToken = this.jwtService.sign({ sub: user._id, role: user.role, membershipLevel: user.membershipLevel }, { expiresIn: '15m' });
      return { accessToken, refreshToken };
    } catch (error) { throw new UnauthorizedException("刷新令牌無效或已過期"); }
  }

  private delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
  private getClientIP() { return '127.0.0.1'; }

  private sanitizeUser(user: any) {
    return {
      id: user._id,
      nickname: user.nickname,
      email: user.email,
      role: user.role || 'user',
      avatarUrl: user.avatarUrl,
      membershipLevel: user.membershipLevel,
      isActive: user.isActive,
      isNew: false,
    };
  }
}

