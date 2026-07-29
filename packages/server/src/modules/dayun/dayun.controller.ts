// ============================================================
// 道之自然·命理AI系统 — Dayun模块：控制器
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { DayunService } from './dayun.service';

@Controller('dayun')
export class DayunController {
  constructor(private readonly service: DayunService) {}
}
