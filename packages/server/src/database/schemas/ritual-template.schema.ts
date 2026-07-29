// ============================================================
// 道之自然·命理AI系统 — MongoDB Schema: 仪式模板
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'ritual_templates' })
export class RitualTemplate extends Document {
  @Prop({type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, enum: [
    '方位调整', '时间选择', '物品摆放', '颜色搭配',
    '职业方向', '人际策略', '修行方法', '饮食调理', '居住调整',
  ]})
  type: string;

  @Prop({type: String, required: true })
  description: string;

  @Prop({ type: [String], required: true })
  procedures: string[];

  @Prop({ type: [String] })
  items: string[];

  @Prop({ type: String })
  bestTime: string;

  @Prop({ type: String })
  bestDirection: string;

  @Prop({ type: [String] })
  applicableWuxing: string[];

  @Prop({ type: [String] })
  applicableStrength: string[];

  @Prop({ type: Number })
  durationMin: number;

  @Prop({ type: String })
  effectCycle: string;

  @Prop({type: Number, default: 3 })
  priority: number;

  @Prop({type: String, required: true })
  principle: string;

  @Prop({ type: String })
  source: string;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({type: Boolean, default: true })
  isActive: boolean;

  @Prop({type: Number, default: 0 })
  usageCount: number;
}

export const RitualTemplateSchema = SchemaFactory.createForClass(RitualTemplate);
RitualTemplateSchema.index({ type: 1 });
RitualTemplateSchema.index({ tags: 1 });
