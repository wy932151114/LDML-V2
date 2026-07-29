// ============================================================
// DZS-OS V2 — AI Model Config Schema
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AIModelConfigDocument = AIModelConfig & Document;

/** AI 模型配置 */
@Schema({ timestamps: true, collection: 'v2_ai_model_configs' })
export class AIModelConfig {
  @Prop({ required: true, index: true })
  provider: string;

  @Prop({ required: true })
  model: string;

  @Prop()
  displayName?: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 0 })
  priority: number;

  @Prop({ type: Object, default: { input: 0, output: 0 } })
  price: {
    input: number;
    output: number;
  };

  @Prop({ default: 60 })
  rpm: number;

  @Prop({ default: 100000 })
  tpm: number;

  @Prop({ default: 30000 })
  timeout: number;

  @Prop({ default: 4096 })
  maxTokens: number;

  @Prop({ default: 0.7 })
  temperature: number;

  @Prop({ default: 0.9 })
  topP: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isBuiltin: boolean;

  @Prop({ default: 1 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const AIModelConfigSchema = SchemaFactory.createForClass(AIModelConfig);

// Indexes
AIModelConfigSchema.index({ provider: 1, model: 1 });
AIModelConfigSchema.index({ enabled: 1, priority: 1 });
