// ============================================================
// DZS-OS V2 — Prompt Schema
// 提示词注册中心数据库模型
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptDocument = Prompt & Document;

/** Prompt 类型 */
export type PromptCategory =
  | 'bazi'
  | 'wuxing'
  | 'jiugong'
  | 'fengshui'
  | 'comprehensive'
  | 'ai-report'
  | 'daily-fortune'
  | 'custom';

/** Prompt 状态 */
export type PromptStatus = 'active' | 'inactive' | 'deprecated';

/** 提示词注册条目 */
@Schema({ timestamps: true, collection: 'v2_prompts' })
export class Prompt {
  /** 唯一标识（如 bazi-analysis） */
  @Prop({ required: true, unique: true })
  promptId: string;

  /** 展示名称 */
  @Prop({ required: true })
  name: string;

  /** 分类 */
  @Prop({ required: true, enum: ['bazi', 'wuxing', 'jiugong', 'fengshui', 'comprehensive', 'ai-report', 'daily-fortune', 'custom'] })
  category: PromptCategory;

  /** 标签 */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /** 推荐 Provider */
  @Prop({ default: 'openai' })
  provider: string;

  /** 推荐 Model */
  @Prop({ default: 'gpt-4o' })
  model: string;

  /** 当前版本号 */
  @Prop({ required: true, default: '1.0.0' })
  version: string;

  /** 状态: active | inactive | deprecated */
  @Prop({ default: 'active' })
  status: PromptStatus;

  /** 是否为最新版本 */
  @Prop({ default: true })
  isLatest: boolean;

  /** 描述 */
  @Prop()
  description: string;

  /** 模板变量列表 */
  @Prop({ type: [String], default: [] })
  variables: string[];

  /** Prompt 模板内容（使用 {{variable}} 占位符） */
  @Prop({ required: true })
  template: string;

  /** Token 上限估计 */
  @Prop({ default: 4096 })
  maxTokens: number;

  /** 排序权重 */
  @Prop({ default: 0 })
  sortOrder: number;

  /** 创建人 */
  @Prop()
  createdBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);

// Indexes
PromptSchema.index({ category: 1, sortOrder: 1 });
PromptSchema.index({ status: 1 });
PromptSchema.index({ tags: 1 });
