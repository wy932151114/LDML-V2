// ============================================================
// DZS-OS V2 — Workflow Execution Schema
// 工作流引擎 — 执行实例
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkflowExecutionDocument = WorkflowExecution & Document;

/** 执行状态 */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

/** 节点执行状态 */
export type NodeResultStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/** 日志级别 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/** 节点执行结果 */
export interface WorkflowNodeResult {
  nodeId: string;
  type: string;
  status: NodeResultStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

/** 执行日志 */
export interface WorkflowLog {
  timestamp: Date;
  level: LogLevel;
  nodeId?: string;
  message: string;
}

/** 工作流执行实例 */
@Schema({ timestamps: true, collection: 'v2_workflow_executions' })
export class WorkflowExecution {
  /** 执行唯一标识（自动生成） */
  @Prop({ required: true, unique: true })
  executionId: string;

  /** 关联工作流ID */
  @Prop({ required: true, index: true })
  workflowId: string;

  /** 工作流名称（冗余字段，方便查询） */
  @Prop({ required: true })
  workflowName: string;

  /** 执行状态 */
  @Prop({ required: true, default: 'pending' })
  status: ExecutionStatus;

  /** 开始时间 */
  @Prop()
  startedAt?: Date;

  /** 完成时间 */
  @Prop()
  completedAt?: Date;

  /** 执行耗时（毫秒） */
  @Prop()
  durationMs?: number;

  /** 触发方式 */
  @Prop({ required: true })
  triggeredBy: string;

  /** 输入参数 */
  @Prop({ type: Object, default: {} })
  input: Record<string, any>;

  /** 输出结果 */
  @Prop({ type: Object })
  output?: Record<string, any>;

  /** 当前执行到的节点ID */
  @Prop()
  currentNodeId?: string;

  /** 节点执行结果列表 */
  @Prop({ type: Array, default: [] })
  nodeResults: WorkflowNodeResult[];

  /** 整体错误信息 */
  @Prop()
  error?: string;

  /** 执行日志 */
  @Prop({ type: Array, default: [] })
  logs: WorkflowLog[];

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowExecutionSchema =
  SchemaFactory.createForClass(WorkflowExecution);

// Indexes
WorkflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
WorkflowExecutionSchema.index({ status: 1, createdAt: -1 });
WorkflowExecutionSchema.index({ triggeredBy: 1 });
WorkflowExecutionSchema.index({ startedAt: -1 });
