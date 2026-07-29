/* =========================================================================
 * Gemini Provider — Google Gemini API
 *
 * Uses Google AI Studio / Vertex AI-compatible REST API.
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
export class GeminiProvider extends BaseProvider {
  private readonly defaultBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    super('gemini', 'Google Gemini');
  }

  /* -----------------------------------------------------------------------
   * generate
   * ----------------------------------------------------------------------- */

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    this.ensureConfigured();

    const start = Date.now();
    const model = options.model;
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.config!.apiKey}`;

    const contents = this.toGeminiMessages(options.messages);

    const body: Record<string, any> = {
      contents,
    };

    if (options.temperature !== undefined) {
      body.generationConfig = {
        ...body.generationConfig,
        temperature: options.temperature,
      };
    }
    if (options.topP !== undefined) {
      body.generationConfig = {
        ...body.generationConfig,
        topP: options.topP,
      };
    }
    if (options.maxTokens !== undefined) {
      body.generationConfig = {
        ...body.generationConfig,
        maxOutputTokens: options.maxTokens,
      };
    }

    const { signal, clear } = this.buildTimeout();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      clear();

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const message = this.parseErrorBody(errorBody);
        throw new Error(`[${this.name}] ${message}`);
      }

      const data = await response.json();
      return this.toGenerateResult(data, model, Date.now() - start);
    } catch (err: any) {
      clear();
      if (err.name === 'AbortError') {
        throw new Error(`[${this.name}] Request timed out after ${this.config?.timeout ?? 30_000}ms`);
      }
      throw err;
    }
  }

  /* -----------------------------------------------------------------------
   * stream
   *
   * Gemini SSE streaming could be implemented via streamGenerateContent,
   * but for now we fall back to non-streaming generate.
   * ======================================================================= */

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    // Fallback: generate fully then yield as a single chunk
    const result = await this.generate(options);
    yield {
      content: result.content,
      finishReason: result.finishReason,
      usage: result.usage,
    };
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
      throw new Error(`[${this.name}] Provider is not configured. Set GEMINI_API_KEY.`);
    }
  }

  private parseErrorBody(body: string): string {
    try {
      const parsed = JSON.parse(body);
      return parsed?.error?.message ?? `HTTP error`;
    } catch {
      return `HTTP error`;
    }
  }

  /**
   * Convert generic messages into Gemini's "contents" format.
   */
  private toGeminiMessages(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  ): any[] {
    const contents: any[] = [];

    // Gemini doesn't support a system role in the contents array;
    // prepend system as a user message if present
    for (const msg of messages) {
      if (msg.role === 'system') {
        contents.push({
          role: 'user',
          parts: [{ text: `[System instruction] ${msg.content}` }],
        });
        // Add an assistant placeholder so the API doesn't complain
        contents.push({
          role: 'model',
          parts: [{ text: 'Understood.' }],
        });
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return contents;
  }

  /**
   * Convert a Gemini API response to our standard GenerateResult.
   */
  private toGenerateResult(data: any, model: string, duration: number): GenerateResult {
    const candidate = data?.candidates?.[0];
    const content = candidate?.content?.parts
      ?.map((p: any) => p.text ?? '')
      .join('') ?? '';

    const finishReason = candidate?.finishReason ?? 'STOP';
    const usageMeta = data?.usageMetadata ?? {};

    return {
      content,
      finishReason: finishReason.toLowerCase(),
      usage: {
        promptTokens: usageMeta.promptTokenCount ?? 0,
        completionTokens: usageMeta.candidatesTokenCount ?? 0,
        totalTokens: usageMeta.totalTokenCount ?? 0,
      },
      model,
      provider: this.name,
      duration,
    };
  }

  private getBuiltinModels(): ProviderModel[] {
    return [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: this.name,
        contextLength: 1_048_576,
        maxOutput: 8_192,
        pricing: { input: 0.1, output: 0.4 },
        features: ['chat', 'vision', 'multimodal'],
        isBuiltin: true,
      },
      {
        id: 'gemini-2.0-pro',
        name: 'Gemini 2.0 Pro',
        provider: this.name,
        contextLength: 2_097_152,
        maxOutput: 8_192,
        pricing: { input: 2.0, output: 8.0 },
        features: ['chat', 'vision', 'multimodal', 'code-execution'],
        isBuiltin: true,
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: this.name,
        contextLength: 2_097_152,
        maxOutput: 8_192,
        pricing: { input: 1.25, output: 5.0 },
        features: ['chat', 'vision', 'multimodal'],
        isBuiltin: true,
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: this.name,
        contextLength: 1_048_576,
        maxOutput: 8_192,
        pricing: { input: 0.075, output: 0.3 },
        features: ['chat', 'vision', 'multimodal'],
        isBuiltin: true,
      },
    ];
  }
}
