/* =========================================================================
 * DeepSeek Provider
 *
 * OpenAI-compatible API at https://api.deepseek.com/v1/chat/completions.
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
export class DeepSeekProvider extends BaseProvider {
  private readonly defaultBaseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    super('deepseek', 'DeepSeek');
  }

  /* -----------------------------------------------------------------------
   * generate
   * ----------------------------------------------------------------------- */

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    this.ensureConfigured();

    const start = Date.now();
    const url = `${this.baseUrl}/chat/completions`;
    const body = this.buildBody(options, false);

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
    const body = this.buildBody(options, true);

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
    return this.getBuiltinModels();
  }

  /* -----------------------------------------------------------------------
   * Private helpers
   * ----------------------------------------------------------------------- */

  private get baseUrl(): string {
    return this.config?.baseUrl || this.defaultBaseUrl;
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error(`[${this.name}] Provider is not configured. Set DEEPSEEK_API_KEY.`);
    }
  }

  private buildBody(options: GenerateOptions, stream: boolean): Record<string, any> {
    const body: Record<string, any> = {
      model: options.model,
      messages: options.messages,
      stream,
    };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;
    return body;
  }

  private parseErrorBody(status: number, responseBody: string): string {
    try {
      const parsed = JSON.parse(responseBody);
      return parsed?.error?.message ?? `HTTP ${status}`;
    } catch {
      return `HTTP ${status}`;
    }
  }

  private getBuiltinModels(): ProviderModel[] {
    return [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat (V3)',
        provider: this.name,
        contextLength: 64_000,
        maxOutput: 8_192,
        pricing: { input: 0.27, output: 1.1 },
        features: ['chat', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner (R1)',
        provider: this.name,
        contextLength: 64_000,
        maxOutput: 8_192,
        pricing: { input: 0.55, output: 2.19 },
        features: ['chat', 'reasoning', 'function-calling'],
        isBuiltin: true,
      },
    ];
  }
}
