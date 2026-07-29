/* =========================================================================
 * PromptPlaygroundService — Playground 服务：渲染预览、测试执行、Token 统计
 *
 * Provides:
 *   render()       — 渲染 Prompt 模板，替换变量，返回预览结果
 *   test()         — 执行 Prompt 测试（调用 LLM），返回生成内容 + Token 用量
 *   estimateTokens — 估算文本 Token 数量（基于 provider 的 countTokens 或本地近似）
 *   analyze()      — 全面分析 Playground 渲染 + Token 统计（不调用 LLM）
 * ========================================================================= */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import {
  PromptRenderContext,
  CompiledPrompt,
  IPromptRegistryService,
} from './interface/prompt.interface';
import { builtInTemplates, PromptTemplateEntry } from './templates/index';

/* -----------------------------------------------------------------------
 * 类型定义 — Playground 专属
 * ----------------------------------------------------------------------- */

/** 渲染预览结果 */
export interface PlaygroundRenderResult {
  promptId: string;
  version: string | null;
  /** 渲染后的完整消息列表 */
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  /** 实际使用的变量键值对 */
  variables: Record<string, string>;
  /** 模板中声明但未提供的变量列表 */
  missingVariables: string[];
  /** 各消息段的 Token 估算 */
  tokenEstimates: {
    system: number;
    user: number;
    assistant: number;
    total: number;
  };
  /** 最大 Token 限制 */
  maxTokens: number;
}

/** Playground 测试执行结果 */
export interface PlaygroundTestResult {
  promptId: string;
  version: string;
  /** LLM 生成的回复内容 */
  content: string;
  /** Token 用量（从 provider 返回） */
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** 实际使用的模型 */
  modelUsed: string;
  /** 实际使用的 Provider */
  providerUsed: string;
  /** 处理耗时（ms） */
  processingTime: number;
  /** 渲染快照（方便对照） */
  renderSnapshot: {
    messages: Array<{ role: string; content: string }>;
    variables: Record<string, string>;
  };
}

/** Token 分析结果 */
export interface TokenAnalysis {
  /** 各角色的内容 */
  messages: Array<{
    role: string;
    content: string;
    charCount: number;
    estimatedTokens: number;
  }>;
  /** 总字符数 */
  totalChars: number;
  /** 预估总 Token 数 */
  estimatedTokens: number;
  /** maxTokens 配置 */
  maxTokens: number;
  /** 是否超出限制 */
  exceedsLimit: boolean;
  /** 超出百分比 */
  usagePercent: number;
}

/** Provider 调用封装（用于测试执行） */
export interface PlaygroundProvider {
  generate(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    model: string;
    provider: string;
  }>;
  countTokens(text: string, model?: string): Promise<number>;
}

@Injectable()
export class PromptPlaygroundService {
  private readonly logger = new Logger(PromptPlaygroundService.name);

  constructor(
    @Optional()
    @Inject('IPromptRegistryService')
    private readonly registry?: IPromptRegistryService,
    @Optional()
    @Inject('PLAYGROUND_PROVIDER')
    private readonly provider?: PlaygroundProvider,
  ) {}

  /* ===================================================================
   *  1. 渲染预览
   * =================================================================== */

  /**
   * render — 渲染 Prompt 模板，替换变量，返回预览结果
   *
   * 支持两种获取模板的方式：
   *   (a) 通过 IPromptRegistryService（DB 存储的 Prompt）
   *   (b) 通过内置模板注册表 builtInTemplates（内存模板）
   *
   * @param context  渲染上下文（promptId + variables + overrides）
   * @returns        渲染预览结果
   */
  async render(context: PromptRenderContext): Promise<PlaygroundRenderResult> {
    const start = Date.now();

    // 1. 获取模板
    const { template, variables } = await this.resolveTemplate(
      context.promptId,
      context.version,
    );

    // 2. 检测缺失变量
    const providedVars = context.variables ?? {};
    const missingVariables = variables.filter(
      (v) => !(v in providedVars) || providedVars[v] === undefined,
    );

    // 3. 构建变量集（缺失的用空字符串填充）
    const resolvedVars: Record<string, string> = {};
    for (const v of variables) {
      resolvedVars[v] = providedVars[v] ?? '';
    }

    // 4. 渲染模板（替换 {{variable}} 占位符）
    const renderedSystem = this.replaceVariables(template.rawTemplate ?? '', resolvedVars);

    // 5. 构造消息列表
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: renderedSystem },
      { role: 'user', content: this.buildUserMessage(resolvedVars) },
    ];

    // 6. 估算 Token
    const systemTokens = await this.estimateTokens(renderedSystem);
    const userTokens = await this.estimateTokens(messages[1].content);
    const totalTokens = systemTokens + userTokens;

    this.logger.debug(
      `Rendered prompt "${context.promptId}" in ${Date.now() - start}ms ` +
      `(${totalTokens} estimated tokens)`,
    );

    return {
      promptId: context.promptId,
      version: context.version ?? null,
      messages,
      variables: resolvedVars,
      missingVariables,
      tokenEstimates: {
        system: systemTokens,
        user: userTokens,
        assistant: 0,
        total: totalTokens,
      },
      maxTokens: template.maxTokens ?? 4096,
    };
  }

  /* ===================================================================
   *  2. 测试执行
   * =================================================================== */

  /**
   * test — 执行 Prompt 测试，调用 LLM 获取生成结果
   *
   * @param context  渲染上下文
   * @param options  测试选项（温度、最大 Token 等）
   * @returns        测试执行结果
   */
  async test(
    context: PromptRenderContext,
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<PlaygroundTestResult> {
    const start = Date.now();

    // 1. 渲染 Prompt
    const renderResult = await this.render(context);

    // 2. 准备调用参数
    const providerName = options?.provider ?? context.overrides?.provider ?? 'openai';
    const modelName = options?.model ?? context.overrides?.model ?? 'gpt-4o';
    const temperature = options?.temperature ?? context.overrides?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? context.overrides?.maxTokens ?? renderResult.maxTokens;

    // 3. 调用 Provider
    if (!this.provider) {
      throw new Error(
        '无法执行测试：未注入 PLAYGROUND_PROVIDER。请确保在模块中注册了 Provider。',
      );
    }

    this.logger.log(
      `Testing prompt "${context.promptId}" via ${providerName}/${modelName}...`,
    );

    const genResult = await this.provider.generate({
      model: modelName,
      messages: renderResult.messages,
      temperature,
      maxTokens,
    });

    const processingTime = Date.now() - start;

    return {
      promptId: context.promptId,
      version: context.version ?? 'latest',
      content: genResult.content,
      tokenUsage: {
        prompt: genResult.usage?.promptTokens ?? 0,
        completion: genResult.usage?.completionTokens ?? 0,
        total: genResult.usage?.totalTokens ?? 0,
      },
      modelUsed: genResult.model,
      providerUsed: genResult.provider,
      processingTime,
      renderSnapshot: {
        messages: renderResult.messages,
        variables: renderResult.variables,
      },
    };
  }

  /* ===================================================================
   *  3. Token 统计
   * =================================================================== */

  /**
   * estimateTokens — 估算文本的 Token 数量
   *
   * 优先使用注入的 provider.countTokens()，否则使用本地近似算法。
   *
   * @param text   待估算的文本
   * @param model  可选模型名称（某些 provider 会针对不同模型做精确估算）
   * @returns      Token 数量
   */
  async estimateTokens(text: string, model?: string): Promise<number> {
    if (!text) return 0;

    if (this.provider) {
      try {
        return await this.provider.countTokens(text, model);
      } catch (err) {
        this.logger.warn(`provider.countTokens() 失败，回退到本地估算: ${(err as Error).message}`);
      }
    }

    // 本地近似估算
    return this.localTokenEstimate(text);
  }

  /**
   * analyze — 全面分析 Playground 渲染 + Token 统计（不调用 LLM）
   *
   * 与 render() 的区别：
   *   - analyze() 返回更详细的 Token 分析，包括每段消息的字符数和 Token 数
   *   - analyze() 不构造完整的 LLM 消息体，而是将模板和变量分开分析
   *
   * @param context 渲染上下文
   * @returns       Token 分析结果
   */
  async analyze(context: PromptRenderContext): Promise<TokenAnalysis> {
    const { template, variables } = await this.resolveTemplate(
      context.promptId,
      context.version,
    );

    const providedVars = context.variables ?? {};
    const resolvedVars: Record<string, string> = {};
    for (const v of variables) {
      resolvedVars[v] = providedVars[v] ?? '';
    }

    const renderedTemplate = this.replaceVariables(template.rawTemplate ?? '', resolvedVars);
    const userMessage = this.buildUserMessage(resolvedVars);

    const messages = [
      { role: 'system', content: renderedTemplate },
      { role: 'user', content: userMessage },
    ];

    const analyzedMessages = await Promise.all(
      messages.map(async (msg) => ({
        role: msg.role,
        content: msg.content,
        charCount: msg.content.length,
        estimatedTokens: await this.estimateTokens(msg.content),
      })),
    );

    const totalChars = analyzedMessages.reduce((sum, m) => sum + m.charCount, 0);
    const estimatedTokens = analyzedMessages.reduce((sum, m) => sum + m.estimatedTokens, 0);
    const maxTokens = template.maxTokens ?? 4096;

    return {
      messages: analyzedMessages,
      totalChars,
      estimatedTokens,
      maxTokens,
      exceedsLimit: estimatedTokens > maxTokens,
      usagePercent: maxTokens > 0 ? Math.round((estimatedTokens / maxTokens) * 100) : 0,
    };
  }

  /* ===================================================================
   *  内部工具方法
   * =================================================================== */

  /**
   * resolveTemplate — 获取模板条目（从注册表或内置模板）
   */
  private async resolveTemplate(
    promptId: string,
    version?: string,
  ): Promise<{ template: PromptTemplateEntry; variables: string[] }> {
    // 优先从内置模板查找
    const builtIn = builtInTemplates.get(promptId);
    if (builtIn) {
      return { template: builtIn, variables: builtIn.variables };
    }

    // 其次尝试 DB 注册表
    if (this.registry) {
      try {
        const promptData = await this.registry.get(promptId);
        if (promptData) {
          // 包装为 PromptTemplateEntry 兼容格式
          const entry: PromptTemplateEntry = {
            id: promptData.promptId,
            name: promptData.name,
            category: promptData.category as any,
            description: promptData.description,
            version: promptData.version,
            template: (_params: Record<string, any>) => promptData.template,
            rawTemplate: promptData.template,
            variables: promptData.variables,
            maxTokens: promptData.maxTokens,
            tags: promptData.tags,
          };
          return { template: entry, variables: promptData.variables };
        }
      } catch (err) {
        this.logger.warn(`从注册表获取 prompt "${promptId}" 失败: ${(err as Error).message}`);
      }
    }

    throw new Error(
      `未找到 Prompt 模板: "${promptId}"。请检查 promptId 是否正确，` +
      `或确认该模板是否已注册。`,
    );
  }

  /**
   * replaceVariables — 替换字符串中的 {{variable}} 占位符
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
      return variables[varName] !== undefined ? variables[varName] : `{{${varName}}}`;
    });
  }

  /**
   * buildUserMessage — 构建 user 消息（将变量信息格式化为自然语言）
   */
  private buildUserMessage(variables: Record<string, string>): string {
    const entries = Object.entries(variables).filter(([, v]) => v.length > 0);
    if (entries.length === 0) {
      return '请根据上方系统指令进行分析。';
    }

    const parts = entries.map(([key, value]) => `${key}: ${value}`);
    return `请根据以下信息进行分析：\n${parts.join('\n')}`;
  }

  /**
   * localTokenEstimate — 本地近似 Token 估算
   *
   * 估算策略：
   *   - 中文字符约占 1.5~2 tokens/字（取 1.8）
   *   - 英文约 4 字符/token
   *   - 混合文本取加权平均
   */
  private localTokenEstimate(text: string): number {
    if (!text) return 0;

    let chineseChars = 0;
    let otherChars = 0;

    for (const char of text) {
      if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)) {
        chineseChars++;
      } else {
        otherChars++;
      }
    }

    // 中文字符约 1.8 tokens/字，非中文字符约 4 字符/token
    const tokens = Math.ceil(chineseChars * 1.8 + otherChars / 4);
    return tokens;
  }
}
