// ============================================================
// 道之自然·命理AI系统 — Shensha模块：控制器
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { ShenshaService } from './shensha.service';

@Controller('shensha')
export class ShenshaController {
  constructor(private readonly service: ShenshaService) {}
}
