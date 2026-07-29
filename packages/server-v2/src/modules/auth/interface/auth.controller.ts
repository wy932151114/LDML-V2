import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from '../domain/auth.service';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  SendEmailCodeDto,
  VerifyEmailCodeDto,
  ResetPasswordDto,
} from './auth.dto';

@ApiTags('Auth')
@Controller('v2/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册', description: '使用邮箱和密码注册新用户' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: '注册成功，返回 tokens 和用户信息' })
  @ApiResponse({ status: 409, description: '邮箱已被注册' })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.nickname);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录', description: '使用邮箱和密码登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '登录成功，返回 tokens 和用户信息' })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('guest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '游客登录', description: '无需注册，直接创建游客账号' })
  @ApiResponse({ status: 200, description: '游客登录成功' })
  async guestLogin() {
    return this.auth.guestLogin();
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token', description: '使用 Refresh Token 获取新的 Access Token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token 刷新成功' })
  @ApiResponse({ status: 401, description: 'Refresh Token 无效或已过期' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '退出登录', description: '吊销当前用户的 Session 或指定 Refresh Token' })
  @ApiResponse({ status: 200, description: '退出成功' })
  async logout(@CurrentUser('id') userId: string, @Body('refreshToken') refreshToken?: string) {
    await this.auth.logout(userId, refreshToken);
    return { success: true };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '修改密码', description: '需要旧密码验证，修改成功后吊销所有 Session' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 401, description: '当前密码错误' })
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(userId, dto.oldPassword, dto.newPassword);
    return { success: true };
  }

  @Public()
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送邮箱验证码', description: '向指定邮箱发送 6 位验证码' })
  @ApiBody({ type: SendEmailCodeDto })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  async sendCode(@Body() dto: SendEmailCodeDto) {
    return this.auth.sendEmailVerification(dto.email);
  }

  @Public()
  @Post('verify-email-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证邮箱验证码', description: '验证邮箱验证码是否正确' })
  @ApiBody({ type: VerifyEmailCodeDto })
  @ApiResponse({ status: 200, description: '验证成功' })
  async verifyCode(@Body() dto: VerifyEmailCodeDto) {
    return this.auth.verifyEmailCode(dto.email, dto.code);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置密码', description: '通过邮箱验证码重置密码' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: '密码重置成功' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.email, dto.code, dto.newPassword);
    return { success: true };
  }

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '健康检查', description: '检查认证服务是否正常运行' })
  @ApiResponse({ status: 200, description: '服务正常' })
  async health() {
    return {
      status: 'ok',
      service: 'dzs-os-v2',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
