// ============================================================
// 道之自然·命理规则引擎 — 神煞引擎
// 天乙贵人/文昌/桃花/驿马/华盖/羊刃等
// ============================================================

import { Injectable } from '@nestjs/common';
import { analyzeShenSha } from '@dzg/core';
import type { BaZi } from '@dzg/core';

@Injectable()
export class ShenshaEngine {
  /**
   * 神煞分析
   */
  analyze(bazi: BaZi) {
    const result = analyzeShenSha(bazi);

    return {
      total: result.all.length,
      auspicious: result.auspicious.map(s => ({
        name: s.name,
        pillar: s.pillar,
        description: s.description,
      })),
      inauspicious: result.inauspicious.map(s => ({
        name: s.name,
        pillar: s.pillar,
        description: s.description,
      })),
      all: result.all.map(s => ({
        name: s.name,
        type: s.type,
        pillar: s.pillar,
        description: s.description,
      })),
    };
  }
}
