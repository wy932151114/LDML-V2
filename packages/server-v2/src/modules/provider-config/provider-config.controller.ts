// ============================================================
// DZS-OS V2 — ProviderConfigController
// AI Provider 配置管理 REST API
// ============================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProviderConfigService } from './provider-config.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/utils/user.interface';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  ProviderConfigResponseDto,
  TestConnectionResultDto,
} from './provider-config.dto';

@ApiTags('Provider Config')
@ApiBearerAuth('JWT-auth')
@Controller('v2/provider-config')
export class ProviderConfigController {
  constructor(private readonly configService: ProviderConfigService) {}

  /* -----------------------------------------------------------------------
   * 列表
   * ----------------------------------------------------------------------- */

  @Get()
  @ApiOperation({ summary: '获取所有 Provider 配置列表（API Key 脱敏）' })
  @ApiResponse({ status: 200, description: 'Provider 配置列表' })
  async getAll(): Promise<ProviderConfigResponseDto[]> {
    return this.configService.getAll();
  }

  /* -----------------------------------------------------------------------
   * 详情
   * ----------------------------------------------------------------------- */

  @Get(':name')
  @ApiOperation({ summary: '获取单个 Provider 配置详情（API Key 脱敏）' })
  @ApiResponse({ status: 200, description: 'Provider 配置详情' })
  async getByName(@Param('name') name: string): Promise<ProviderConfigResponseDto> {
    const config = await this.configService.getByName(name);
    if (!config) {
      throw new Error(`Provider "${name}" not found`);
    }
    return config;
  }

  /* -----------------------------------------------------------------------
   * 创建
   * ----------------------------------------------------------------------- */

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建新的 Provider 配置（管理后台）' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: CreateProviderConfigDto): Promise<ProviderConfigResponseDto> {
    return this.configService.create(dto);
  }

  /* -----------------------------------------------------------------------
   * 更新
   * ----------------------------------------------------------------------- */

  @Put(':name')
  @ApiOperation({ summary: '更新 Provider 配置（支持部分更新）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @Param('name') name: string,
    @Body() dto: UpdateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    return this.configService.update(name, dto);
  }

  /* -----------------------------------------------------------------------
   * 删除
   * ----------------------------------------------------------------------- */

  @Delete(':name')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 Provider 配置（内置不可删除）' })
  @ApiResponse({ status: 204, description: '删除成功' })
  async delete(@Param('name') name: string): Promise<void> {
    return this.configService.delete(name);
  }

  /* -----------------------------------------------------------------------
   * 连接测试
   * ----------------------------------------------------------------------- */

  @Post(':name/test')
  @ApiOperation({ summary: '测试 Provider 连接（真实 HTTP 请求）' })
  @ApiResponse({ status: 200, description: '测试结果' })
  async testConnection(@Param('name') name: string): Promise<TestConnectionResultDto> {
    return this.configService.testConnection(name);
  }
}
