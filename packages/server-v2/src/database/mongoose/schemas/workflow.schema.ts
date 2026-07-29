// ============================================================
// DZS-OS V2 — Workflow Schema
// 工作流引擎 — 工作流定义
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkflowDocument = Workflow & Document;

/** 节点类型枚举 */
export type WorkflowNodeType =
  | 'Start'
  | 'End'
  | 'AI_RUNTIME'
  | 'PROMPT'
  | 'REPORT'
  | 'CONDITION'
  | 'DELAY'
  | 'HTTP'
  | 'DATABASE'
  | 'CUSTOM';

/** 工作流状态 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

/** 节点在画布上的位置 */
export interface NodePosition {
  x: number;
  y: number;
}

/** 工作流节点 */
export interface WorkflowNode {
  nodeId: string;
  type: WorkflowNodeType;
  label: string;
  position: NodePosition;
  config?: Record<string, any>;
  next?: string[];
  condition?: string;
}

/** 工作流连线 */
export interface WorkflowEdge {
  edgeId: string;
  source: string;
  target: string;
  label?: string;
}

/** 工作流定义 */
@Schema({ timestamps: true, collection: 'v2_workflows' })
export class Workflow {
  /** 唯一标识 */
  @Prop({ required: true, unique: true })
  workflowId: string;

  /** 名称 */
  @Prop({ required: true })
  name: string;

  /** 描述 */
  @Prop()
  description?: string;

  /** 分类 */
  @Prop()
  category?: string;

  /** 标签 */
  @Prop({ type: [String], default: [] })
  tags?: string[];

  /** 版本号 */
  @Prop({ required: true, default: '1.0.0' })
  version: string;

  /** 状态: draft | active | paused | archived */
  @Prop({ default: 'draft' })
  status: WorkflowStatus;

  /** 节点列表 */
  @Prop({ type: Array, default: [] })
  nodes: WorkflowNode[];

  /** 连线列表 */
  @Prop({ type: Array, default: [] })
  edges: WorkflowEdge[];

  /** 工作流变量声明 */
  @Prop({ type: [String], default: [] })
  variables?: string[];

  /** 创建人 */
  @Prop({ required: true })
  createdBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);

// Indexes
WorkflowSchema.index({ status: 1, createdAt: -1 });
WorkflowSchema.index({ createdBy: 1, status: 1 });
WorkflowSchema.index({ tags: 1 });
WorkflowSchema.index({ category: 1 });
