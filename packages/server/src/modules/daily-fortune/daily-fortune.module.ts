// ============================================================
// 道之自然·命理AI系统 — DailyFortune模块
// ============================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyFortuneController } from './daily-fortune.controller';
import { DailyFortuneService } from './daily-fortune.service';
import { JiugongEngine, WuxingEngine, BaziEngine, SolutionEngine } from '../../engines';
import { DailyFortune, DailyFortuneSchema, BaziResult, BaziResultSchema } from '../../database/schemas';
import { AiService } from '../ai/ai.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyFortune.name, schema: DailyFortuneSchema },
      { name: BaziResult.name, schema: BaziResultSchema },
    ]),
  ],
  controllers: [DailyFortuneController],
  providers: [DailyFortuneService, JiugongEngine, WuxingEngine, BaziEngine, SolutionEngine, AiService],
  exports: [DailyFortuneService],
})
export class DailyFortuneModule {}
