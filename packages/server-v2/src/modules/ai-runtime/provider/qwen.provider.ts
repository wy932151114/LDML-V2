/* =========================================================================
 * Qwen Provider — Alibaba Qwen (通义千问)
 *
 * OpenAI-compatible API at DashScope.
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
export class QwenProvider extends BaseProvider {
  private readonly defaultBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  constructor() {
    super('qwen', 'Alibaba Qwen (通义千问)');
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
      throw new Error(`[${this.name}] Provider is not configured. Set QWEN_API_KEY.`);
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
        id: 'qwen-max',
        name: 'Qwen Max',
        provider: this.name,
        contextLength: 32_000,
        maxOutput: 8_192,
        pricing: { input: 2.0, output: 6.0 },
        features: ['chat', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        provider: this.name,
        contextLength: 32_000,
        maxOutput: 8_192,
        pricing: { input: 0.8, output: 2.0 },
        features: ['chat', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        provider: this.name,
        contextLength: 32_000,
        maxOutput: 8_192,
        pricing: { input: 0.3, output: 0.6 },
        features: ['chat'],
        isBuiltin: true,
      },
      {
        id: 'qwen-long',
        name: 'Qwen Long',
        provider: this.name,
        contextLength: 1_000_000,
        maxOutput: 8_192,
        pricing: { input: 0.5, output: 2.0 },
        features: ['chat', 'long-context'],
        isBuiltin: true,
      },
    ];
  }
}
