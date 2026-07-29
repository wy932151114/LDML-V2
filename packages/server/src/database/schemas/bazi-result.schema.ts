// ============================================================
// 道之自然·命理AI系统 — MongoDB Schema: 命盘结果
// 主数据：存储排盘+五行+大运+神煞的完整计算结果
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'bazi_results' })
export class BaziResult extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BirthInfo' })
  birthInfoId: Types.ObjectId;

  // ---- 四柱 ----
  @Prop({type: String, required: true })
  yearStem: string;

  @Prop({type: String, required: true })
  yearBranch: string;

  @Prop({ type: String })
  yearNayin: string;

  @Prop({type: String, required: true })
  monthStem: string;

  @Prop({type: String, required: true })
  monthBranch: string;

  @Prop({ type: String })
  monthNayin: string;

  @Prop({type: String, required: true })
  dayStem: string;

  @Prop({type: String, required: true })
  dayBranch: string;

  @Prop({ type: String })
  dayNayin: string;

  @Prop({type: String, required: true })
  hourStem: string;

  @Prop({type: String, required: true })
  hourBranch: string;

  @Prop({ type: String })
  hourNayin: string;

  // ---- 日主 ----
  @Prop({type: String, required: true })
  dayMaster: string;

  @Prop({ type: String })
  dayMasterWuxing: string;

  // ---- 五行分析 (JSON) ----
  @Prop({ type: Object })
  wuxingScores: Record<string, number>;

  @Prop({ type: Object })
  wuxingPercentage: Record<string, number>;

  // ---- 用神/喜神/忌神 ----
  @Prop({ type: [String] })
  yongShen: string[];

  @Prop({ type: [String] })
  xiShen: string[];

  @Prop({ type: [String] })
  jiShen: string[];

  @Prop({type: String, enum: ['身强', '身弱', '中和'] })
  bodyStrength: string;

  @Prop({ type: String })
  balanceState: string;

  // ---- 大运 ----
  @Prop({ type: Number })
  dayunStartAge: number;

  @Prop({ type: Object })
  dayunData: any;

  // ---- 神煞 ----
  @Prop({ type: Object })
  shensha: any;

  // ---- 元信息 ----
  @Prop({type: String, default: '1.0' })
  version: string;

  @Prop({type: Boolean, default: false })
  isTrueSolar: boolean;

  @Prop({ type: Date })
  calculationTime: Date;
}

export const BaziResultSchema = SchemaFactory.createForClass(BaziResult);
BaziResultSchema.index({ userId: 1, createdAt: -1 });
