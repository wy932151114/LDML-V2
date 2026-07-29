// ============================================================
// 道之自然·命理AI系统 — User模块：控制器
// ============================================================

import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /api/v1/user/profile
   * 获取用户信息
   */
  @Get('profile')
  async getProfile(@Param('userId') userId: string) {
    return this.userService.getProfile(userId);
  }

  /**
   * PUT /api/v1/user/profile
   * 更新用户信息
   */
  @Put('profile')
  async updateProfile(
    @Body() body: { userId: string; nickname?: string; avatarUrl?: string },
  ) {
    return this.userService.updateProfile(body.userId, body);
  }

  /**
   * POST /api/v1/user/birth
   * 添加出生信息
   */
  @Post('birth')
  async addBirthInfo(@Body() body: {
    userId: string;
    realName?: string;
    gender: string;
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
    birthMinute: number;
    birthPlace?: string;
    longitude?: number;
    useTrueSolar?: boolean;
  }) {
    return this.userService.addBirthInfo(body.userId, body);
  }

  /**
   * GET /api/v1/user/birth
   * 出生信息列表
   */
  @Get('birth')
  async getBirthInfos(@Body('userId') userId: string) {
    return this.userService.getBirthInfos(userId);
  }

  /**
   * DELETE /api/v1/user/birth/:id
   * 删除出生信息
   */
  @Delete('birth/:id')
  async deleteBirthInfo(@Body('userId') userId: string, @Param('id') id: string) {
    return this.userService.deleteBirthInfo(userId, id);
  }
}
