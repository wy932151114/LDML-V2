// ============================================================
// 道之自然·命理AI系统 — Wuxing模块：控制器
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { WuxingService } from './wuxing.service';

@Controller('wuxing')
export class WuxingController {
  constructor(private readonly service: WuxingService) {}
}
