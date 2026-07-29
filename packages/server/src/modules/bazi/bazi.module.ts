// ============================================================
// 道之自然·命理AI系统 — 八字模块 (BaziModule)
// 排盘入口 → 返回四柱+纳音+藏干（纯引擎，无数据库）
// ============================================================

import { Module } from '@nestjs/common';
import { BaziController } from './bazi.controller';
import { BaziService } from './bazi.service';
import { BaziEngine } from '../../engines';

@Module({
  imports: [],
  controllers: [],
  providers: [BaziService],
  exports: [BaziService],
})
export class BaziModule {}
