// ============================================================
// DZS-OS V2 — Workflow Engine DTOs
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
  IsObject,
  Min,
  Max,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  WorkflowNodeType,
  WorkflowStatus,
  ExecutionStatus,
  WorkflowNodePosition,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeResult,
} from './workflow.interface';

// ── 基础子 DTO ─────────────────────────────────────────────────

/** 节点位置 DTO */
export class WorkflowNodePositionDto {
  @ApiProperty({ description: 'X 坐标' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y 坐标' })
  @IsNumber()
  y: number;
}

/** 节点边 DTO */
export class WorkflowEdgeDto {
  @ApiProperty({ description: '边 ID' })
  @IsString()
  @IsNotEmpty()
  edgeId: string;

  @ApiProperty({ description: '源节点 ID' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ description: '目标节点 ID' })
  @IsString()
  @IsNotEmpty()
  target: string;

  @ApiPropertyOptional({ description: '边标签' })
  @IsOptional()
  @IsString()
  label?: string;
}

/** 节点 DTO */
export class WorkflowNodeDto {
  @ApiProperty({ description: '节点 ID' })
  @IsString()
  @IsNotEmpty()
  nodeId: string;

  @ApiProperty({
    enum: ['START', 'END', 'AI_RUNTIME', 'PROMPT', 'REPORT', 'CONDITION', 'DELAY', 'HTTP', 'DATABASE', 'CUSTOM'],
    description: '节点类型',
  })
  @IsEnum(['START', 'END', 'AI_RUNTIME', 'PROMPT', 'REPORT', 'CONDITION', 'DELAY', 'HTTP', 'DATABASE', 'CUSTOM'])
  type: WorkflowNodeType;

  @ApiProperty({ description: '节点展示名称' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ type: WorkflowNodePositionDto, description: '节点在画布上的位置' })
  @ValidateNested()
  @Type(() => WorkflowNodePositionDto)
  position: WorkflowNodePosition;

  @ApiPropertyOptional({ type: Object, description: '节点配置（根据类型不同而异）' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '后续节点 ID（单值或数组）' })
  @IsOptional()
  next?: string | string[];

  @ApiPropertyOptional({ description: '条件表达式（CONDITION 节点使用）' })
  @IsOptional()
  @IsString()
  condition?: string;
}

// ── 请求 DTO ──────────────────────────────────────────────────

/** 创建工作流请求 */
export class CreateWorkflowDto {
  @ApiProperty({ description: '工作流名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '工作流描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [WorkflowNodeDto], description: '节点列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNode[];

  @ApiPropertyOptional({ type: [WorkflowEdgeDto], description: '边列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges?: WorkflowEdge[];

  @ApiPropertyOptional({ enum: ['draft', 'active', 'paused', 'archived'], description: '初始状态', default: 'draft' })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'archived'])
  status?: WorkflowStatus;

  @ApiPropertyOptional({ type: [String], description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '创建人' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

/** 更新工作流请求 */
export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: '工作流名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '工作流描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [WorkflowNodeDto], description: '节点列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNode[];

  @ApiPropertyOptional({ type: [WorkflowEdgeDto], description: '边列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges?: WorkflowEdge[];

  @ApiPropertyOptional({ enum: ['draft', 'active', 'paused', 'archived'], description: '工作流状态' })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'archived'])
  status?: WorkflowStatus;

  @ApiPropertyOptional({ type: [String], description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '更新人' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

/** 执行工作流请求 */
export class ExecuteWorkflowDto {
  @ApiProperty({ description: '工作流 ID' })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiPropertyOptional({ type: Object, description: '执行输入参数' })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '触发方式', default: 'manual' })
  @IsOptional()
  @IsEnum(['manual', 'scheduled', 'event', 'api'])
  triggerType?: 'manual' | 'scheduled' | 'event' | 'api';

  @ApiPropertyOptional({ description: '触发人/系统' })
  @IsOptional()
  @IsString()
  triggeredBy?: string;
}

/** 停止工作流执行请求 */
export class StopWorkflowDto {
  @ApiProperty({ description: '执行记录 ID' })
  @IsString()
  @IsNotEmpty()
  executionId: string;

  @ApiPropertyOptional({ description: '停止原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/** 查询工作流列表参数 */
export class QueryWorkflowDto {
  @ApiPropertyOptional({ enum: ['draft', 'active', 'paused', 'archived'], description: '按状态筛选' })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'archived'])
  status?: WorkflowStatus;

  @ApiPropertyOptional({ description: '分类筛选' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '按标签筛选（逗号分隔）' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: '关键词搜索（匹配 name / description）' })
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

  @ApiPropertyOptional({ description: '排序字段', default: 'updatedAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

/** 查询执行记录参数 */
export class QueryExecutionDto {
  @ApiPropertyOptional({ description: '工作流 ID 筛选' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'], description: '按执行状态筛选' })
  @IsOptional()
  @IsEnum(['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'])
  status?: ExecutionStatus;

  @ApiPropertyOptional({ description: '触发方式筛选' })
  @IsOptional()
  @IsEnum(['manual', 'scheduled', 'event', 'api'])
  triggerType?: 'manual' | 'scheduled' | 'event' | 'api';

  @ApiPropertyOptional({ description: '触发人筛选' })
  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @ApiPropertyOptional({ description: '开始时间范围（起始）' })
  @IsOptional()
  @Type(() => Date)
  startedFrom?: Date;

  @ApiPropertyOptional({ description: '开始时间范围（结束）' })
  @IsOptional()
  @Type(() => Date)
  startedTo?: Date;

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
}

/** 创建模板请求 */
export class CreateTemplateDto {
  @ApiPropertyOptional({ description: '从已有工作流创建时提供的工作流 ID' })
  @IsOptional()
  @IsString()
  sourceWorkflowId?: string;

  @ApiProperty({ description: '模板名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '模板分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [WorkflowNodeDto], description: '节点列表（未提供 sourceWorkflowId 时必填）' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNode[];

  @ApiPropertyOptional({ type: [WorkflowEdgeDto], description: '边列表（未提供 sourceWorkflowId 时必填）' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges?: WorkflowEdge[];

  @ApiPropertyOptional({ type: [String], description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String], description: '模板变量列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

/** 导入/导出请求 */
export class ImportExportDto {
  @ApiProperty({ description: '导出版本号' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ enum: ['workflow', 'template'], description: '导出类型' })
  @IsEnum(['workflow', 'template'])
  type: 'workflow' | 'template';

  @ApiProperty({ type: Object, description: '数据' })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ description: '导入后是否自动激活', default: false })
  @IsOptional()
  @IsBoolean()
  activateOnImport?: boolean;
}

/** 验证工作流请求 */
export class ValidateWorkflowDto {
  @ApiPropertyOptional({ description: '工作流 ID（已有工作流的校验）' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ type: [WorkflowNodeDto], description: '节点列表（新建时直接传入校验）' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNode[];

  @ApiPropertyOptional({ type: [WorkflowEdgeDto], description: '边列表（新建时直接传入校验）' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges?: WorkflowEdge[];
}

// ── 响应 DTO ──────────────────────────────────────────────────

/** 工作流响应 */
export class WorkflowResponseDto {
  @ApiProperty({ description: '工作流 ID' })
  workflowId: string;

  @ApiProperty({ description: '工作流名称' })
  name: string;

  @ApiPropertyOptional({ description: '工作流描述' })
  description?: string;

  @ApiProperty({ type: [WorkflowNodeDto], description: '节点列表' })
  nodes: WorkflowNode[];

  @ApiProperty({ type: [WorkflowEdgeDto], description: '边列表' })
  edges: WorkflowEdge[];

  @ApiProperty({ enum: ['draft', 'active', 'paused', 'archived'], description: '工作流状态' })
  status: string;

  @ApiProperty({ description: '版本号' })
  version: number;

  @ApiProperty({ type: [String], description: '标签' })
  tags: string[];

  @ApiPropertyOptional({ description: '分类' })
  category?: string;

  @ApiProperty({ description: '创建人' })
  createdBy: string;

  @ApiPropertyOptional({ description: '更新人' })
  updatedBy?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

/** 节点执行结果响应 */
export class WorkflowNodeResultDto {
  @ApiProperty({ description: '节点 ID' })
  nodeId: string;

  @ApiProperty({ description: '节点类型' })
  nodeType: string;

  @ApiProperty({ description: '节点名称' })
  nodeLabel: string;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'failed', 'skipped'], description: '节点执行状态' })
  status: string;

  @ApiPropertyOptional({ description: '开始时间' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: '完成时间' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: '执行耗时（ms）' })
  duration?: number;

  @ApiPropertyOptional({ type: Object, description: '输入数据' })
  input?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object, description: '输出数据' })
  output?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '错误信息' })
  errorMessage?: string;

  @ApiProperty({ description: '重试次数' })
  retryCount: number;
}

/** 工作流执行记录响应 */
export class WorkflowExecutionResponseDto {
  @ApiProperty({ description: '执行记录 ID' })
  executionId: string;

  @ApiProperty({ description: '工作流 ID' })
  workflowId: string;

  @ApiPropertyOptional({ description: '工作流名称' })
  workflowName?: string;

  @ApiProperty({ description: '工作流版本号' })
  workflowVersion: number;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'], description: '执行状态' })
  status: string;

  @ApiProperty({ description: '触发人/系统' })
  triggeredBy: string;

  @ApiProperty({ description: '触发方式' })
  triggerType: string;

  @ApiPropertyOptional({ type: Object, description: '输入参数' })
  input?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object, description: '输出结果' })
  output?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [WorkflowNodeResultDto], description: '节点执行结果' })
  nodeResults?: WorkflowNodeResultDto[];

  @ApiPropertyOptional({ description: '开始时间' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: '完成时间' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: '执行耗时（ms）' })
  duration?: number;

  @ApiPropertyOptional({ description: '错误信息' })
  errorMessage?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

/** 工作流模板响应 */
export class WorkflowTemplateResponseDto {
  @ApiProperty({ description: '模板 ID' })
  templateId: string;

  @ApiProperty({ description: '模板名称' })
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  description?: string;

  @ApiPropertyOptional({ description: '模板分类' })
  category?: string;

  @ApiProperty({ type: [WorkflowNodeDto], description: '节点列表' })
  nodes: WorkflowNode[];

  @ApiProperty({ type: [WorkflowEdgeDto], description: '边列表' })
  edges: WorkflowEdge[];

  @ApiProperty({ type: [String], description: '标签' })
  tags: string[];

  @ApiProperty({ type: [String], description: '模板变量列表' })
  variables: string[];

  @ApiProperty({ description: '版本号' })
  version: number;

  @ApiProperty({ description: '是否为内置模板' })
  isBuiltin: boolean;

  @ApiProperty({ description: '创建人' })
  createdBy: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

/** 分页工作流列表响应 */
export class PaginatedWorkflowResponseDto {
  @ApiProperty({ type: [WorkflowResponseDto], description: '工作流列表' })
  items: WorkflowResponseDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页条数' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

/** 分页执行记录列表响应 */
export class PaginatedExecutionResponseDto {
  @ApiProperty({ type: [WorkflowExecutionResponseDto], description: '执行记录列表' })
  items: WorkflowExecutionResponseDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页条数' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

/** 工作流统计响应 */
export class WorkflowStatsResponseDto {
  @ApiProperty({ description: '总工作流数' })
  totalWorkflows: number;

  @ApiProperty({ description: '活跃工作流数' })
  activeWorkflows: number;

  @ApiProperty({ description: '总执行次数' })
  totalExecutions: number;

  @ApiProperty({ description: '成功执行次数' })
  completedExecutions: number;

  @ApiProperty({ description: '失败执行次数' })
  failedExecutions: number;

  @ApiProperty({ description: '运行中执行次数' })
  runningExecutions: number;

  @ApiProperty({ description: '平均执行耗时（ms）' })
  averageDuration: number;

  @ApiPropertyOptional({ type: Object, description: '按状态统计' })
  executionsByStatus?: Record<string, number>;

  @ApiPropertyOptional({ type: [Object], description: '按日统计' })
  executionsByDay?: Array<{ date: string; count: number }>;
}

/** 验证结果响应 */
export class ValidateResultDto {
  @ApiProperty({ description: '是否通过校验' })
  valid: boolean;

  @ApiProperty({ type: [String], description: '错误列表' })
  errors: string[];

  @ApiProperty({ type: [String], description: '警告列表' })
  warnings: string[];

  @ApiPropertyOptional({ type: Object, description: '节点级别校验详情' })
  nodeDetails?: Record<string, { valid: boolean; errors: string[]; warnings: string[] }>;
}

// ── 任务队列相关 DTO ──────────────────────────────────────────

/** 工作流执行任务数据（BullMQ job data） */
export interface WorkflowJobData {
  jobId: string;
  workflowId: string;
  executionId: string;
  workflowVersion: number;
  input?: Record<string, unknown>;
  triggeredBy: string;
  triggerType: 'manual' | 'scheduled' | 'event' | 'api';
  userId?: string;
}

/** 工作流执行节点任务数据 */
export interface WorkflowNodeJobData {
  jobId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  nodeType: WorkflowNodeType;
  input?: Record<string, unknown>;
  context?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
}

/** 工作流执行任务结果 */
export interface WorkflowJobResult {
  jobId: string;
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  output?: Record<string, unknown>;
  errorMessage?: string;
  nodeResults?: WorkflowNodeResult[];
  duration: number;
}
