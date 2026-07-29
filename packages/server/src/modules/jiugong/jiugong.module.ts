// ============================================================
// 道之自然·命理AI系统 — Jiugong模块
// ============================================================

import { Module } from '@nestjs/common';
import { JiugongService } from './jiugong.service';
import { JiugongEngine } from '../../engines';

@Module({
  controllers: [],
  providers: [JiugongService, JiugongEngine],
  exports: [JiugongService, JiugongEngine],
})
export class JiugongModule {}
