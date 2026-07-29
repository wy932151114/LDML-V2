/* =========================================================================
 * AIRuntimeModule — AI 运行时模块
 *
 * Wires up all AI runtime services: router, cache, config, logging,
 * provider factory, and the main orchestration service.
 * ========================================================================= */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AIModelConfig,
  AIModelConfigSchema,
  AITokenLog,
  AITokenLogSchema,
  AILog,
  AILogSchema,
} from '@/database/mongoose/schemas';
import { RedisModule } from '@/database/redis/redis.module';
import { ReportModule } from '@/modules/report/report.module';

import { AIRuntimeService } from './ai-runtime.service';
import { AIRuntimeController } from './ai-runtime.controller';
import { AIRouter } from './router/ai-router';
import { ProviderFactory } from './provider/provider.factory';
import { AiCacheService } from './cache/ai-cache.service';
import { AiConfigService } from './config/ai-config.service';
import { AiLogService } from './logs/ai-log.service';

// Provider implementations
import { OpenAIProvider } from './provider/openai.provider';
import { GeminiProvider } from './provider/gemini.provider';
import { DeepSeekProvider } from './provider/deepseek.provider';
import { QwenProvider } from './provider/qwen.provider';
import { ClaudeProvider } from './provider/claude.provider';
import { MCPProvider } from './provider/mcp.provider';
import { ProviderConnectionTester } from './provider/provider-tester';

@Module({
  imports: [
    // Mongoose feature models for AI runtime
    MongooseModule.forFeature([
      { name: AIModelConfig.name, schema: AIModelConfigSchema },
      { name: AITokenLog.name, schema: AITokenLogSchema },
      { name: AILog.name, schema: AILogSchema },
    ]),
    RedisModule,
    forwardRef(() => ReportModule),
  ],
  controllers: [AIRuntimeController],
  providers: [
    AIRuntimeService,
    AIRouter,
    ProviderFactory,
    AiCacheService,
    AiConfigService,
    AiLogService,
    // Provider instances
    OpenAIProvider,
    GeminiProvider,
    DeepSeekProvider,
    QwenProvider,
    ClaudeProvider,
    MCPProvider,
    ProviderConnectionTester,
  ],
  exports: [
    AIRuntimeService,
    ProviderFactory,
    AIRouter,
    ProviderConnectionTester,
  ],
})
export class AIRuntimeModule {}
