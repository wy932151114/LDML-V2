import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'v2_users' })
export class User {
  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ required: true, default: '游客' })
  nickname: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ type: String, enum: ['guest', 'user', 'vip', 'admin', 'super_admin'], default: 'guest' })
  role: string;

  @Prop({ type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' })
  membershipLevel: string;

  @Prop({ default: false })
  isGuest: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop()
  wechatOpenid?: string;

  @Prop()
  wechatUnionid?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ type: Object })
  profile?: {
    realName?: string;
    gender?: string;
    birthday?: string;
    bio?: string;
    timezone?: string;
    language?: string;
    theme?: string;
  };

  @Prop({ type: Object })
  preferences?: Record<string, any>;

  @Prop({ type: [String], default: [] })
  refreshTokens: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ phone: 1 }, { sparse: true });
UserSchema.index({ wechatOpenid: 1 }, { sparse: true });
