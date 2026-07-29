// ============================================================
// 道之自然·命理AI系统 — Wuxing模块：服务（直接实例化引擎）
// ============================================================

import { Injectable } from '@nestjs/common';
import { WuXingEnergyEngine } from '../../engines/wuxing-engine/wuxing-energy.engine';

@Injectable()
export class WuxingService {
  private readonly engine = new WuXingEnergyEngine();

  analyzeEnergy(data: any) {
    return this.engine.calculateEnergyField(data);
  }
}
