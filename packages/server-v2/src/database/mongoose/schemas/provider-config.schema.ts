// ============================================================
// DZS-OS V2 — AI Provider Config Schema
// AI Provider 配置（API Key 加密存储，运行时从 DB 读取）
// ============================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProviderConfigDocument = ProviderConfig & Document;

/** 连接测试结果 */
export interface TestResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  model: string;
  error?: string;
  timestamp: string;
}

/** AI Provider 连接类型 */
export type ProviderType = 'openai-compatible' | 'gemini' | 'claude' | 'mcp';

/** AI Provider 配置 */
@Schema({ timestamps: true, collection: 'v2_provider_configs' })
export class ProviderConfig {
  /** Provider 唯一标识名（如 openai, deepseek, gemini, qwen, claude, mcp） */
  @Prop({ required: true, unique: true, index: true })
  name: string;

  /** 显示名称（如 OpenAI, DeepSeek, Gemini） */
  @Prop({ required: true })
  displayName: string;

  /** Provider 连接类型 */
  @Prop({ required: true, default: 'openai-compatible' })
  type: ProviderType;

  /** AES-256-GCM 加密后的 API Key */
  @Prop()
  apiKeyEncrypted?: string;

  /** IV（加密初始化向量，hex 编码） */
  @Prop()
  apiKeyIv?: string;

  /** Auth Tag（GCM 认证标签，hex 编码） */
  @Prop()
  apiKeyTag?: string;

  /** 自定义 Base URL */
  @Prop()
  baseUrl?: string;

  /** 默认模型 */
  @Prop()
  defaultModel?: string;

  /** 是否启用 */
  @Prop({ default: true })
  enabled: boolean;

  /** 优先级（数值越大优先） */
  @Prop({ default: 0 })
  priority: number;

  /** 请求超时（毫秒） */
  @Prop({ default: 30000 })
  timeout: number;

  /** 每分钟请求上限 */
  @Prop({ default: 60 })
  rpm: number;

  /** 每分钟 Token 上限 */
  @Prop({ default: 100000 })
  tpm: number;

  /** 最大重试次数 */
  @Prop({ default: 3 })
  maxRetries: number;

  /** 重试延迟（毫秒，基础值，指数退避） */
  @Prop({ default: 1000 })
  retryDelay: number;

  /** Organization ID（仅 OpenAI） */
  @Prop()
  organization?: string;

  /** 额外 HTTP 请求头 */
  @Prop({ type: Object, default: {} })
  extraHeaders: Record<string, string>;

  /** 是否内置（内置不可删除） */
  @Prop({ default: false })
  isBuiltin: boolean;

  /** 上次连接测试结果 */
  @Prop({ type: Object })
  lastTestResult?: TestResult;

  createdAt: Date;
  updatedAt: Date;
}

export const ProviderConfigSchema = SchemaFactory.createForClass(ProviderConfig);

// Indexes
ProviderConfigSchema.index({ enabled: 1, priority: -1 });
