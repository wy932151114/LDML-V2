/* =========================================================================
 * AIRuntimeService — AI 运行时核心服务
 *
 * Orchestrates the AI runtime: routing, caching, logging, configuration
 * and health monitoring. This is the primary entry point for all AI
 * inference calls in the system.
 * ========================================================================= */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AIRouter } from './router/ai-router';
import { AiCacheService } from './cache/ai-cache.service';
import { AiConfigService } from './config/ai-config.service';
import { AiLogService } from './logs/ai-log.service';
import { ProviderFactory } from './provider/provider.factory';
import {
  GenerateOptions,
  GenerateResult,
  StreamChunk,
  ProviderHealth,
  ProviderModel,
} from './interface/ai-provider.interface';
import { RuntimeConfig } from './interface/ai-config.interface';

@Injectable()
export class AIRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(AIRuntimeService.name);

  constructor(
    private readonly aiRouter: AIRouter,
    private readonly aiCache: AiCacheService,
    private readonly aiConfig: AiConfigService,
    private readonly aiLog: AiLogService,
    private readonly providerFactory: ProviderFactory,
  ) {}

  async onModuleInit() {
    // Seed built-in models in MongoDB
    await this.seedModels();
    // NOTE: Provider configuration is now managed by ProviderConfigModule
    // (DB-backed, encrypted). ProviderFactory is refreshed automatically
    // by ProviderConfigService.onModuleInit() and on each config update.
    this.logger.log('AIRuntimeService initialised');
  }

  /* -----------------------------------------------------------------------
   * Generation (non-streaming, with caching)
   * ----------------------------------------------------------------------- */

  /**
   * Generate AI content with caching, logging, and routing.
   */
  async generate(
    userId: string,
    options: {
      model?: string;
      provider?: string;
      messages: { role: string; content: string }[];
      temperature?: number;
      topP?: number;
      maxTokens?: number;
    },
  ): Promise<GenerateResult> {
    const start = Date.now();
    const config = this.aiConfig.getRuntimeConfig();
    const temperature = options.temperature ?? config.temperature;
    const model = options.model ?? config.defaultModel;
    const provider = options.provider ?? config.defaultProvider;

    // Build cache key from messages content
    const promptText = options.messages.map((m) => m.content).join('\n');
    const cacheKey = this.aiCache.generateCacheKey(promptText, model, temperature);

    // Try cache
    const cached = await this.aiCache.get(cacheKey);
    if (cached !== null) {
      const duration = Date.now() - start;
      // Log cache hit
      await this.aiLog.logAI({
        userId,
        provider,
        model,
        type: 'generate',
        duration,
        cacheHit: true,
        status: 'success',
        metadata: { cached: true },
      });

      return {
        content: cached,
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model,
        provider,
        duration,
      };
    }

    // Prepare router options
    const routerOptions: GenerateOptions = {
      model,
      messages: options.messages as any,
      temperature,
      topP: options.topP ?? config.topP,
      maxTokens: options.maxTokens ?? config.maxTokens,
    };

    if (options.provider) {
      routerOptions.provider = options.provider;
    }

    // Generate via router
    try {
      const result = await this.aiRouter.generate(routerOptions);
      const duration = Date.now() - start;

      // Cache the result
      await this.aiCache.set(cacheKey, result.content, config.cacheTTL);

      // Estimate cost (rough: input * price + output * price)
      const modelConfig = await this.aiConfig.getModelByProvider(result.provider, result.model);
      const estimatedCost = modelConfig
        ? (result.usage.promptTokens * modelConfig.price.input +
            result.usage.completionTokens * modelConfig.price.output) /
          1_000_000
        : 0;

      // Log the AI call
      await this.aiLog.logAI({
        userId,
        provider: result.provider,
        model: result.model,
        type: 'generate',
        duration,
        tokenUsage: result.usage,
        status: 'success',
      });

      // Log token consumption
      await this.aiLog.logToken({
        userId,
        provider: result.provider,
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        duration,
        estimatedCost,
      });

      return result;
    } catch (err: any) {
      const duration = Date.now() - start;
      await this.aiLog.logAI({
        userId,
        provider,
        model,
        type: 'generate',
        duration,
        error: err.message,
        status: 'error',
      });
      throw err;
    }
  }

  /* -----------------------------------------------------------------------
   * Streaming (no caching)
   * ----------------------------------------------------------------------- */

  /**
   * Stream AI content. No caching for streaming responses.
   */
  async *stream(
    userId: string,
    options: {
      model?: string;
      provider?: string;
      messages: { role: string; content: string }[];
      temperature?: number;
      topP?: number;
      maxTokens?: number;
    },
  ): AsyncIterable<StreamChunk> {
    const start = Date.now();
    const config = this.aiConfig.getRuntimeConfig();
    const model = options.model ?? config.defaultModel;
    const provider = options.provider ?? config.defaultProvider;

    const routerOptions: GenerateOptions = {
      model,
      messages: options.messages as any,
      temperature: options.temperature ?? config.temperature,
      topP: options.topP ?? config.topP,
      maxTokens: options.maxTokens ?? config.maxTokens,
      stream: true,
    };

    if (options.provider) {
      routerOptions.provider = options.provider;
    }

    let fullContent = '';
    let finalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    try {
      for await (const chunk of this.aiRouter.stream(routerOptions)) {
        fullContent += chunk.content;
        if (chunk.usage) {
          finalUsage = chunk.usage;
        }
        yield chunk;
      }

      const duration = Date.now() - start;

      // Log the AI call for streaming
      await this.aiLog.logAI({
        userId,
        provider,
        model,
        type: 'stream',
        duration,
        tokenUsage: finalUsage,
        status: 'success',
      });

      // Estimate cost
      const modelConfig = await this.aiConfig.getModelByProvider(provider, model);
      const estimatedCost = modelConfig
        ? (finalUsage.promptTokens * modelConfig.price.input +
            finalUsage.completionTokens * modelConfig.price.output) /
          1_000_000
        : 0;

      await this.aiLog.logToken({
        userId,
        provider,
        model,
        promptTokens: finalUsage.promptTokens,
        completionTokens: finalUsage.completionTokens,
        totalTokens: finalUsage.totalTokens,
        duration,
        estimatedCost,
      });
    } catch (err: any) {
      const duration = Date.now() - start;
      await this.aiLog.logAI({
        userId,
        provider,
        model,
        type: 'stream',
        duration,
        error: err.message,
        status: 'error',
      });
      throw err;
    }
  }

  /* -----------------------------------------------------------------------
   * Health & Info
   * ----------------------------------------------------------------------- */

  /**
   * Get comprehensive health status.
   */
  async getHealth(): Promise<{
    runtime: any;
    providers: Record<string, ProviderHealth>;
    cache: any;
    config: any;
  }> {
    const [providers, cache, configRuntime] = await Promise.all([
      this.aiRouter.health(),
      this.aiCache.health(),
      Promise.resolve(this.aiConfig.getRuntimeConfig()),
    ]);

    return {
      runtime: { status: 'running', uptime: process.uptime() },
      providers,
      cache,
      config: configRuntime,
    };
  }

  /**
   * Get all available models across providers.
   */
  async getModels(): Promise<ProviderModel[]> {
    return this.aiRouter.getAvailableModels();
  }

  /**
   * Get current runtime configuration.
   */
  async getConfig(): Promise<RuntimeConfig> {
    return this.aiConfig.getRuntimeConfig();
  }

  /**
   * Update runtime configuration in memory.
   */
  async updateConfig(updates: Partial<RuntimeConfig>): Promise<RuntimeConfig> {
    const config = this.aiConfig.getRuntimeConfig();
    Object.assign(config, updates);
    // Since runtimeConfig is private, we have the service update it
    // We'll re-load and apply updates by modifying env overrides (simple approach)
    // For a full implementation, we'd update the config service's internal state

    // Reload env values then apply updates on top
    this.aiConfig.loadRuntimeConfig();
    const current = this.aiConfig.getRuntimeConfig();
    Object.assign(current, updates);

    this.logger.log(`Runtime config updated: ${JSON.stringify(updates)}`);
    return current;
  }

  /* -----------------------------------------------------------------------
   * Stats & Analytics
   * ----------------------------------------------------------------------- */

  /**
   * Get token consumption stats for a user.
   */
  async getTokenStats(userId: string): Promise<any> {
    return this.aiLog.getTokenStats(userId);
  }

  /**
   * Get stats per provider.
   */
  async getProviderStats(): Promise<any[]> {
    return this.aiLog.getProviderStats();
  }

  /* -----------------------------------------------------------------------
   * Seeding
   * ----------------------------------------------------------------------- */

  /**
   * Seed built-in model configurations.
   */
  async seedModels(): Promise<void> {
    await this.aiConfig.seedBuiltinModels();
  }
}
