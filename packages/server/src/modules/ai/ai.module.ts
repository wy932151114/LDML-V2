// ============================================================
// 道之自然·命理AI系统 — AI模块
// ============================================================

import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { BaziEngine, WuxingEngine, JiugongEngine } from '../../engines';

@Module({
  controllers: [AiController],
  providers: [AiService, BaziEngine, WuxingEngine, JiugongEngine],
  exports: [AiService],
})
export class AiModule {}
