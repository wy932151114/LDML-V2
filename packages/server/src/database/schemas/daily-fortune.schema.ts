// ============================================================
// 道之自然·命理AI系统 — MongoDB Schema: 每日运势
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'daily_fortunes' })
export class DailyFortune extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({type: String, required: true })
  fortuneDate: string;  // YYYY-MM-DD

  // ---- 运势概况 ----
  @Prop({type: String, enum: ['大吉', '吉', '平', '凶', '大凶'] })
  overallRating: string;

  @Prop({ type: String })
  overallDesc: string;

  // ---- 各领域 ----
  @Prop({ type: Object })
  categories: {
    career: { rating: string; desc: string; advice: string };
    wealth: { rating: string; desc: string; advice: string };
    love: { rating: string; desc: string; advice: string };
    health: { rating: string; desc: string; advice: string };
    study: { rating: string; desc: string; advice: string };
  };

  // ---- 吉凶信息 ----
  @Prop({ type: String })
  luckyDirection: string;

  @Prop({ type: String })
  unluckyDirection: string;

  @Prop({ type: [String] })
  luckyColors: string[];

  @Prop({ type: [Number] })
  luckyNumbers: number[];

  // ---- AI建议 ----
  @Prop({ type: String })
  aiAdvice: string;

  @Prop({ type: [String] })
  yi: string[];

  @Prop({ type: [String] })
  ji: string[];

  // ---- 九宫 ----
  @Prop({ type: Object })
  jiugong: any;

  @Prop({type: String, default: '1.0' })
  version: string;
}

export const DailyFortuneSchema = SchemaFactory.createForClass(DailyFortune);
DailyFortuneSchema.index({ userId: 1, fortuneDate: -1 }, { unique: true });
