/* =========================================================================
 * AI Provider Interface — 统一 AI 服务提供商抽象层
 *
 * Defines the contract that every AI provider (OpenAI, Gemini, DeepSeek,
 * Qwen, Claude, MCP, etc.) must implement.
 * ========================================================================= */

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  organization?: string;
  [key: string]: any;
}

export interface GenerateOptions {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  [key: string]: any;
}

export interface GenerateResult {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  duration: number;
}

export interface StreamChunk {
  content: string;
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  model: string;
  error?: string;
  lastChecked: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  maxOutput: number;
  pricing: { input: number; output: number };
  features: string[];
  isBuiltin: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly displayName: string;

  configure(config: AIProviderConfig): void;
  isConfigured(): boolean;
  generate(options: GenerateOptions): Promise<GenerateResult>;
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
  countTokens(text: string, model?: string): Promise<number>;
  health(): Promise<ProviderHealth>;
  models(): Promise<ProviderModel[]>;
}
