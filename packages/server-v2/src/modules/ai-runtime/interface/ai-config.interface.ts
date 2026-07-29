/* =========================================================================
 * AI Config Interfaces — AI 运行时配置定义
 * ========================================================================= */

export interface AIModelConfigData {
  id?: string;
  provider: string;
  model: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  price: { input: number; output: number };
  rpm: number;
  tpm: number;
  timeout: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  tags: string[];
  isBuiltin: boolean;
  version: number;
}

export interface RuntimeConfig {
  defaultProvider: string;
  defaultModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  cacheTTL: number;
  retryCount: number;
  retryDelay: number;
  fallbackEnabled: boolean;
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  cacheTTL: 3600,
  retryCount: 3,
  retryDelay: 1000,
  fallbackEnabled: true,
};
