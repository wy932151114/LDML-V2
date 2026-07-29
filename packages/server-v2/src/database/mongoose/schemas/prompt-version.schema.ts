// ============================================================
// DZS-OS V2 — Prompt Version Schema
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromptVersionDocument = PromptVersion & Document;

/** Prompt 版本管理 */
@Schema({ timestamps: true, collection: 'v2_prompt_versions' })
export class PromptVersion {
  @Prop({ required: true, index: true })
  promptId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true })
  template: string;

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 'draft' })
  status: string;

  @Prop()
  publishedBy?: string;

  @Prop()
  changelog?: string;

  @Prop({ default: false })
  isLatest: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const PromptVersionSchema = SchemaFactory.createForClass(PromptVersion);

// Indexes
PromptVersionSchema.index({ promptId: 1, version: -1 });
PromptVersionSchema.index({ promptId: 1, isLatest: 1 });
