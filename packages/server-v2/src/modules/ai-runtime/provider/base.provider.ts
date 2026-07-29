/* =========================================================================
 * BaseProvider — Abstract base for all AI providers
 *
 * Implements common logic (configure, isConfigured, health, countTokens)
 * leaving generate(), stream(), and models() abstract for subclasses.
 * ========================================================================= */

import {
  AIProvider,
  AIProviderConfig,
  GenerateOptions,
  GenerateResult,
  StreamChunk,
  ProviderHealth,
  ProviderModel,
} from '../interface/ai-provider.interface';

export abstract class BaseProvider implements AIProvider {
  readonly name: string;
  readonly displayName: string;
  protected config: AIProviderConfig | null = null;

  constructor(name: string, displayName: string) {
    this.name = name;
    this.displayName = displayName;
  }

  /* -----------------------------------------------------------------------
   * Configuration
   * ----------------------------------------------------------------------- */

  configure(config: AIProviderConfig): void {
    this.config = {
      timeout: 30_000,
      maxRetries: 3,
      ...config,
    };
  }

  isConfigured(): boolean {
    return !!(this.config?.apiKey);
  }

  /* -----------------------------------------------------------------------
   * Abstract methods
   * ----------------------------------------------------------------------- */

  abstract generate(options: GenerateOptions): Promise<GenerateResult>;
  abstract stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
  abstract models(): Promise<ProviderModel[]>;

  /* -----------------------------------------------------------------------
   * Token counting (approximate)
   * ----------------------------------------------------------------------- */

  async countTokens(text: string, _model?: string): Promise<number> {
    // Rough approximation: ~4 chars per token for English/Chinese mixed text
    return Math.ceil(text.length / 4);
  }

  /* -----------------------------------------------------------------------
   * Health check
   * ----------------------------------------------------------------------- */

  async health(): Promise<ProviderHealth> {
    const start = Date.now();
    const model = (this.config?.model as string) || (await this.models())[0]?.id || 'unknown';

    try {
      // Attempt a minimal generation to verify the provider is alive
      const result = await this.generate({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 1,
      });

      return {
        status: 'healthy',
        latency: Date.now() - start,
        model: result.model,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      const elapsed = Date.now() - start;

      // Network-ish errors → degraded; auth/rate-limit → unhealthy
      const isDegraded =
        err?.message?.includes('timedout') ||
        err?.message?.includes('ETIMEDOUT') ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('network');

      return {
        status: isDegraded ? 'degraded' : 'unhealthy',
        latency: elapsed,
        model,
        error: err?.message ?? String(err),
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /* -----------------------------------------------------------------------
   * Helpers for subclasses
   * ----------------------------------------------------------------------- */

  /**
   * Build an abort-signal timeout controller.
   */
  protected buildTimeout(): { signal: AbortSignal; clear: () => void } {
    const ms = this.config?.timeout ?? 30_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return {
      signal: controller.signal,
      clear: () => clearTimeout(timer),
    };
  }

  /**
   * Unified fetch wrapper with timeout, auth header, and error handling.
   */
  protected async request(
    url: string,
    body: Record<string, any>,
  ): Promise<Response> {
    const { signal, clear } = this.buildTimeout();

    try {
      const apiKey = this.config!.apiKey;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
      clear();

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let message = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorBody);
          message = parsed?.error?.message ?? parsed?.message ?? message;
        } catch {
          // keep default message
        }
        throw new Error(`[${this.name}] ${message}`);
      }

      return response;
    } catch (err: any) {
      clear();
      if (err.name === 'AbortError') {
        throw new Error(`[${this.name}] Request timed out after ${this.config?.timeout ?? 30_000}ms`);
      }
      throw err;
    }
  }

  /**
   * Parse streaming SSE chunks from a ReadableStream<Uint8Array>.
   * Yields parsed StreamChunk objects.
   */
  protected async *parseSSEStream(
    response: Response,
  ): AsyncIterable<StreamChunk> {
    if (!response.body) {
      throw new Error(`[${this.name}] Response body is null`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // keep the last incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // comment / blank
          if (trimmed === 'data: [DONE]') {
            yield { content: '', finishReason: 'stop' };
            return;
          }
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              const delta = data?.choices?.[0]?.delta;
              const finish = data?.choices?.[0]?.finish_reason;
              const usage = data?.usage;
              yield {
                content: delta?.content ?? delta?.reasoning_content ?? '',
                finishReason: finish ?? null,
                usage: usage
                  ? {
                      promptTokens: usage.prompt_tokens ?? 0,
                      completionTokens: usage.completion_tokens ?? 0,
                      totalTokens: usage.total_tokens ?? 0,
                    }
                  : undefined,
              };
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build a GenerateResult from a standard OpenAI-compatible response JSON.
   */
  protected parseGenerateResponse(
    data: any,
    model: string,
    duration: number,
  ): GenerateResult {
    const choice = data?.choices?.[0];
    return {
      content: choice?.message?.content ?? '',
      finishReason: choice?.finish_reason ?? 'stop',
      usage: {
        promptTokens: data?.usage?.prompt_tokens ?? 0,
        completionTokens: data?.usage?.completion_tokens ?? 0,
        totalTokens: data?.usage?.total_tokens ?? 0,
      },
      model: data?.model ?? model,
      provider: this.name,
      duration,
    };
  }
}
