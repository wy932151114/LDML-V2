// ============================================================
// DZS-OS V2 — Workflow Template Schema
// 工作流引擎 — 工作流模板
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkflowTemplateDocument = WorkflowTemplate & Document;

import type {
  WorkflowNode,
  WorkflowEdge,
} from './workflow.schema';

/** 工作流模板 */
@Schema({ timestamps: true, collection: 'v2_workflow_templates' })
export class WorkflowTemplate {
  /** 模板唯一标识 */
  @Prop({ required: true, unique: true })
  templateId: string;

  /** 模板名称 */
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

  /** 节点列表（同工作流节点结构） */
  @Prop({ type: Array, default: [] })
  nodes: WorkflowNode[];

  /** 连线列表（同工作流连线结构） */
  @Prop({ type: Array, default: [] })
  edges: WorkflowEdge[];

  /** 变量声明 */
  @Prop({ type: [String], default: [] })
  variables?: string[];

  /** 是否为内置模板 */
  @Prop({ required: true, default: false })
  isBuiltin: boolean;

  /** 创建人 */
  @Prop()
  createdBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowTemplateSchema =
  SchemaFactory.createForClass(WorkflowTemplate);

// Indexes
WorkflowTemplateSchema.index({ category: 1, name: 1 });
WorkflowTemplateSchema.index({ isBuiltin: 1 });
WorkflowTemplateSchema.index({ tags: 1 });
