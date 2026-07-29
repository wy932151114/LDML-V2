/* =========================================================================
 * MCP Provider — Model Context Protocol (RESERVED)
 *
 * Placeholder provider for future MCP-based integrations.
 * Configured via MCP_ENDPOINT but generate() returns an error.
 * ========================================================================= */

import { Injectable } from '@nestjs/common';
import { BaseProvider } from './base.provider';
import {
  AIProviderConfig,
  GenerateOptions,
  GenerateResult,
  StreamChunk,
  ProviderHealth,
  ProviderModel,
} from '../interface/ai-provider.interface';

@Injectable()
export class MCPProvider extends BaseProvider {
  constructor() {
    super('mcp', 'MCP (预留)');
  }

  /* -----------------------------------------------------------------------
   * configure — also accepts MCP endpoint
   * ----------------------------------------------------------------------- */

  configure(config: AIProviderConfig): void {
    super.configure(config);
    // MCP provider stores endpoint info
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /* -----------------------------------------------------------------------
   * generate — placeholder
   * ----------------------------------------------------------------------- */

  async generate(_options: GenerateOptions): Promise<GenerateResult> {
    throw new Error(
      `[${this.name}] MCP provider is not yet implemented. ` +
      `It is reserved for future Model Context Protocol integration.`,
    );
  }

  /* -----------------------------------------------------------------------
   * stream — placeholder
   * ----------------------------------------------------------------------- */

  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    throw new Error(
      `[${this.name}] MCP provider is not yet implemented. ` +
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
      model: 'mcp-default',
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
        id: 'mcp-default',
        name: 'MCP Default (预留)',
        provider: this.name,
        contextLength: 128_000,
        maxOutput: 8_192,
        pricing: { input: 0, output: 0 },
        features: ['chat', 'tool-use', 'function-calling'],
        isBuiltin: true,
      },
    ];
  }
}
