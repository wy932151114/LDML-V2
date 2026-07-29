// ============================================================
// DaoZhiGuang AI System - MongoDB Schema: User
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ type: String, required: true })
  nickname: string;

  @Prop({ type: String, required: true }) email: string;

  @Prop({ type: String, required: true }) passwordHash: string;

  @Prop({
    type: String,
    enum: ["admin", "user", "editor", "viewer"],
    default: "user",
  }) role: string;

  @Prop({ type: String, unique: true, sparse: true })
  phone: string;

  @Prop({ type: String, unique: true, sparse: true })
  wechatOpenid: string;

  @Prop({ type: String })
  avatarUrl: string;

  @Prop({ type: String, enum: ['free', 'basic', 'premium', 'vip'], default: 'free' })
  membershipLevel: string;

  @Prop({ type: Number, default: 0 }) points: number;

  @Prop({ type: Number, default: 0 }) failedLoginAttempts: number;

  @Prop({ type: Date }) lockedUntil: Date | null;

  @Prop({ type: Boolean, default: false }) isEmailVerified: boolean;

  @Prop({
    type: [{ type: String }],
    default: [],
  }) loginHistory: string[];

  @Prop({ type: Boolean, default: true }) isActive: boolean;

  @Prop({ type: Date }) lastLoginAt: Date;

  /** ûǰ/ĿAIԷ */
  @Prop({ type: String })
  currentProblem: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ wechatOpenid: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ email: 1 }, { unique: true });
