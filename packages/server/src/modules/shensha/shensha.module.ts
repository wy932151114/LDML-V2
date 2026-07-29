// ============================================================
// 道之自然·命理AI系统 — Shensha模块
// ============================================================

import { Module } from '@nestjs/common';
import { ShenshaController } from './shensha.controller';
import { ShenshaService } from './shensha.service';
import { ShenshaEngine } from '../../engines';

@Module({
  controllers: [ShenshaController],
  providers: [ShenshaService, ShenshaEngine],
  exports: [ShenshaService, ShenshaEngine],
})
export class ShenshaModule {}
