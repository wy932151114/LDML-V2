import { Controller, Get, Put, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UserService } from '../domain/user.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UpdateProfileDto, UpdatePreferencesDto } from './user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('v2/users')
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取个人资料', description: '获取当前登录用户的完整资料' })
  @ApiResponse({ status: 200, description: '返回用户资料' })
  @ApiResponse({ status: 401, description: '未登录' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.user.getProfile(userId);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新个人资料', description: '更新昵称、性别、生日等个人资料' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.user.updateProfile(userId, dto);
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '上传头像', description: '上传用户头像（Base64 或 URL）' })
  @ApiResponse({ status: 200, description: '上传成功，返回头像 URL' })
  async updateAvatar(@CurrentUser('id') userId: string, @Body('avatarUrl') avatarUrl: string) {
    return this.user.updateAvatar(userId, avatarUrl);
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取用户配置', description: '获取用户的个性化配置' })
  @ApiResponse({ status: 200, description: '返回用户配置' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.user.getPreferences(userId);
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新用户配置', description: '更新用户的个性化配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updatePreferences(@CurrentUser('id') userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.user.updatePreferences(userId, dto.preferences);
  }
}
