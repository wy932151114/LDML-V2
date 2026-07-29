// ============================================================
// DZS-OS V2 — ProviderConnectionTester
// 真实 HTTP 连接测试各个 Provider 的 API 端点
// ============================================================

import { Injectable, Logger } from '@nestjs/common';

export interface ConnectionTestInput {
  provider: string;
  type: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface ConnectionTestResult {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  model: string;
  error?: string;
}

@Injectable()
export class ProviderConnectionTester {
  private readonly logger = new Logger(ProviderConnectionTester.name);

  async testProvider(input: ConnectionTestInput): Promise<ConnectionTestResult> {
    const { provider, type, apiKey, baseUrl, model } = input;

    try {
      switch (type) {
        case 'openai-compatible':
          return await this.testOpenAICompatible(provider, apiKey, baseUrl, model);
        case 'gemini':
          return await this.testGemini(provider, apiKey, baseUrl, model);
        case 'claude':
          return await this.testClaude(provider, apiKey, baseUrl, model);
        case 'mcp':
          return await this.testMCP(provider, apiKey, baseUrl);
        default:
          return { provider, status: 'unhealthy', model: 'unknown', error: `Unknown provider type: ${type}` };
      }
    } catch (err: any) {
      return {
        provider,
        status: 'unhealthy',
        model: model || 'unknown',
        error: err?.message || String(err),
      };
    }
  }

  private async testOpenAICompatible(
    provider: string,
    apiKey: string,
    baseUrl?: string,
    model?: string,
  ): Promise<ConnectionTestResult> {
    const url = baseUrl
      ? `${baseUrl.replace(/\/+$/, '')}/chat/completions`
      : `https://api.openai.com/v1/chat/completions`;

    const testModel = model || 'gpt-4o-mini';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const actualModel = data?.model || testModel;
        return { provider, status: 'healthy', model: actualModel };
      }

      const errorBody = await response.text().catch(() => '');
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed?.error?.message || parsed?.message || message;
      } catch {}

      if (response.status === 401) {
        return { provider, status: 'unhealthy', model: testModel, error: 'Authentication failed (401)' };
      }
      if (response.status === 429) {
        return { provider, status: 'degraded', model: testModel, error: 'Rate limited (429)' };
      }
      return { provider, status: 'degraded', model: testModel, error: message };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return { provider, status: 'degraded', model: testModel || 'unknown', error: 'Connection timed out' };
      }
      return { provider, status: 'unhealthy', model: testModel || 'unknown', error: err?.message || String(err) };
    }
  }

  private async testGemini(
    provider: string,
    apiKey: string,
    baseUrl?: string,
    model?: string,
  ): Promise<ConnectionTestResult> {
    const base = baseUrl
      ? baseUrl.replace(/\/+$/, '')
      : 'https://generativelanguage.googleapis.com/v1beta';
    const testModel = model || 'gemini-2.0-flash';
    const url = `${base}/models/${testModel}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        return { provider, status: 'healthy', model: testModel };
      }

      const errorBody = await response.text().catch(() => '');
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed?.error?.message || message;
      } catch {}

      if (response.status === 403 || response.status === 401) {
        return { provider, status: 'unhealthy', model: testModel, error: 'Authentication failed' };
      }
      return { provider, status: 'degraded', model: testModel, error: message };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return { provider, status: 'degraded', model: testModel, error: 'Connection timed out' };
      }
      return { provider, status: 'unhealthy', model: testModel, error: err?.message || String(err) };
    }
  }

  private async testClaude(
    provider: string,
    apiKey: string,
    baseUrl?: string,
    model?: string,
  ): Promise<ConnectionTestResult> {
    const base = baseUrl
      ? baseUrl.replace(/\/+$/, '')
      : 'https://api.anthropic.com/v1';
    const testModel = model || 'claude-sonnet-4';
    const url = `${base}/messages`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: testModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        return { provider, status: 'healthy', model: testModel };
      }

      const errorBody = await response.text().catch(() => '');
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed?.error?.message || message;
      } catch {}

      if (response.status === 401) {
        return { provider, status: 'unhealthy', model: testModel, error: 'Authentication failed (401)' };
      }
      return { provider, status: 'degraded', model: testModel, error: message };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return { provider, status: 'degraded', model: testModel, error: 'Connection timed out' };
      }
      return { provider, status: 'unhealthy', model: testModel, error: err?.message || String(err) };
    }
  }

  private async testMCP(
    provider: string,
    _apiKey: string,
    _baseUrl?: string,
  ): Promise<ConnectionTestResult> {
    // MCP 连接测试暂不支持 HTTP 测试
    return {
      provider,
      status: 'unhealthy' as const,
      model: 'N/A',
      error: 'MCP connection test not supported via HTTP. Configure MCP endpoint in settings.',
    };
  }
}
