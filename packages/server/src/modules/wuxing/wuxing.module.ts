// ============================================================
// 道之自然·命理AI系统 — Wuxing模块
// ============================================================

import { Module } from '@nestjs/common';
import { WuxingService } from './wuxing.service';
import { WuxingEngine } from '../../engines';

@Module({
  controllers: [],
  providers: [WuxingService, WuxingEngine],
  exports: [WuxingService, WuxingEngine],
})
export class WuxingModule {}
