// ============================================================
// 道之自然·命理规则引擎 — 五行引擎
// 日主强弱/用神/喜神/忌神/五行动态平衡
// ============================================================

import { Injectable } from '@nestjs/common';
import { calculateWuXing, analyzeShiShen, wuxingToString } from '@dzg/core';
import type { BaZi } from '@dzg/core';

@Injectable()
export class WuxingEngine {
  /**
   * 完整五行分析
   */
  analyze(bazi: BaZi) {
    const wx = calculateWuXing(bazi);
    const ss = analyzeShiShen(bazi);

    return {
      // 五行评分
      scores: wx.scores,
      percentage: wx.percentage,
      // 日主
      dayMasterWx: wx.dayMasterWx,
      dayMasterStrength: wx.dayMasterStrength,
      bodyStrength: wx.bodyStrength,
      balanceState: wx.balanceState,
      // 用神/喜神/忌神
      yongShen: wx.yongShen,
      xiShen: wx.xiShen,
      jiShen: wx.jiShen,
      missing: wx.missing,
      excess: wx.excess,
      // 十神
      shiShen: {
        ranking: ss.ranking.slice(0, 5),
        stats: ss.stats,
      },
      // 五行补救建议
      remedies: this.generateRemedies(wx),
      text: wuxingToString(wx),
    };
  }

  /**
   * 根据五行分析生成补救建议
   */
  private generateRemedies(wx: ReturnType<typeof calculateWuXing>) {
    const remedies: Array<{
      type: string;
      description: string;
      items: string[];
    }> = [];

    // 缺失五行补救
    for (const missing of wx.missing) {
      remedies.push({
        type: `补${missing}`,
        description: `${missing}缺失，建议补充`,
        items: this.getElementItems(missing),
      });
    }

    // 身弱/身强对应的用神补救
    if (wx.bodyStrength === '身弱') {
      remedies.push({
        type: '扶身',
        description: `身弱，用神【${wx.yongShen.join('、')}】补益`,
        items: wx.yongShen.flatMap(e => this.getElementItems(e)),
      });
    } else if (wx.bodyStrength === '身强') {
      remedies.push({
        type: '泄耗',
        description: `身强，用神【${wx.yongShen.join('、')}】疏通`,
        items: wx.yongShen.flatMap(e => this.getElementItems(e)),
      });
    }

    return remedies;
  }

  private getElementItems(element: string): string[] {
    const map: Record<string, string[]> = {
      '木': ['绿色', '东方', '植物', '木质饰品'],
      '火': ['红色', '南方', '灯光', '红色饰品'],
      '土': ['黄色', '中部/本地', '陶瓷', '玉石'],
      '金': ['白色', '西方', '金属饰品', '白色衣物'],
      '水': ['黑色/蓝色', '北方', '水景', '黑色饰品'],
    };
    return map[element] || [];
  }
}
