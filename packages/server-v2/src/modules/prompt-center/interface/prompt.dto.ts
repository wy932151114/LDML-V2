// ============================================================
// DZS-OS V2 — Prompt Center DTOs
// 请求/响应数据传输对象，用于 API 接口层
// ============================================================

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PromptCategory, PromptStatus, PromptVersionStatus, SemVer } from './prompt.interface';

// ── 请求 DTO ──────────────────────────────────────────────────

/** 创建 Prompt 请求 */
export class CreatePromptDto {
  @ApiProperty({ description: '唯一标识（如 bazi-analysis）' })
  @IsString()
  @IsNotEmpty()
  promptId: string;

  @ApiProperty({ description: '展示名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['bazi', 'wuxing', 'jiugong', 'fengshui', 'comprehensive', 'ai-report', 'daily-fortune', 'custom'], description: '分类' })
  @IsEnum(['bazi', 'wuxing', 'jiugong', 'fengshui', 'comprehensive', 'ai-report', 'daily-fortune', 'custom'])
  category: PromptCategory;

  @ApiPropertyOptional({ type: [String], description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '推荐 Provider', default: 'openai' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: '推荐 Model', default: 'gpt-4o' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: 'Prompt 模板内容（使用 {{variable}} 占位符）' })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiPropertyOptional({ type: [String], description: '模板变量列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Token 上限估计', default: 4096 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: '排序权重', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '创建人' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

/** 更新 Prompt 请求 */
export class UpdatePromptDto {
  @ApiPropertyOptional({ description: '展示名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '推荐 Provider' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: '推荐 Model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Prompt 模板内容' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ type: [String], description: '模板变量列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: 'Token 上限估计' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'deprecated'], description: '状态' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'deprecated'])
  status?: PromptStatus;
}

/** 查询 Prompt 列表参数 */
export class QueryPromptDto {
  @ApiPropertyOptional({ enum: ['bazi', 'wuxing', 'jiugong', 'fengshui', 'comprehensive', 'ai-report', 'daily-fortune', 'custom'], description: '按分类筛选' })
  @IsOptional()
  @IsEnum(['bazi', 'wuxing', 'jiugong', 'fengshui', 'comprehensive', 'ai-report', 'daily-fortune', 'custom'])
  category?: PromptCategory;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'deprecated'], description: '按状态筛选' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'deprecated'])
  status?: PromptStatus;

  @ApiPropertyOptional({ description: '按标签筛选（逗号分隔）' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: '关键词搜索（匹配 name / description / promptId）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '是否仅查最新版本', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  latestOnly?: boolean = true;
}

/** 渲染 / 执行 Prompt 请求 */
export class ExecutePromptDto {
  @ApiProperty({ description: 'Prompt ID' })
  @IsString()
  @IsNotEmpty()
  promptId: string;

  @ApiPropertyOptional({ description: '版本号（默认使用最新版）' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ type: Object, description: '模板变量键值对' })
  @IsObject()
  variables: Record<string, string>;

  @ApiPropertyOptional({ type: Object, description: '运行时覆盖参数' })
  @IsOptional()
  @IsObject()
  overrides?: {
    maxTokens?: number;
    temperature?: number;
    provider?: string;
    model?: string;
  };
}

/** 创建 Prompt 版本请求 */
export class CreatePromptVersionDto {
  @ApiProperty({ description: '关联的 Prompt ID' })
  @IsString()
  @IsNotEmpty()
  promptId: string;

  @ApiProperty({ description: '展示名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '版本号 (semver)' })
  @IsString()
  @IsNotEmpty()
  version: SemVer;

  @ApiProperty({ description: 'Prompt 模板内容' })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiPropertyOptional({ type: [String], description: '模板变量列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ type: [String], description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '变更日志' })
  @IsOptional()
  @IsString()
  changelog?: string;

  @ApiPropertyOptional({ description: '发布者' })
  @IsOptional()
  @IsString()
  publishedBy?: string;
}

/** 批量删除请求 */
export class BatchDeletePromptDto {
  @ApiProperty({ type: [String], description: 'Prompt ID 列表' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}

// ── 响应 DTO ──────────────────────────────────────────────────

/** Prompt 响应 */
export class PromptResponseDto {
  @ApiProperty({ description: '唯一标识' })
  promptId: string;

  @ApiProperty({ description: '展示名称' })
  name: string;

  @ApiProperty({ enum: ['bazi', 'wuxing', 'jiugong', 'fengshui', 'comprehensive', 'ai-report', 'daily-fortune', 'custom'] })
  category: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  provider: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  version: string;

  @ApiProperty({ enum: ['active', 'inactive', 'deprecated'] })
  status: string;

  @ApiProperty()
  isLatest: boolean;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  variables: string[];

  @ApiProperty()
  template: string;

  @ApiProperty()
  maxTokens: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/** Prompt 版本响应 */
export class PromptVersionResponseDto {
  @ApiProperty()
  promptId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  template: string;

  @ApiProperty({ type: [String] })
  variables: string[];

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status: string;

  @ApiPropertyOptional()
  publishedBy?: string;

  @ApiPropertyOptional()
  changelog?: string;

  @ApiProperty()
  isLatest: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/** 执行结果响应 */
export class ExecutePromptResponseDto {
  @ApiProperty()
  promptId: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: Object })
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };

  @ApiPropertyOptional()
  modelUsed?: string;

  @ApiPropertyOptional()
  providerUsed?: string;

  @ApiProperty()
  processingTime: number;
}

/** 分页列表响应 */
export class PaginatedPromptResponseDto {
  @ApiProperty({ type: [PromptResponseDto] })
  items: PromptResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

/** 版本分页列表响应 */
export class PaginatedVersionResponseDto {
  @ApiProperty({ type: [PromptVersionResponseDto] })
  items: PromptVersionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ── 任务队列相关 DTO ──────────────────────────────────────────

/** Prompt 执行任务数据（BullMQ job data） */
export interface PromptJobData {
  jobId: string;
  promptId: string;
  version?: string;
  variables: Record<string, string>;
  overrides?: {
    maxTokens?: number;
    temperature?: number;
    provider?: string;
    model?: string;
  };
  userId?: string;
}

/** Prompt 执行任务结果 */
export interface PromptJobResult {
  jobId: string;
  promptId: string;
  version: string;
  content: string;
  tokenUsage: { prompt: number; completion: number; total: number };
  processingTime: number;
  modelUsed?: string;
  providerUsed?: string;
  error?: string;
}
