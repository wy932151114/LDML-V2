// ============================================================
// DZS-OS V2 — Report Schema
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

/** 报告类型枚举 */
export enum ReportType {
  BAZI = 'bazi',                // 八字分析
  WUXING = 'wuxing',            // 五行分析
  DAYUN = 'dayun',              // 大运流年
  JIUGONG = 'jiugong',          // 九宫飞星
  FENGSHUI_SCAN = 'fengshui',   // 风水扫描
  AI_COMPREHENSIVE = 'ai_comprehensive',  // AI综合命理
  ENTERPRISE = 'enterprise',    // 企业风水
  DAILY = 'daily',              // 每日运势
  WEEKLY = 'weekly',            // 周运
  MONTHLY = 'monthly',          // 月运
  YEARLY = 'yearly',            // 年运
}

/** 报告状态 */
export enum ReportStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/** 导出格式 */
export enum ExportFormat {
  HTML = 'html',
  PDF = 'pdf',
  MARKDOWN = 'markdown',
}

/** 报告输入参数 */
export interface ReportInput {
  /** 排盘数据（JSON 字符串，包含八字/五行/九宫等计算结果） */
  baziData?: Record<string, any>;
  /** 用户问题或关注点 */
  userQuery?: string;
  /** 额外上下文 */
  context?: Record<string, any>;
}

/** 报告章节 */
export interface ReportSection {
  title: string;
  content: string;
  order: number;
  type?: 'text' | 'table' | 'chart' | 'warning' | 'tip';
}

/** 导出记录 */
export interface ExportRecord {
  format: ExportFormat;
  url: string;
  fileSize: number;
  createdAt: Date;
  downloadedAt?: Date;
}

/** Token 消耗 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelVersion: string;
}

@Schema({ timestamps: true, collection: 'v2_reports' })
export class Report {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: Object.values(ReportType) })
  type: string;

  @Prop({ required: true, enum: Object.values(ReportStatus), default: ReportStatus.PENDING })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'ReportQueue' })
  jobId?: Types.ObjectId;

  @Prop({ type: Object })
  input: ReportInput;

  @Prop({ type: Array })
  sections: ReportSection[];

  @Prop({ type: Array, default: [] })
  exports: ExportRecord[];

  @Prop({ type: Object })
  tokenUsage?: TokenUsage;

  @Prop({ default: 0 })
  processingTime: number;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 1 })
  version: number;

  @Prop()
  aiModelVersion?: string;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isStarred: boolean;

  @Prop()
  promptId?: string;

  @Prop()
  promptVersion?: string;

  @Prop()
  provider?: string;

  @Prop()
  model?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Indexes
ReportSchema.index({ userId: 1, createdAt: -1 });
ReportSchema.index({ userId: 1, type: 1 });
ReportSchema.index({ userId: 1, status: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });
