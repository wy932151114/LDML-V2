// ============================================================
// DZS-OS V2 — AI Token Log Schema
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AITokenLogDocument = AITokenLog & Document;

/** AI Token 消耗日志 */
@Schema({ timestamps: true, collection: 'v2_ai_token_logs' })
export class AITokenLog {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true, default: 0 })
  promptTokens: number;

  @Prop({ required: true, default: 0 })
  completionTokens: number;

  @Prop({ required: true, default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: 0 })
  estimatedCost: number;

  @Prop({ default: false })
  cacheHit: boolean;

  @Prop()
  promptVersion?: string;

  @Prop()
  error?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const AITokenLogSchema = SchemaFactory.createForClass(AITokenLog);

// Indexes
AITokenLogSchema.index({ userId: 1, createdAt: -1 });
AITokenLogSchema.index({ provider: 1 });
