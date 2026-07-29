// ============================================================
// 道之自然·命理AI系统 — Auth模块：控制器
// ============================================================

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========== 郵箱註冊 ==========
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.password, body.nickname);
  }

  // ========== 郵箱登錄 ==========
  @Post('login/email')
  async loginByEmail(@Body() body: any) {
    return this.authService.loginByEmail(body.email, body.password);
  }

  // ========== 手機號登錄 ==========
  @Post('login/phone')
  async loginByPhone(@Body() body: any) {
    return this.authService.loginByPhone(body.phone, body.password);
  }

  // ========== 修改密碼 ==========
  @Post('change-password')
  async changePassword(@Body() body: any) {
    return this.authService.changePassword(body.userId, body.oldPassword, body.newPassword);
  }

  // ========== 刷新Token ==========
  @Post('refresh')
  async refresh(@Body() body: any) {
    return this.authService.refreshToken(body.refreshToken);
  }

  /**
   * POST /api/v1/auth/wechat-login
   * 微信登录
   */
  @Post('wechat-login')
  async wechatLogin(@Body() body: { code: string }) {
    return this.authService.wechatLogin(body.code);
  }

  /**
   * POST /api/v1/auth/phone-login
   * 手机号登录
   */
  @Post('phone-login')
  async phoneLogin(@Body() body: { phone: string; nickname?: string }) {
    return this.authService.phoneLogin(body.phone, body.nickname);
  }

  /**
   * POST /api/v1/auth/guest-login
   * 访客登录（无需注册）
   */
  @Post('guest-login')
  async guestLogin() {
    return this.authService.guestLogin();
  }
}
