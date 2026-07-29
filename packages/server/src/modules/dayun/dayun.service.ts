// ============================================================
// 道之自然·命理AI系统 — Dayun模块：服务
// ============================================================

import { Injectable } from '@nestjs/common';
import { DayunEngine } from '../../engines';

@Injectable()
export class DayunService {
  constructor(private readonly engine: DayunEngine) {}
}
