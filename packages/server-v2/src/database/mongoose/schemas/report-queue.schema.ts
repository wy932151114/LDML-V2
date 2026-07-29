// ============================================================
// DZS-OS V2 — Report Queue Schema（BullMQ 任务持久化）
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportQueueDocument = ReportQueue & Document;

/** BullMQ 任务状态镜像 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'v2_report_queue' })
export class ReportQueue {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  reportType: string;

  /** BullMQ 的 jobId */
  @Prop({ required: true, unique: true })
  jobId: string;

  @Prop({ required: true, enum: Object.values(JobStatus), default: JobStatus.WAITING })
  status: string;

  @Prop({ type: Object })
  progress?: {
    percent: number;
    message: string;
  };

  @Prop()
  result?: string;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  progressPercent: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: 0 })
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ReportQueueSchema = SchemaFactory.createForClass(ReportQueue);

// Indexes
ReportQueueSchema.index({ userId: 1, createdAt: -1 });
ReportQueueSchema.index({ status: 1 });
