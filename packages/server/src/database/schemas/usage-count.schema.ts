import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UsageCount extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['ai-assist', 'report-pdf', 'report-print'], 
    required: true 
  })
  usageType: string;

  @Prop({ type: Number, default: 0 })
  count: number;

  @Prop({ type: Date })
  resetDate: Date;

  @Prop({ type: Number, default: 0 })
  totalCount: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const UsageCountSchema = SchemaFactory.createForClass(UsageCount);
UsageCountSchema.index({ userId: 1, usageType: 1, isActive: 1 }, { unique: true });
