// ============================================================
// DZS-OS V2 — Report DTOs
// 请求/响应数据传输对象，用于 API 接口层
// ============================================================

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportStatus, ExportFormat } from '@/database/mongoose/schemas/report.schema';

// ── 请求 DTO ──────────────────────────────────────────────────

/** 创建报告请求 */
export class CreateReportDto {
  @ApiProperty({ enum: ReportType, description: '报告类型' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ type: Object, description: '排盘数据（JSON）' })
  @IsOptional()
  @IsObject()
  baziData?: Record<string, any>;

  @ApiPropertyOptional({ description: '用户问题或关注点' })
  @IsOptional()
  @IsString()
  userQuery?: string;

  @ApiPropertyOptional({ type: Object, description: '额外上下文' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Prompt ID（使用 Prompt Center 中的提示词）' })
  @IsOptional()
  @IsString()
  promptId?: string;

  @ApiPropertyOptional({ description: 'Prompt 版本号（默认为最新版）' })
  @IsOptional()
  @IsString()
  promptVersion?: string;

  @ApiPropertyOptional({ description: 'AI 提供商（覆盖 Prompt 默认配置）' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'AI 模型（覆盖 Prompt 默认配置）' })
  @IsOptional()
  @IsString()
  model?: string;
}

/** 报告列表查询参数 */
export class QueryReportDto {
  @ApiPropertyOptional({ enum: ReportType, description: '按类型筛选' })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ enum: ReportStatus, description: '按状态筛选' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

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

  @ApiPropertyOptional({ description: '排序字段', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: '排序方向', default: 'desc' })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}

/** 更新报告请求（仅能修改用户侧字段） */
export class UpdateReportDto {
  @ApiPropertyOptional({ description: '用户问题' })
  @IsOptional()
  @IsString()
  userQuery?: string;

  @ApiPropertyOptional({ type: Object, description: '额外上下文' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: '标记收藏' })
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;
}

/** 导出报告请求 */
export class ExportReportDto {
  @ApiProperty({ description: '报告 ID' })
  @IsString()
  @IsNotEmpty()
  reportId: string;

  @ApiProperty({ enum: ExportFormat, description: '导出格式（可选，路由已确定格式）', required: false })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}

/** 批量删除请求 */
export class BatchDeleteReportDto {
  @ApiProperty({ type: [String], description: '报告 ID 列表' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}

// ── 响应 DTO ──────────────────────────────────────────────────

/** 报告章节响应 */
export class ReportSectionDto {
  @ApiProperty({ description: '章节标题' })
  title: string;

  @ApiProperty({ description: '章节内容' })
  content: string;

  @ApiProperty({ description: '排序' })
  order: number;

  @ApiPropertyOptional({ enum: ['text', 'table', 'chart', 'warning', 'tip'] })
  type?: 'text' | 'table' | 'chart' | 'warning' | 'tip';
}

/** Token 消耗响应 */
export class TokenUsageDto {
  @ApiProperty()
  promptTokens: number;

  @ApiProperty()
  completionTokens: number;

  @ApiProperty()
  totalTokens: number;

  @ApiProperty()
  modelVersion: string;
}

/** 报告概要响应（列表用） */
export class ReportSummaryDto {
  @ApiProperty({ description: '报告 ID' })
  id: string;

  @ApiProperty({ enum: ReportType })
  type: string;

  @ApiProperty({ enum: ReportStatus })
  status: string;

  @ApiPropertyOptional({ description: '标题摘要（从 sections 取首段）' })
  title?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  processingTime?: number;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  isStarred: boolean;
}

/** 完整报告响应 */
export class ReportDetailDto {
  @ApiProperty({ description: '报告 ID' })
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ReportType })
  type: string;

  @ApiProperty({ enum: ReportStatus })
  status: string;

  @ApiPropertyOptional({ type: Object })
  input?: Record<string, any>;

  @ApiProperty({ type: [ReportSectionDto] })
  sections: ReportSectionDto[];

  @ApiPropertyOptional({ type: TokenUsageDto })
  tokenUsage?: TokenUsageDto;

  @ApiPropertyOptional()
  processingTime?: number;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  version: number;

  @ApiPropertyOptional()
  aiModelVersion?: string;

  @ApiProperty()
  isStarred: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/** 分页报告列表响应 */
export class PaginatedReportResponseDto {
  @ApiProperty({ type: [ReportSummaryDto] })
  items: ReportSummaryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

/** 导出报告响应 */
export class ExportReportResponseDto {
  @ApiProperty({ enum: ExportFormat })
  format: string;

  @ApiProperty({ description: '导出文件 URL' })
  url: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  createdAt: Date;
}

// ── 任务队列相关 DTO ──────────────────────────────────────────

/** 报告生成任务数据（BullMQ job data） */
export interface ReportJobData {
  reportId: string;
  userId: string;
  type: ReportType;
  baziData?: Record<string, any>;
  userQuery?: string;
  context?: Record<string, any>;
  promptId?: string;
  promptVersion?: string;
  provider?: string;
  model?: string;
}

/** 报告生成任务结果 */
export interface ReportJobResult {
  reportId: string;
  sections: ReportSectionDto[];
  tokenUsage: TokenUsageDto;
  processingTime: number;
  aiModelVersion: string;
}
