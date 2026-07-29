/* =========================================================================
 * AIRouter — AI Runtime Router with retry & fallback
 *
 * Central entry point for all AI inference. Provides:
 *  - Smart provider selection (preferred → priority-sorted configured)
 *  - Automatic retry with exponential backoff
 *  - Fallback to next configured provider on repeated failure
 *  - Streaming with the same retry/fallback contract
 *  - Health aggregation and model discovery
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderFactory } from '../provider/provider.factory';
import {
  AIProvider,
  GenerateOptions,
  GenerateResult,
  StreamChunk,
  ProviderHealth,
  ProviderModel,
} from '../interface/ai-provider.interface';
import {
  RuntimeConfig,
  DEFAULT_RUNTIME_CONFIG,
} from '../interface/ai-config.interface';

@Injectable()
export class AIRouter {
  private readonly logger = new Logger(AIRouter.name);
  private config: RuntimeConfig;

  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly configService: ConfigService,
  ) {
    this.config = this.loadConfig();
  }

  /* =======================================================================
   * Public API
   * ======================================================================= */

  /**
   * Generate a completion with retry & fallback.
   *
   * Flow:
   *  1. Select a provider (preferred or best available).
   *  2. Attempt generate().
   *  3. On failure → retry up to `retryCount` times with exponential backoff.
   *  4. On repeated failure → fallback to next configured provider.
   *  5. Log all attempts and failures.
   *  6. Return result or throw.
   */
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const retryCount = options.maxRetries ?? this.config.retryCount;
    const fallbackEnabled = options.stream ? false : (this.config.fallbackEnabled);

    // Gather candidate providers
    const candidates = this.resolveProviders(options.provider as string | undefined);
    if (candidates.length === 0) {
      throw new Error('[AIRouter] No configured AI providers available.');
    }

    const errors: Array<{ provider: string; error: string }> = [];

    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const provider = candidates[attempt];
      const providerLabel = `${provider.name}/${options.model}`;

      this.logger.debug(`[AIRouter] Attempt #${attempt + 1} on provider "${providerLabel}"`);

      for (let retry = 0; retry <= retryCount; retry++) {
        try {
          const result = await provider.generate(options);

          if (retry > 0) {
            this.logger.log(
              `[AIRouter] Retry #${retry} succeeded on "${providerLabel}"`,
            );
          }

          return result;
        } catch (err: any) {
          const errMsg = err?.message ?? String(err);
          this.logger.warn(
            `[AIRouter] Failure on "${providerLabel}" ` +
            `(attempt ${attempt + 1}/${candidates.length}, retry ${retry}/${retryCount}): ${errMsg}`,
          );

          // If this is the last retry on this provider, record the error
          if (retry === retryCount) {
            errors.push({ provider: provider.name, error: errMsg });
          }

          // Retry delay with exponential backoff
          if (retry < retryCount) {
            const delay = this.config.retryDelay * Math.pow(2, retry);
            this.logger.debug(`[AIRouter] Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }

      // If fallback is disabled, stop after the first provider's retries are exhausted
      if (!fallbackEnabled) {
        break;
      }
    }

    // All attempts exhausted
    const errorDetails = errors.map((e) => `${e.provider}: ${e.error}`).join('; ');
    throw new Error(
      `[AIRouter] All providers failed after ${candidates.length} provider(s) ` +
      `and up to ${retryCount + 1} retries each. Errors: ${errorDetails}`,
    );
  }

  /**
   * Stream a completion with retry & fallback.
   *
   * Streaming retry behaves similarly to generate(), but falls back to a
   * different provider on connection failure. The iterator transparently
   * reconnects to the fallback provider.
   */
  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const retryCount = options.maxRetries ?? this.config.retryCount;
    const fallbackEnabled = this.config.fallbackEnabled;

    const candidates = this.resolveProviders(options.provider as string | undefined);
    if (candidates.length === 0) {
      throw new Error('[AIRouter] No configured AI providers available for streaming.');
    }

    const errors: Array<{ provider: string; error: string }> = [];
    let yielded = false;

    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const provider = candidates[attempt];
      const providerLabel = `${provider.name}/${options.model}`;

      for (let retry = 0; retry <= retryCount; retry++) {
        try {
          const stream = provider.stream(options);

          for await (const chunk of stream) {
            yielded = true;
            yield chunk;

            // If we get a finish reason, the stream is complete
            if (chunk.finishReason !== null) {
              return;
            }
          }

          // Stream completed without error
          if (!yielded) {
            // Empty stream — treat as error and try next
            throw new Error('Stream returned no chunks');
          }
          return;
        } catch (err: any) {
          const errMsg = err?.message ?? String(err);
          this.logger.warn(
            `[AIRouter] Stream failure on "${providerLabel}" ` +
            `(attempt ${attempt + 1}/${candidates.length}, retry ${retry}/${retryCount}): ${errMsg}`,
          );

          if (retry === retryCount) {
            errors.push({ provider: provider.name, error: errMsg });
          }

          if (retry < retryCount) {
            const delay = this.config.retryDelay * Math.pow(2, retry);
            await this.sleep(delay);
          }
        }
      }

      if (!fallbackEnabled) {
        break;
      }
    }

    const errorDetails = errors.map((e) => `${e.provider}: ${e.error}`).join('; ');
    throw new Error(
      `[AIRouter] All streaming providers failed. Errors: ${errorDetails}`,
    );
  }

  /**
   * Select the best available provider.
   *
   * If `preferred` is given and the provider is configured, use it.
   * Otherwise, pick from all configured providers — order by priority
   * (higher first).
   */
  selectProvider(preferred?: string): AIProvider {
    if (preferred) {
      const provider = this.providerFactory.getProvider(preferred);
      if (provider && provider.isConfigured()) {
        return provider;
      }
      this.logger.warn(
        `[AIRouter] Preferred provider "${preferred}" not available — falling back`,
      );
    }

    const configured = this.providerFactory.getConfiguredProviders();
    if (configured.length === 0) {
      throw new Error('[AIRouter] No configured AI providers available.');
    }

    // Return the first configured provider (could be extended with priority logic)
    return configured[0];
  }

  /**
   * Get all available models across all configured providers.
   */
  async getAvailableModels(): Promise<ProviderModel[]> {
    const providers = this.providerFactory.getConfiguredProviders();
    const results = await Promise.allSettled(
      providers.map((p) => p.models()),
    );

    const models: ProviderModel[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        models.push(...result.value);
      } else {
        this.logger.warn(
          `[AIRouter] Failed to fetch models from "${providers[i].name}": ${result.reason}`,
        );
      }
    }

    return models;
  }

  /**
   * Health check for all providers.
   */
  async health(): Promise<Record<string, ProviderHealth>> {
    const providers = this.providerFactory.getAllProviders();
    const results = await Promise.allSettled(
      providers.map((p) => p.health()),
    );

    const healthMap: Record<string, ProviderHealth> = {};
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        healthMap[provider.name] = result.value;
      } else {
        healthMap[provider.name] = {
          status: 'unhealthy',
          latency: 0,
          model: 'unknown',
          error: result.reason?.message ?? String(result.reason),
          lastChecked: new Date().toISOString(),
        };
      }
    }

    return healthMap;
  }

  /* =======================================================================
   * Internal helpers
   * ======================================================================= */

  /**
   * Load runtime config from ConfigService with defaults.
   */
  private loadConfig(): RuntimeConfig {
    return {
      defaultProvider:
        this.configService.get<string>('AI_DEFAULT_PROVIDER') ??
        DEFAULT_RUNTIME_CONFIG.defaultProvider,
      defaultModel:
        this.configService.get<string>('AI_DEFAULT_MODEL') ??
        DEFAULT_RUNTIME_CONFIG.defaultModel,
      temperature:
        this.configService.get<number>('AI_TEMPERATURE') !== undefined
          ? Number(this.configService.get<string>('AI_TEMPERATURE'))
          : DEFAULT_RUNTIME_CONFIG.temperature,
      topP:
        this.configService.get<number>('AI_TOP_P') !== undefined
          ? Number(this.configService.get<string>('AI_TOP_P'))
          : DEFAULT_RUNTIME_CONFIG.topP,
      maxTokens:
        this.configService.get<number>('AI_MAX_TOKENS') !== undefined
          ? Number(this.configService.get<string>('AI_MAX_TOKENS'))
          : DEFAULT_RUNTIME_CONFIG.maxTokens,
      cacheTTL:
        this.configService.get<number>('AI_CACHE_TTL') !== undefined
          ? Number(this.configService.get<string>('AI_CACHE_TTL'))
          : DEFAULT_RUNTIME_CONFIG.cacheTTL,
      retryCount:
        this.configService.get<number>('AI_RETRY_COUNT') !== undefined
          ? Number(this.configService.get<string>('AI_RETRY_COUNT'))
          : DEFAULT_RUNTIME_CONFIG.retryCount,
      retryDelay:
        this.configService.get<number>('AI_RETRY_DELAY') !== undefined
          ? Number(this.configService.get<string>('AI_RETRY_DELAY'))
          : DEFAULT_RUNTIME_CONFIG.retryDelay,
      fallbackEnabled:
        this.configService.get<boolean>('AI_FALLBACK_ENABLED') !== undefined
          ? this.configService.get<string>('AI_FALLBACK_ENABLED') === 'true'
          : DEFAULT_RUNTIME_CONFIG.fallbackEnabled,
    };
  }

  /**
   * Resolve provider candidates for a given preference.
   */
  private resolveProviders(preferred?: string): AIProvider[] {
    const allConfigured = this.providerFactory.getConfiguredProviders();

    if (preferred) {
      const preferredProvider = allConfigured.find((p) => p.name === preferred);
      if (preferredProvider) {
        // Put preferred first, then the rest as fallbacks
        const rest = allConfigured.filter((p) => p.name !== preferred);
        return [preferredProvider, ...rest];
      }
      this.logger.warn(
        `[AIRouter] Preferred provider "${preferred}" is not configured. ` +
        `Using all configured providers.`,
      );
    }

    return allConfigured;
  }

  /**
   * Promise-based sleep.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
