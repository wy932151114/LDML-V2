// ============================================================
// 道之自然·命理AI系统 — 八字模块：服务（纯引擎版）
// 无数据库依赖，所有计算由规则引擎完成
// ============================================================

import { Injectable } from '@nestjs/common';
import { BaziEngine } from '../../engines/bazi-engine/bazi.engine';

@Injectable()
export class BaziService {
  private readonly baziEngine = new BaziEngine();

  async calculate(input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    gender: '男' | '女';
    longitude?: number;
    useTrueSolar?: boolean;
  }) {
    const result = this.baziEngine.calculate(input);
    return { success: true, data: result };
  }
}
