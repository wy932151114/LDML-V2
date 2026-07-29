import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OperationLogDocument = OperationLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'v2_operation_logs' })
export class OperationLog {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  operation: string;

  @Prop({ required: true })
  module: string;

  @Prop({ type: Object })
  input?: Record<string, any>;

  @Prop({ type: Object })
  output?: Record<string, any>;

  @Prop()
  error?: string;

  @Prop()
  ip?: string;

  @Prop()
  duration?: number;

  @Prop({ required: true, enum: ['success', 'failure'] })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const OperationLogSchema = SchemaFactory.createForClass(OperationLog);
OperationLogSchema.index({ createdAt: -1 });
OperationLogSchema.index({ module: 1, createdAt: -1 });
