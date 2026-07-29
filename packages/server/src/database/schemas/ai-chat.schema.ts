// ============================================================
// 道之自然·命理AI系统 — MongoDB Schema: AI对话历史
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'ai_chat_history' })
export class AiChatHistory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({type: String, required: true })
  sessionId: string;

  @Prop({type: String, required: true, enum: ['user', 'assistant', 'system'] })
  role: string;

  @Prop({type: String, required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'BaziResult' })
  baziResultId: Types.ObjectId;

  @Prop({ type: String })
  promptVersion: string;

  @Prop({ type: String })
  modelUsed: string;

  @Prop({ type: Number })
  tokensUsed: number;
}

export const AiChatHistorySchema = SchemaFactory.createForClass(AiChatHistory);
AiChatHistorySchema.index({ userId: 1, sessionId: 1 });
AiChatHistorySchema.index({ userId: 1, createdAt: -1 });
