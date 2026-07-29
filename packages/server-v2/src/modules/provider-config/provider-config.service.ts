// ============================================================
// DZS-OS V2 — ProviderConfigService
// AI Provider 配置管理服务（MongoDB 持久化，AES-256 加密 Key）
// AI Runtime 运行时从此服务读取 Provider 配置
// ============================================================

import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  ProviderConfig,
  ProviderConfigDocument,
  TestResult,
  ProviderType,
} from '@/database/mongoose/schemas';
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
} from '@/common/utils/provider-crypto.util';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  ProviderConfigResponseDto,
  TestConnectionResultDto,
} from './provider-config.dto';
import { ProviderFactory } from '@/modules/ai-runtime/provider/provider.factory';
import { ProviderConnectionTester } from '@/modules/ai-runtime/provider/provider-tester';

/** Typed lean document */
type ProviderConfigLean = ProviderConfig & { _id: any; __v?: number; createdAt?: any; updatedAt?: any };

@Injectable()
export class ProviderConfigService implements OnModuleInit {
  private readonly logger = new Logger(ProviderConfigService.name);

  // 已配置的 Provider 名称集合（运行时缓存，用于快速判断 isConfigured）
  private configuredProviders: Set<string> = new Set();

  constructor(
    @InjectModel(ProviderConfig.name)
    private readonly configModel: Model<ProviderConfigDocument>,
    @Inject(forwardRef(() => ProviderFactory))
    private readonly providerFactory: ProviderFactory,
    private readonly configService: ConfigService,
    private readonly connectionTester: ProviderConnectionTester,
  ) {}

  async onModuleInit() {
    await this.seedBuiltinProviders();
    await this.refreshProviderFactory();
    this.logger.log('ProviderConfigService initialised');
  }

  /* =================================================================
   * Provider 运行时配置（供 AI Runtime 调用）
   * ================================================================= */

  /**
   * 获取已启用的 Provider 配置列表（AI Runtime 调用，API Key 已解密）
   */
  async getEnabledProviderConfigs(): Promise<any[]> {
    const docs = await this.configModel
      .find({ enabled: true })
      .sort({ priority: -1 })
      .lean() as unknown as ProviderConfigLean[];
    return docs.map((doc) => this.toRuntimeData(doc));
  }

  /**
   * 获取单个 Provider 运行时配置（含解密后的 API Key）
   */
  async getProviderRuntimeConfig(name: string): Promise<any | null> {
    const doc = await this.configModel.findOne({ name }).lean() as unknown as ProviderConfigLean | null;
    if (!doc) return null;
    return this.toRuntimeData(doc);
  }

  /**
   * 检查 Provider 是否已配置有效的 API Key
   */
  isProviderConfigured(name: string): boolean {
    return this.configuredProviders.has(name);
  }

  /**
   * 刷新 ProviderFactory 的运行时配置
   * 调用时机：Provider 配置创建/更新/启停后
   */
  async refreshProviderFactory(): Promise<void> {
    const providers = await this.getEnabledProviderConfigs();
    this.configuredProviders.clear();

    for (const p of providers) {
      if (p.apiKey) {
        this.configuredProviders.add(p.name);
      }
    }

    // 通知 ProviderFactory 重新加载配置
    await this.providerFactory.reloadFromConfigService(this);
    this.logger.log(
      `ProviderFactory refreshed — ${providers.length} enabled, ${this.configuredProviders.size} with API key`,
    );
  }

  /* =================================================================
   * CRUD
   * ================================================================= */

  /** 获取所有 Provider 配置（API Key 脱敏） */
  async getAll(): Promise<ProviderConfigResponseDto[]> {
    const docs = await this.configModel.find().sort({ priority: -1 }).lean() as unknown as ProviderConfigLean[];
    return docs.map((doc) => this.toResponseDto(doc));
  }

  /** 获取单个 Provider 配置（API Key 脱敏） */
  async getByName(name: string): Promise<ProviderConfigResponseDto | null> {
    const doc = await this.configModel.findOne({ name }).lean() as unknown as ProviderConfigLean | null;
    return doc ? this.toResponseDto(doc) : null;
  }

  /** 创建 Provider 配置 */
  async create(dto: CreateProviderConfigDto): Promise<ProviderConfigResponseDto> {
    // 检查是否已存在
    const existing = await this.configModel.findOne({ name: dto.name }).lean();
    if (existing) {
      throw new Error(`Provider "${dto.name}" already exists`);
    }

    const createData: Record<string, any> = {
      name: dto.name,
      displayName: dto.displayName,
      type: dto.type || 'openai-compatible',
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      timeout: dto.timeout ?? 30000,
      rpm: dto.rpm ?? 60,
      tpm: dto.tpm ?? 100000,
      maxRetries: dto.maxRetries ?? 3,
      retryDelay: dto.retryDelay ?? 1000,
      isBuiltin: false,
    };

    if (dto.baseUrl) createData.baseUrl = dto.baseUrl;
    if (dto.defaultModel) createData.defaultModel = dto.defaultModel;
    if (dto.organization) createData.organization = dto.organization;
    if (dto.extraHeaders) createData.extraHeaders = dto.extraHeaders;

    // 加密 API Key
    if (dto.apiKey) {
      const { encrypted, iv, tag } = encryptApiKey(dto.apiKey);
      createData.apiKeyEncrypted = encrypted;
      createData.apiKeyIv = iv;
      createData.apiKeyTag = tag;
    }

    const doc = await this.configModel.create(createData);
    this.logger.log(`Created provider config: ${dto.name}`);

    // 刷新 ProviderFactory
    await this.refreshProviderFactory();

    return this.toResponseDto(doc.toObject() as any);
  }

  /** 更新 Provider 配置 */
  async update(
    name: string,
    dto: UpdateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    const existing = await this.configModel.findOne({ name }).lean();
    if (!existing) {
      throw new Error(`Provider "${name}" not found`);
    }

    const updateData: Record<string, any> = {};

    const fields: (keyof UpdateProviderConfigDto)[] = [
      'displayName', 'type', 'baseUrl', 'defaultModel',
      'enabled', 'priority', 'timeout', 'rpm', 'tpm',
      'maxRetries', 'retryDelay', 'organization', 'extraHeaders',
    ];
    for (const field of fields) {
      if ((dto as any)[field] !== undefined) {
        updateData[field] = (dto as any)[field];
      }
    }

    // 更新 API Key（如果提供了新 Key 则重新加密）
    if (dto.apiKey) {
      const { encrypted, iv, tag } = encryptApiKey(dto.apiKey);
      updateData.apiKeyEncrypted = encrypted;
      updateData.apiKeyIv = iv;
      updateData.apiKeyTag = tag;
    }

    const doc = await this.configModel
      .findOneAndUpdate({ name }, { $set: updateData }, { new: true })
      .lean() as unknown as ProviderConfigLean | null;

    if (!doc) throw new Error(`Provider "${name}" not found after update`);

    this.logger.log(`Updated provider config: ${name}`);

    // 刷新 ProviderFactory
    await this.refreshProviderFactory();

    return this.toResponseDto(doc);
  }

  /** 删除 Provider 配置（内置不可删除） */
  async delete(name: string): Promise<void> {
    const doc = await this.configModel.findOne({ name }).lean() as unknown as ProviderConfigLean | null;
    if (!doc) throw new Error(`Provider "${name}" not found`);
    if (doc.isBuiltin) {
      throw new Error(`Cannot delete built-in provider: ${name}`);
    }

    await this.configModel.findOneAndDelete({ name });
    this.logger.log(`Deleted provider config: ${name}`);

    // 刷新 ProviderFactory
    await this.refreshProviderFactory();
  }

  /* =================================================================
   * 连接测试（真实 HTTP）
   * ================================================================= */

  /**
   * 测试 Provider 连接
   * 从 DB 读取配置 → 构造临时 Provider → 发送真实请求
   */
  async testConnection(name: string): Promise<TestConnectionResultDto> {
    const doc = await this.configModel.findOne({ name }).lean() as unknown as ProviderConfigLean | null;
    if (!doc) throw new Error(`Provider "${name}" not found`);

    const apiKey = doc.apiKeyEncrypted && doc.apiKeyIv && doc.apiKeyTag
      ? decryptApiKey(doc.apiKeyEncrypted, doc.apiKeyIv, doc.apiKeyTag)
      : '';

    if (!apiKey) {
      return {
        provider: name,
        status: 'unhealthy',
        latency: 0,
        model: 'N/A',
        error: 'No API Key configured',
        timestamp: new Date().toISOString(),
      };
    }

    // 用真实 Provider 做连接测试
    const start = Date.now();
    const result = await this.connectionTester.testProvider({
      provider: name,
      type: (doc.type || 'openai-compatible') as ProviderType,
      apiKey,
      baseUrl: doc.baseUrl,
      model: doc.defaultModel || this.getDefaultModel(name),
    });

    const duration = Date.now() - start;

    // 保存测试结果到 DB
    const testResult: TestResult = {
      status: result.status,
      latency: duration,
      model: result.model,
      error: result.error,
      timestamp: new Date().toISOString(),
    };

    await this.configModel.findOneAndUpdate(
      { name },
      { $set: { lastTestResult: testResult } },
    );

    return { ...result, latency: duration, provider: name, timestamp: testResult.timestamp };
  }

  /* =================================================================
   * 内置 Provider 种子数据
   * ================================================================= */

  private async seedBuiltinProviders(): Promise<void> {
    const builtins = this.getBuiltinProviderDefinitions();

    for (const bp of builtins) {
      const existing = await this.configModel.findOne({ name: bp.name }).lean();
      if (!existing) {
        await this.configModel.create({
          ...bp,
          isBuiltin: true,
        });
        this.logger.log(`Seeded built-in provider: ${bp.name}`);
      }
    }
  }

  /* =================================================================
   * 内部工具
   * ================================================================= */

  private toResponseDto(doc: ProviderConfigLean): ProviderConfigResponseDto {
    return {
      name: doc.name,
      displayName: doc.displayName,
      type: doc.type || 'openai-compatible',
      apiKeyMasked: maskApiKey(doc.apiKeyEncrypted, doc.apiKeyIv, doc.apiKeyTag),
      baseUrl: doc.baseUrl,
      defaultModel: doc.defaultModel,
      enabled: doc.enabled ?? true,
      priority: doc.priority ?? 0,
      timeout: doc.timeout ?? 30000,
      rpm: doc.rpm ?? 60,
      tpm: doc.tpm ?? 100000,
      maxRetries: doc.maxRetries ?? 3,
      retryDelay: doc.retryDelay ?? 1000,
      organization: doc.organization,
      extraHeaders: doc.extraHeaders || {},
      isBuiltin: doc.isBuiltin ?? false,
      lastTestResult: doc.lastTestResult,
      hasApiKey: !!(doc.apiKeyEncrypted && doc.apiKeyIv && doc.apiKeyTag),
      createdAt: doc.createdAt?.toISOString?.() || doc.createdAt || '',
      updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt || '',
    };
  }

  private toRuntimeData(doc: ProviderConfigLean): any {
    let apiKey = '';
    if (doc.apiKeyEncrypted && doc.apiKeyIv && doc.apiKeyTag) {
      try {
        apiKey = decryptApiKey(doc.apiKeyEncrypted, doc.apiKeyIv, doc.apiKeyTag);
      } catch {
        this.logger.error(`Failed to decrypt API key for ${doc.name}`);
      }
    }

    return {
      name: doc.name,
      displayName: doc.displayName,
      type: doc.type || 'openai-compatible',
      apiKey,
      baseUrl: doc.baseUrl,
      defaultModel: doc.defaultModel,
      enabled: doc.enabled ?? true,
      priority: doc.priority ?? 0,
      timeout: doc.timeout ?? 30000,
      rpm: doc.rpm ?? 60,
      tpm: doc.tpm ?? 100000,
      maxRetries: doc.maxRetries ?? 3,
      retryDelay: doc.retryDelay ?? 1000,
      organization: doc.organization,
      extraHeaders: doc.extraHeaders || {},
    };
  }

  private getDefaultModel(providerName: string): string {
    const map: Record<string, string> = {
      openai: 'gpt-4o',
      deepseek: 'deepseek-chat',
      gemini: 'gemini-2.0-flash',
      qwen: 'qwen-max',
      claude: 'claude-sonnet-4',
      mcp: 'default',
    };
    return map[providerName] || 'default';
  }

  private getBuiltinProviderDefinitions(): Array<{
    name: string;
    displayName: string;
    type: ProviderType;
    baseUrl: string;
    defaultModel: string;
    enabled: boolean;
    priority: number;
    timeout: number;
    rpm: number;
    tpm: number;
    maxRetries: number;
    retryDelay: number;
  }> {
    return [
      {
        name: 'openai',
        displayName: 'OpenAI',
        type: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o',
        enabled: false,
        priority: 100,
        timeout: 60000,
        rpm: 500,
        tpm: 200000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      {
        name: 'deepseek',
        displayName: 'DeepSeek',
        type: 'openai-compatible',
        baseUrl: 'https://api.deepseek.com',
        defaultModel: 'deepseek-v4-flash',
        enabled: false,
        priority: 90,
        timeout: 60000,
        rpm: 500,
        tpm: 200000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      {
        name: 'gemini',
        displayName: 'Gemini',
        type: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        defaultModel: 'gemini-2.0-flash',
        enabled: false,
        priority: 80,
        timeout: 60000,
        rpm: 1000,
        tpm: 400000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      {
        name: 'qwen',
        displayName: 'Qwen',
        type: 'openai-compatible',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultModel: 'qwen-max',
        enabled: false,
        priority: 70,
        timeout: 60000,
        rpm: 500,
        tpm: 150000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      {
        name: 'claude',
        displayName: 'Claude',
        type: 'claude',
        baseUrl: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-sonnet-4',
        enabled: false,
        priority: 60,
        timeout: 90000,
        rpm: 200,
        tpm: 100000,
        maxRetries: 3,
        retryDelay: 2000,
      },
      {
        name: 'mcp',
        displayName: 'MCP',
        type: 'mcp',
        baseUrl: '',
        defaultModel: 'default',
        enabled: false,
        priority: 50,
        timeout: 30000,
        rpm: 60,
        tpm: 50000,
        maxRetries: 2,
        retryDelay: 1000,
      },
    ];
  }
}
