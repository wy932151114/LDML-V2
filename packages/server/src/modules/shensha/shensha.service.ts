// ============================================================
// 道之自然·命理AI系统 — Shensha模块：服务
// ============================================================

import { Injectable } from '@nestjs/common';
import { ShenshaEngine } from '../../engines';

@Injectable()
export class ShenshaService {
  constructor(private readonly engine: ShenshaEngine) {}
}
