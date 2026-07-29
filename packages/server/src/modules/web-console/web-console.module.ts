// ============================================================
// DZS Web Console — Module
// ============================================================

import { Module } from '@nestjs/common';
import { WebConsoleController } from './web-console.controller';
import { BaziModule } from '../bazi/bazi.module';
import { WuxingModule } from '../wuxing/wuxing.module';
import { JiugongModule } from '../jiugong/jiugong.module';
import { AiModule } from '../ai/ai.module';
import { ValidationCenter } from '../../validation-center/validation-center';
import { EnergyBus } from '../../kernel/energy/energy-bus';

@Module({
  imports: [BaziModule, WuxingModule, JiugongModule, AiModule],
  controllers: [WebConsoleController],
  providers: [ValidationCenter, EnergyBus],
})
export class WebConsoleModule {}
