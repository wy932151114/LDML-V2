// ============================================================
// 道之自然·命理AI系统 — Jiugong模块：服务（直接实例化引擎）
// ============================================================

import { Injectable } from '@nestjs/common';
import { JiugongEngine } from '../../engines';

@Injectable()
export class JiugongService {
  private readonly engine = new JiugongEngine();

  calculate(year: number, month: number, day: number) {
    return this.engine.calculate(year, month, day);
  }
}
