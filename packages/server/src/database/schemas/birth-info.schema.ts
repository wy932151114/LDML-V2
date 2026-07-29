// ============================================================
// 道之自然·命理AI系统 — MongoDB Schema: 出生信息
// 高度敏感数据，加密存储
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'birth_infos' })
export class BirthInfo extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String })
  realName: string;

  @Prop({ type: String, required: true, enum: ['男', '女'] })
  gender: string;

  @Prop({ type: Number, required: true })
  birthYear: number;

  @Prop({ type: Number, required: true, min: 1, max: 12 })
  birthMonth: number;

  @Prop({ type: Number, required: true, min: 1, max: 31 })
  birthDay: number;

  @Prop({ type: Number, min: 0, max: 23 })
  birthHour: number;

  @Prop({ type: Number, min: 0, max: 59 })
  birthMinute: number;

  @Prop({ type: String })
  birthPlace: string;

  @Prop({ type: Number })
  longitude: number;

  @Prop({ type: Number })
  latitude: number;

  @Prop({ type: String, default: 'Asia/Shanghai' })
  timezone: string;

  @Prop({ type: Boolean, default: false })
  useTrueSolar: boolean;

  @Prop({ type: Boolean, default: true })
  isPrimary: boolean;
}

export const BirthInfoSchema = SchemaFactory.createForClass(BirthInfo);
BirthInfoSchema.index({ userId: 1, isPrimary: 1 });
