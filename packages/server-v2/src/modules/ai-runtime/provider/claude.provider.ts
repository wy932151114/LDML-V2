/* =========================================================================
 * Claude Provider — Anthropic Claude (RESERVED)
 *
 * Placeholder provider; actual implementation is not yet built.
 * Configured via CLAUDE_API_KEY but generate() returns an error.
 * ========================================================================= */

import { Injectable } from '@nestjs/common';
import { BaseProvider } from './base.provider';
import {
  GenerateOptions,
  GenerateResult,
  StreamChunk,
  ProviderHealth,
  ProviderModel,
} from '../interface/ai-provider.interface';

@Injectable()
export class ClaudeProvider extends BaseProvider {
  constructor() {
    super('claude', 'Anthropic Claude (预留)');
  }

  /* -----------------------------------------------------------------------
   * generate — placeholder
   * ----------------------------------------------------------------------- */

  async generate(_options: GenerateOptions): Promise<GenerateResult> {
    throw new Error(
      `[${this.name}] Claude provider is not yet implemented. ` +
      `It is reserved for future Anthropic Claude integration.`,
    );
  }

  /* -----------------------------------------------------------------------
   * stream — placeholder
   * ----------------------------------------------------------------------- */

  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    throw new Error(
      `[${this.name}] Claude provider is not yet implemented. ` +
      `Streaming is not available.`,
    );
  }

  /* -----------------------------------------------------------------------
   * countTokens — placeholder
   * ----------------------------------------------------------------------- */

  async countTokens(_text: string, _model?: string): Promise<number> {
    return 0;
  }

  /* -----------------------------------------------------------------------
   * health — placeholder
   * ----------------------------------------------------------------------- */

  async health(): Promise<ProviderHealth> {
    return {
      status: 'unhealthy',
      latency: 0,
      model: 'claude-3-opus',
      error: 'Provider not yet implemented',
      lastChecked: new Date().toISOString(),
    };
  }

  /* -----------------------------------------------------------------------
   * models — placeholder
   * ----------------------------------------------------------------------- */

  async models(): Promise<ProviderModel[]> {
    return [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus (预留)',
        provider: this.name,
        contextLength: 200_000,
        maxOutput: 4_096,
        pricing: { input: 15, output: 75 },
        features: ['chat', 'vision', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet (预留)',
        provider: this.name,
        contextLength: 200_000,
        maxOutput: 4_096,
        pricing: { input: 3, output: 15 },
        features: ['chat', 'vision', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku (预留)',
        provider: this.name,
        contextLength: 200_000,
        maxOutput: 4_096,
        pricing: { input: 0.25, output: 1.25 },
        features: ['chat', 'vision', 'function-calling'],
        isBuiltin: true,
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet (预留)',
        provider: this.name,
        contextLength: 200_000,
        maxOutput: 8_192,
        pricing: { input: 3, output: 15 },
        features: ['chat', 'vision', 'function-calling', 'code-execution'],
        isBuiltin: true,
      },
    ];
  }
}
