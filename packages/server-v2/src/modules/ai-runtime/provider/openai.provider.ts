/* =========================================================================
 * OpenAI Provider
 *
 * Full OpenAI-compatible chat completions provider.
 * Supports streaming via SSE.
 * ========================================================================= */

import { Injectable } from '@nestjs/common';
import { BaseProvider } from './base.provider';
import {
  GenerateOptions,
  GenerateResult,
  StreamChunk,
  ProviderModel,
} from '../interface/ai-provider.interface';

@Injectable()
export class OpenAIProvider extends BaseProvider {
  private readonly defaultBaseUrl = 'https://api.openai.com/v1';

  constructor() {
    super('openai', 'OpenAI');
  }

  /* -----------------------------------------------------------------------
   * generate
   * ----------------------------------------------------------------------- */

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    this.ensureConfigured();

    const start = Date.now();
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, any> = {
      model: options.model,
      messages: options.messages,
    };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;

    const response = await this.request(url, body);
    const data = await response.json();
    return this.parseGenerateResponse(data, options.model, Date.now() - start);
  }

  /* -----------------------------------------------------------------------
   * stream
   * ----------------------------------------------------------------------- */

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.ensureConfigured();

    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, any> = {
      model: options.model,
      messages: options.messages,
      stream: true,
    };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;

    const { signal, clear } = this.buildTimeout();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config!.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
      clear();

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const message = this.parseErrorBody(response.status, errorBody);
        throw new Error(`[${this.name}] ${message}`);
      }

      yield* this.parseSSEStream(response);
    } catch (err: any) {
      clear();
      if (err.name === 'AbortError') {
        throw new Error(`[${this.name}] Stream timed out after ${this.config?.timeout ?? 30_000}ms`);
      }
      throw err;
    }
  }

  /* -----------------------------------------------------------------------
   * models
   * ----------------------------------------------------------------------- */

  async models(): Promise<ProviderModel[]> {
    try {
      const url = `${this.baseUrl}/models`;
      const { signal, clear } = this.buildTimeout();

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config?.apiKey ?? ''}`,
        },
        signal,
      });
      clear();

      if (!response.ok) {
        return this.getBuiltinModels();
      }

      const data = await response.json();
      const models: ProviderModel[] = (data?.data ?? [])
        .filter((m: any) => m.id?.includes('gpt'))
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          provider: this.name,
          contextLength: this.getContextLength(m.id),
          maxOutput: this.getMaxOutput(m.id),
          pricing: this.getPricing(m.id),
          features: ['chat'],
          isBuiltin: false,
        }));

      return models.length > 0 ? models : this.getBuiltinModels();
    } catch {
      return this.getBuiltinModels();
    }
  }

  /* -----------------------------------------------------------------------
   * Private helpers
   * ----------------------------------------------------------------------- */

  private get baseUrl(): string {
    return this.config?.baseUrl || this.defaultBaseUrl;
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(`[${this.name}] Provider is not configured. Set OPENAI_API_KEY.`);
    }
  }

  private parseErrorBody(status: number, body: string): string {
    try {
      const parsed = JSON.parse(body);
      return parsed?.error?.message ?? parsed?.message ?? `HTTP ${status}`;
    } catch {
      return `HTTP ${status}`;
    }
  }

  private getBuiltinModels(): ProviderModel[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: this.name,
        contextLength: 128_000,
        maxOutput: 16_384,
        pricing: { input: 2.5, output: 10 },
        features: ['chat', 'vision', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: this.name,
        contextLength: 128_000,
        maxOutput: 16_384,
        pricing: { input: 0.15, output: 0.6 },
        features: ['chat', 'vision', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: this.name,
        contextLength: 128_000,
        maxOutput: 4_096,
        pricing: { input: 10, output: 30 },
        features: ['chat', 'vision', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: this.name,
        contextLength: 8_192,
        maxOutput: 4_096,
        pricing: { input: 30, output: 60 },
        features: ['chat', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: this.name,
        contextLength: 16_385,
        maxOutput: 4_096,
        pricing: { input: 0.5, output: 1.5 },
        features: ['chat', 'function-calling'],
        isBuiltin: true,
      },
    ];
  }

  private getContextLength(modelId: string): number {
    const map: Record<string, number> = {
      'gpt-4o': 128_000,
      'gpt-4o-mini': 128_000,
      'gpt-4-turbo': 128_000,
      'gpt-4': 8_192,
      'gpt-3.5-turbo': 16_385,
    };
    for (const [key, val] of Object.entries(map)) {
      if (modelId.includes(key)) return val;
    }
    return 8_192;
  }

  private getMaxOutput(modelId: string): number {
    const map: Record<string, number> = {
      'gpt-4o': 16_384,
      'gpt-4o-mini': 16_384,
      'gpt-4-turbo': 4_096,
      'gpt-4': 4_096,
      'gpt-3.5-turbo': 4_096,
    };
    for (const [key, val] of Object.entries(map)) {
      if (modelId.includes(key)) return val;
    }
    return 4_096;
  }

  private getPricing(modelId: string): { input: number; output: number } {
    const map: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.5, output: 10 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };
    for (const [key, val] of Object.entries(map)) {
      if (modelId.includes(key)) return val;
    }
    return { input: 0, output: 0 };
  }
}
