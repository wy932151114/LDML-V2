// ============================================================
// 道之自然·命理AI系统 — AI模块：控制器
// 聊天/运势/策略 三个核心入口
// ============================================================

import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /api/v1/ai/chat
   * AI命理解析对话
   * Body: { message, context, history }
   */
  @Post('chat')
  async chat(@Body() body: {
    message: string;
    context?: {
      baziText?: string;
      wuxingText?: string;
      jiugongText?: string;
      dayunText?: string;
      shenshaText?: string;
    };
    history?: Array<{ role: string; content: string }>;
  }) {
    return this.aiService.chat(body.message, body.context, body.history as any);
  }

  /**
   * POST /api/v1/ai/daily-fortune
   * 生成每日运势
   */
  @Post('daily-fortune')
  async dailyFortune(@Body() body: {
    date: string;
    wuxingText: string;
    jiugongText: string;
    dayMaster: string;
    yongShen: string[];
    jiShen: string[];
  }) {
    return this.aiService.generateDailyFortune(body);
  }

  /**
   * POST /api/v1/ai/strategies
   * 生成改命策略
   */
  @Post('strategies')
  async strategies(@Body() body: {
    baziText: string;
    wuxingText: string;
    userGoal?: string;
  }) {
    return this.aiService.generateStrategies(body);
  }
}
