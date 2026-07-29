// ============================================================
// 道之自然·命理AI系统 — Dayun模块
// ============================================================

import { Module } from '@nestjs/common';
import { DayunController } from './dayun.controller';
import { DayunService } from './dayun.service';
import { DayunEngine } from '../../engines';

@Module({
  controllers: [DayunController],
  providers: [DayunService, DayunEngine],
  exports: [DayunService, DayunEngine],
})
export class DayunModule {}
