// ============================================================
// 道之自然·命理AI系统 — DailyFortune模块：控制器
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { DailyFortuneService } from './daily-fortune.service';

@Controller('daily-fortune')
export class DailyFortuneController {
  constructor(private readonly service: DailyFortuneService) {}

  @Get('today')
  getToday() {
    return this.service.getTodayFortune();
  }
}
