// ============================================================
// 道之自然·命理AI系统 — 八字模块：控制器
// ============================================================

import { Controller, Post, Body } from '@nestjs/common';
import { BaziService } from './bazi.service';

@Controller('bazi')
export class BaziController {
  constructor(private readonly baziService: BaziService) {}

  /**
   * POST /api/v1/bazi/calculate
   * 八字排盘（纯规则引擎）
   */
  @Post('calculate')
  async calculate(@Body() input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    gender: '男' | '女';
    longitude?: number;
    useTrueSolar?: boolean;
  }) {
    return this.baziService.calculate(input);
  }
}
