// ============================================================
// 道之自然·命理AI系统 — AI服务
// 调用外部LLM + Prompt模板引擎 + 规则约束
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ROLE_SYSTEM_PROMPT,
  TABOO_RULES,
  buildFortunePrompt,
  buildDailyFortunePrompt,
  buildStrategyPrompt,
} from '../../prompts/prompts.template';

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;
  private model: string = 'gpt-4o-mini';

  constructor() {
    const provider = process.env['AI_PROVIDER'] || 'openai';
    const apiKey = process.env['AI_API_KEY'] || '';
    const baseURL = process.env['AI_BASE_URL'] || undefined;
    this.model = process.env['AI_MODEL'] || 'gpt-4o-mini';

    if (apiKey) {
      const config: any = { apiKey };
      if (baseURL) config.baseURL = baseURL;
      this.client = new OpenAI(config);
      this.logger.log(`✅ AI已配置: provider=${provider} model=${this.model} baseURL=${baseURL || 'default'}`);
    } else {
      this.logger.warn('⚠️ AI未配置API Key，使用mock模式');
    }
  }

  /**
   * 通用生成接口（供 WebConsoleController 调用）
   * 将 { type, prompt, systemPrompt, baziData } 映射到 chat 接口
   */
  async generate(input: {
    type?: string;
    prompt?: string;
    systemPrompt?: string;
    baziData?: any;
  }) {
    const context = input.baziData ? {
      baziText: JSON.stringify(input.baziData, null, 2),
    } : undefined;

    return this.chat(
      input.prompt || '请生成命理分析报告',
      context,
    );
  }

  /**
   * 命理解析对话（核心入口）
   * role + data + taboo 三层约束
   */
  async chat(
    userMessage: string,
    context?: {
      baziText?: string;
      wuxingText?: string;
      jiugongText?: string;
      dayunText?: string;
      shenshaText?: string;
    },
    history?: AiChatMessage[],
  ) {
    const systemMessage: AiChatMessage = {
      role: 'system',
      content: ROLE_SYSTEM_PROMPT + '\n' + TABOO_RULES,
    };

    const dataPrompt: AiChatMessage = {
      role: 'system',
      content: buildFortunePrompt({
        ...context,
        userQuestion: userMessage,
      }),
    };

    const messages: AiChatMessage[] = [
      systemMessage,
      dataPrompt,
      ...(history || []),
      { role: 'user', content: userMessage },
    ];

    return this.callLLM(messages);
  }

  /**
   * 生成每日运势
   */
  async generateDailyFortune(data: {
    date: string;
    wuxingText: string;
    jiugongText: string;
    dayMaster: string;
    yongShen: string[];
    jiShen: string[];
  }) {
    const messages: AiChatMessage[] = [
      { role: 'system', content: ROLE_SYSTEM_PROMPT + '\n' + TABOO_RULES },
      { role: 'user', content: buildDailyFortunePrompt(data) },
    ];
    return this.callLLM(messages);
  }

  /**
   * 生成改命策略
   */
  async generateStrategies(data: {
    baziText: string;
    wuxingText: string;
    userGoal?: string;
  }) {
    const messages: AiChatMessage[] = [
      { role: 'system', content: ROLE_SYSTEM_PROMPT + '\n' + TABOO_RULES },
      { role: 'user', content: buildStrategyPrompt(data) },
    ];
    return this.callLLM(messages);
  }

  /**
   * 调用LLM（带降级机制）
   */
  private async callLLM(messages: AiChatMessage[]) {
    if (!this.client) {
      return this.mockResponse(messages);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 2048,
      });

      return {
        success: true,
        content: response.choices[0]?.message?.content || '',
        model: this.model,
        usage: response.usage,
      };
    } catch (error) {
      this.logger.error('AI调用失败', error);
      return {
        success: false,
        content: this.mockResponse(messages).content,
        error: error.message,
      };
    }
  }

  /**
   * 降级：AI不可用时的mock回复
   * 确保系统至少能给出基本的命理数据
   */
  private mockResponse(messages: AiChatMessage[]) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    return {
      success: true,
      content: `【道之自然AI命理系统提示】

系统已根据您的命盘完成精确排算。当前AI服务暂未连接，以下是已计算的硬数据结论：

📊 命理数据已就绪（规则引擎计算结果）
  - 八字四柱、五行分布、用神忌神均已计算完成
  - 九宫飞星方位已排定
  - 大运流年已推算

💡 您可以通过以下方式获取完整AI分析：
  1. 配置OpenAI API Key后重新请求
  2. 查看上方排盘结果自行解读
  3. 联系管理员开启AI服务

${lastUserMsg ? `\n您刚才提到：${lastUserMsg.content.substring(0, 100)}...` : ''}

⚙️ 系统状态：规则引擎 ✅ 在线  |  AI引擎 ⚠️ 未配置

道之自然曰：命理是地图，路要自己走。数据已经在这了，让AI翻译只是锦上添花。`,
    };
  }
}
