/* =========================================================================
 * ProviderFactory — AI Provider registry & factory
 *
 * Manages the lifecycle of all AI providers. Reads API keys from
 * ProviderConfigService (DB-backed, encrypted) instead of environment
 * variables. Falls back to env vars if DB config is not available.
 * ========================================================================= */

import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AIProviderConfig } from '../interface/ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { QwenProvider } from './qwen.provider';
import { ClaudeProvider } from './claude.provider';
import { MCPProvider } from './mcp.provider';

// Forward reference to avoid circular dependency
export interface IProviderConfigService {
  getEnabledProviderConfigs(): Promise<any[]>;
  getProviderRuntimeConfig(name: string): Promise<any | null>;
  isProviderConfigured(name: string): boolean;
}

@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);
  private providers: Map<string, AIProvider> = new Map();
  private initialised = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(forwardRef(() => 'ProviderConfigService'))
    private providerConfigService?: IProviderConfigService,
  ) {
    // Register provider instances at construction time
    this.registerInstance(new OpenAIProvider());
    this.registerInstance(new GeminiProvider());
    this.registerInstance(new DeepSeekProvider());
    this.registerInstance(new QwenProvider());
    this.registerInstance(new ClaudeProvider());
    this.registerInstance(new MCPProvider());
  }

  /* -----------------------------------------------------------------------
   * Public API
   * ----------------------------------------------------------------------- */

  /**
   * Register a provider instance (legacy, for manual registration).
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    this.logger.log(`Registered provider: ${provider.name} (${provider.displayName})`);
  }

  getProvider(name: string): AIProvider | null {
    return this.providers.get(name) ?? null;
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getConfiguredProviders(): AIProvider[] {
    return this.getAllProviders().filter((p) => p.isConfigured());
  }

  /* -----------------------------------------------------------------------
   * DB-backed configuration reload
   * ----------------------------------------------------------------------- */

  /**
   * Reload all provider configurations from ProviderConfigService (DB).
   * Called by ProviderConfigService after any config change.
   * Each provider's configure() is called with the settings from DB.
   */
  async reloadFromConfigService(providerConfigService: IProviderConfigService): Promise<void> {
    this.providerConfigService = providerConfigService;

    try {
      const configs = await providerConfigService.getEnabledProviderConfigs();
      let configuredCount = 0;

      for (const cfg of configs) {
        const provider = this.providers.get(cfg.name);
        if (!provider) {
          this.logger.warn(`Unknown provider in DB config: ${cfg.name}`);
          continue;
        }

        if (cfg.apiKey) {
          const providerCfg: AIProviderConfig = {
            apiKey: cfg.apiKey,
            ...(cfg.baseUrl ? { baseUrl: cfg.baseUrl } : {}),
            ...(cfg.timeout ? { timeout: cfg.timeout } : {}),
            ...(cfg.maxRetries ? { maxRetries: cfg.maxRetries } : {}),
            ...(cfg.organization ? { organization: cfg.organization } : {}),
            ...(cfg.defaultModel ? { model: cfg.defaultModel } : {}),
            ...(cfg.extraHeaders ? { extraHeaders: cfg.extraHeaders } : {}),
          };

          provider.configure(providerCfg);
          configuredCount++;
          this.logger.debug(
            `Configured "${cfg.name}" from DB (${cfg.apiKey.slice(0, 8)}...${cfg.apiKey.slice(-4)})`,
          );
        } else {
          // Provider exists but has no API key — still register it as unconfigured
          this.logger.warn(`Provider "${cfg.name}" has no API key configured`);
        }
      }

      this.logger.log(
        `Provider factory reloaded — ${this.providers.size} providers registered, ` +
        `${configuredCount} configured with API keys`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to reload provider configs from DB: ${err.message}. ` +
        `Falling back to environment variables.`,
      );
      this.registerBuiltins();
    }

    this.initialised = true;
  }

  /* -----------------------------------------------------------------------
   * Factory — create a single provider by name
   * ----------------------------------------------------------------------- */

  createProvider(name: string): AIProvider {
    switch (name) {
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'deepseek':
        return new DeepSeekProvider();
      case 'qwen':
        return new QwenProvider();
      case 'claude':
        return new ClaudeProvider();
      case 'mcp':
        return new MCPProvider();
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }

  /* -----------------------------------------------------------------------
   * Legacy env-based registration (fallback only)
   *
   * Used when DB backend is unavailable (first startup before seeding,
   * or DB connection failure).
   * ----------------------------------------------------------------------- */

  registerBuiltins(): void {
    if (this.initialised) {
      this.logger.warn('registerBuiltins() called more than once — skipping');
      return;
    }

    const envKeyMap: Array<{
      provider: AIProvider;
      envKey: string;
      extraConfig?: Record<string, any>;
    }> = [
      { provider: new OpenAIProvider(), envKey: 'OPENAI_API_KEY' },
      { provider: new GeminiProvider(), envKey: 'GEMINI_API_KEY' },
      { provider: new DeepSeekProvider(), envKey: 'DEEPSEEK_API_KEY' },
      { provider: new QwenProvider(), envKey: 'QWEN_API_KEY' },
      { provider: new ClaudeProvider(), envKey: 'CLAUDE_API_KEY' },
      { provider: new MCPProvider(), envKey: 'MCP_ENDPOINT', extraConfig: { endpoint: true } },
    ];

    for (const { provider, envKey, extraConfig } of envKeyMap) {
      const apiKey = this.configService.get<string>(envKey) || process.env[envKey] || '';
      const baseUrl = this.configService.get<string>(`${provider.name.toUpperCase()}_BASE_URL`) || undefined;
      const timeout = this.configService.get<number>(`${provider.name.toUpperCase()}_TIMEOUT`) || undefined;

      if (apiKey) {
        const config: AIProviderConfig = {
          apiKey,
          ...(baseUrl ? { baseUrl } : {}),
          ...(timeout ? { timeout } : {}),
          ...extraConfig,
        };

        provider.configure(config);
        this.logger.log(
          `Configured provider "${provider.name}" from env ${envKey}` +
          `(${apiKey.slice(0, 8)}...${apiKey.slice(-4)})`,
        );
      } else {
        this.logger.warn(
          `Provider "${provider.name}" skipped — ${envKey} not set in env.`,
        );
      }

      this.register(provider);
    }

    this.initialised = true;
    this.logger.log(
      `Provider factory initialised from env — ${this.getAllProviders().length} providers registered, ` +
      `${this.getConfiguredProviders().length} configured.`,
    );
  }

  /* -----------------------------------------------------------------------
   * Private
   * ----------------------------------------------------------------------- */

  private registerInstance(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }
}
