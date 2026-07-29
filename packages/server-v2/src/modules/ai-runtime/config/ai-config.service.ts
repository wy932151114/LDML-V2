/* =========================================================================
 * AiConfigService — AI 运行时配置服务
 *
 * Manages AI model configurations stored in MongoDB and runtime settings
 * from environment variables. Provides seed data for built-in models.
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  AIModelConfig,
} from '@/database/mongoose/schemas';
import { AIModelConfigDocument } from '@/database/mongoose/schemas/ai-model-config.schema';
import {
  AIModelConfigData,
  RuntimeConfig,
  DEFAULT_RUNTIME_CONFIG,
} from '../interface/ai-config.interface';

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);
  private runtimeConfig: RuntimeConfig = { ...DEFAULT_RUNTIME_CONFIG };

  constructor(
    @InjectModel(AIModelConfig.name)
    private readonly modelConfigModel: Model<AIModelConfigDocument>,
    private readonly configService: ConfigService,
  ) {
    this.loadRuntimeConfig();
  }

  /* -----------------------------------------------------------------------
   * Runtime config (in-memory, from env)
   * ----------------------------------------------------------------------- */

  /**
   * Load runtime configuration from environment variables, overriding defaults.
   */
  loadRuntimeConfig(): void {
    this.runtimeConfig = {
      defaultProvider:
        this.configService.get<string>('AI_DEFAULT_PROVIDER') ??
        DEFAULT_RUNTIME_CONFIG.defaultProvider,
      defaultModel:
        this.configService.get<string>('AI_DEFAULT_MODEL') ??
        DEFAULT_RUNTIME_CONFIG.defaultModel,
      temperature:
        this.configService.get<string>('AI_TEMPERATURE') !== undefined
          ? Number(this.configService.get<string>('AI_TEMPERATURE'))
          : DEFAULT_RUNTIME_CONFIG.temperature,
      topP:
        this.configService.get<string>('AI_TOP_P') !== undefined
          ? Number(this.configService.get<string>('AI_TOP_P'))
          : DEFAULT_RUNTIME_CONFIG.topP,
      maxTokens:
        this.configService.get<string>('AI_MAX_TOKENS') !== undefined
          ? Number(this.configService.get<string>('AI_MAX_TOKENS'))
          : DEFAULT_RUNTIME_CONFIG.maxTokens,
      cacheTTL:
        this.configService.get<string>('AI_CACHE_TTL') !== undefined
          ? Number(this.configService.get<string>('AI_CACHE_TTL'))
          : DEFAULT_RUNTIME_CONFIG.cacheTTL,
      retryCount:
        this.configService.get<string>('AI_RETRY_COUNT') !== undefined
          ? Number(this.configService.get<string>('AI_RETRY_COUNT'))
          : DEFAULT_RUNTIME_CONFIG.retryCount,
      retryDelay:
        this.configService.get<string>('AI_RETRY_DELAY') !== undefined
          ? Number(this.configService.get<string>('AI_RETRY_DELAY'))
          : DEFAULT_RUNTIME_CONFIG.retryDelay,
      fallbackEnabled:
        this.configService.get<string>('AI_FALLBACK_ENABLED') !== undefined
          ? this.configService.get<string>('AI_FALLBACK_ENABLED') === 'true'
          : DEFAULT_RUNTIME_CONFIG.fallbackEnabled,
    };
  }

  /**
   * Return the current runtime config.
   */
  getRuntimeConfig(): RuntimeConfig {
    return { ...this.runtimeConfig };
  }

  /* -----------------------------------------------------------------------
   * Model config CRUD (MongoDB)
   * ----------------------------------------------------------------------- */

  /**
   * Get all model configurations.
   */
  async getModelConfigs(): Promise<AIModelConfigData[]> {
    const docs = await this.modelConfigModel.find().sort({ priority: -1 }).lean();
    return docs.map(this.toData);
  }

  /**
   * Get only enabled models, sorted by priority descending.
   */
  async getEnabledModels(): Promise<AIModelConfigData[]> {
    const docs = await this.modelConfigModel
      .find({ enabled: true })
      .sort({ priority: -1 })
      .lean();
    return docs.map(this.toData);
  }

  /**
   * Get a model config by provider and optional model name.
   */
  async getModelByProvider(
    provider: string,
    model?: string,
  ): Promise<AIModelConfigData | null> {
    const filter: Record<string, any> = { provider };
    if (model) filter.model = model;
    const doc = await this.modelConfigModel.findOne(filter).lean();
    return doc ? this.toData(doc as Record<string, any>) : null;
  }

  /**
   * Create or update a model configuration.
   */
  async upsertModelConfig(
    data: Partial<AIModelConfigData>,
  ): Promise<AIModelConfigData> {
    const filter: Record<string, any> = {};
    if (data.id) {
      filter._id = data.id;
    } else {
      filter.provider = data.provider;
      filter.model = data.model;
    }

    const doc = await this.modelConfigModel
      .findOneAndUpdate(filter, { $set: data }, { upsert: true, new: true })
      .lean();

    this.logger.log(`Upserted model config: ${data.provider}/${data.model}`);
    return this.toData(doc as Record<string, any>);
  }

  /**
   * Toggle a model's enabled state.
   */
  async toggleModel(id: string, enabled: boolean): Promise<void> {
    const result = await this.modelConfigModel.findByIdAndUpdate(id, { enabled });
    if (!result) {
      throw new Error(`Model config not found: ${id}`);
    }
    this.logger.log(`Toggled model ${id} enabled=${enabled}`);
  }

  /**
   * Delete a model configuration.
   * Built-in models cannot be deleted.
   */
  async deleteModelConfig(id: string): Promise<void> {
    const doc = await this.modelConfigModel.findById(id);
    if (!doc) {
      throw new Error(`Model config not found: ${id}`);
    }
    if (doc.isBuiltin) {
      throw new Error(`Cannot delete built-in model config: ${id}`);
    }
    await this.modelConfigModel.findByIdAndDelete(id);
    this.logger.log(`Deleted model config: ${id}`);
  }

  /* -----------------------------------------------------------------------
   * Seed built-in models
   * ----------------------------------------------------------------------- */

  /**
   * Seed default model configurations for all providers if they don't exist.
   */
  async seedBuiltinModels(): Promise<void> {
    const builtinModels: Array<{
      provider: string;
      model: string;
      displayName: string;
      enabled: boolean;
      priority: number;
      price: { input: number; output: number };
      rpm: number;
      tpm: number;
      timeout: number;
      maxTokens: number;
      temperature: number;
      topP: number;
      tags: string[];
    }> = [
      {
        provider: 'openai',
        model: 'gpt-4o',
        displayName: 'OpenAI GPT-4o',
        enabled: true,
        priority: 100,
        price: { input: 2.5, output: 10 },
        rpm: 500,
        tpm: 200000,
        timeout: 60000,
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        tags: ['vision', 'function-calling'],
      },
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        displayName: 'OpenAI GPT-4o Mini',
        enabled: true,
        priority: 90,
        price: { input: 0.15, output: 0.6 },
        rpm: 2000,
        tpm: 500000,
        timeout: 60000,
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        tags: ['vision', 'function-calling', 'fast'],
      },
      {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        enabled: true,
        priority: 80,
        price: { input: 0.1, output: 0.4 },
        rpm: 1000,
        tpm: 400000,
        timeout: 60000,
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        tags: ['fast', 'multimodal'],
      },
      {
        provider: 'deepseek',
        model: 'deepseek-chat',
        displayName: 'DeepSeek Chat',
        enabled: true,
        priority: 70,
        price: { input: 0.14, output: 0.28 },
        rpm: 500,
        tpm: 200000,
        timeout: 60000,
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        tags: ['coding', 'cost-effective'],
      },
      {
        provider: 'qwen',
        model: 'qwen-max',
        displayName: 'Qwen Max',
        enabled: true,
        priority: 60,
        price: { input: 0.8, output: 2.0 },
        rpm: 500,
        tpm: 150000,
        timeout: 60000,
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        tags: ['chinese', 'long-context'],
      },
      {
        provider: 'claude',
        model: 'claude-sonnet-4',
        displayName: 'Claude Sonnet 4',
        enabled: false,
        priority: 50,
        price: { input: 3.0, output: 15.0 },
        rpm: 200,
        tpm: 100000,
        timeout: 90000,
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        tags: ['reasoning', 'safety'],
      },
    ];

    for (const model of builtinModels) {
      const existing = await this.modelConfigModel.findOne({
        provider: model.provider,
        model: model.model,
      });

      if (!existing) {
        await this.modelConfigModel.create({
          ...model,
          isBuiltin: true,
          version: 1,
        });
        this.logger.log(`Seeded built-in model: ${model.provider}/${model.model}`);
      }
    }
  }

  /* -----------------------------------------------------------------------
   * Internal helpers
   * ----------------------------------------------------------------------- */

  private toData(doc: Record<string, any>): AIModelConfigData {
    return {
      id: doc._id?.toString(),
      provider: doc.provider,
      model: doc.model,
      displayName: doc.displayName ?? '',
      enabled: doc.enabled ?? true,
      priority: doc.priority ?? 0,
      price: doc.price ?? { input: 0, output: 0 },
      rpm: doc.rpm ?? 60,
      tpm: doc.tpm ?? 100000,
      timeout: doc.timeout ?? 30000,
      maxTokens: doc.maxTokens ?? 4096,
      temperature: doc.temperature ?? 0.7,
      topP: doc.topP ?? 0.9,
      tags: doc.tags ?? [],
      isBuiltin: doc.isBuiltin ?? false,
      version: doc.version ?? 1,
    };
  }
}
