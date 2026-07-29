// ============================================================
// DZS-OS V2 — AI Log Schema
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AILogDocument = AILog & Document;

/** AI 调用日志 */
@Schema({ timestamps: true, collection: 'v2_ai_logs' })
export class AILog {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  type: string;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ type: Object, default: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } })
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  @Prop({ default: false })
  cacheHit: boolean;

  @Prop()
  promptId?: string;

  @Prop()
  promptVersion?: string;

  @Prop()
  error?: string;

  @Prop({ required: true })
  status: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export const AILogSchema = SchemaFactory.createForClass(AILog);

// Indexes
AILogSchema.index({ userId: 1, createdAt: -1 });
AILogSchema.index({ status: 1, createdAt: -1 });
