// ============================================================
// DZS-OS V2 — Provider Config DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsOptional, IsObject, Min, Max } from 'class-validator';
import { ProviderType, TestResult } from '@/database/mongoose/schemas';

/** 创建 Provider 配置 */
export class CreateProviderConfigDto {
  @ApiProperty({ description: 'Provider 唯一标识', example: 'openai' })
  @IsString()
  name: string;

  @ApiProperty({ description: '显示名称', example: 'OpenAI' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: '连接类型', example: 'openai-compatible', default: 'openai-compatible' })
  @IsOptional()
  @IsString()
  type?: ProviderType;

  @ApiProperty({ description: 'API Key（明文上传，加密存储）', example: 'sk-...' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: '自定义 Base URL', example: 'https://api.openai.com/v1' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: '默认模型', example: 'gpt-4o' })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '优先级', default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: '超时时间(ms)', default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({ description: '每分钟请求上限', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rpm?: number;

  @ApiPropertyOptional({ description: '每分钟 Token 上限', default: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  tpm?: number;

  @ApiPropertyOptional({ description: '最大重试次数', default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: '重试延迟(ms)', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  retryDelay?: number;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({ description: '额外 HTTP 头', example: { 'X-Custom': 'value' } })
  @IsOptional()
  @IsObject()
  extraHeaders?: Record<string, string>;
}

/** 更新 Provider 配置 */
export class UpdateProviderConfigDto extends PartialType(CreateProviderConfigDto) {}

/** Provider 配置响应（API Key 脱敏） */
export class ProviderConfigResponseDto {
  @ApiProperty({ description: 'Provider 唯一标识' })
  name: string;

  @ApiProperty({ description: '显示名称' })
  displayName: string;

  @ApiProperty({ description: '连接类型' })
  type: string;

  @ApiProperty({ description: 'API Key 脱敏显示' })
  apiKeyMasked: string;

  @ApiPropertyOptional({ description: '自定义 Base URL' })
  baseUrl?: string;

  @ApiPropertyOptional({ description: '默认模型' })
  defaultModel?: string;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '优先级' })
  priority: number;

  @ApiProperty({ description: '超时(ms)' })
  timeout: number;

  @ApiProperty({ description: '每分钟请求上限' })
  rpm: number;

  @ApiProperty({ description: '每分钟 Token 上限' })
  tpm: number;

  @ApiProperty({ description: '最大重试次数' })
  maxRetries: number;

  @ApiProperty({ description: '重试延迟(ms)' })
  retryDelay: number;

  @ApiPropertyOptional({ description: 'Organization ID' })
  organization?: string;

  @ApiProperty({ description: '额外 HTTP 头' })
  extraHeaders: Record<string, string>;

  @ApiProperty({ description: '是否内置' })
  isBuiltin: boolean;

  @ApiPropertyOptional({ description: '上次测试结果' })
  lastTestResult?: TestResult;

  @ApiProperty({ description: '是否有 API Key 已配置' })
  hasApiKey: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt: string;
}

/** 连接测试结果 */
export class TestConnectionResultDto {
  @ApiProperty({ description: 'Provider 名称' })
  provider: string;

  @ApiProperty({ description: '状态', enum: ['healthy', 'degraded', 'unhealthy'] })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ description: '延迟(ms)' })
  latency: number;

  @ApiProperty({ description: '测试使用的模型' })
  model: string;

  @ApiPropertyOptional({ description: '错误信息' })
  error?: string;

  @ApiProperty({ description: '测试时间' })
  timestamp: string;
}
