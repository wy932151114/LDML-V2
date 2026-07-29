// ============================================================
// 道之自然·命理规则引擎 — 大运流年引擎
// 大运排算 + 流年分析 + 生命历程
// ============================================================

import { Injectable } from '@nestjs/common';
import { calculateDaYun, calculateLiuNian, calculateStartLuckAge } from '@dzg/core';
import type { BaZi } from '@dzg/core';

@Injectable()
export class DayunEngine {
  /**
   * 计算大运
   */
  calculateDayun(bazi: BaZi, startAge?: number) {
    const age = startAge ?? calculateStartLuckAge(
      bazi,
      parseInt(bazi.birthTime.substring(0, 4)),
      parseInt(bazi.birthTime.substring(5, 7)),
      parseInt(bazi.birthTime.substring(8, 10)),
    );

    const daYun = calculateDaYun(bazi, age);

    return {
      startAge: daYun.startAge,
      pillars: daYun.pillars.map(p => ({
        ganZhi: p.ganZhi,
        ageRange: `${p.startAge}-${p.endAge}岁`,
        yearRange: `${p.startYear}-${p.endYear}年`,
        stemShiShen: p.stemShiShen,
        wuxing: p.wuxing,
      })),
      // 当前年龄段的大运
      current: this.getCurrentDayun(daYun.pillars),
    };
  }

  /**
   * 分析指定年份的流年
   */
  calculateLiuNian(year: number, bazi: BaZi, startAge: number) {
    const daYun = calculateDaYun(bazi, startAge);
    const liuNian = calculateLiuNian(year, bazi, daYun);

    return {
      year: liuNian.year,
      ganZhi: liuNian.ganZhi,
      tiangan: liuNian.tiangan,
      dizhi: liuNian.dizhi,
      shiShen: liuNian.shiShen,
      wuxing: liuNian.wuxing,
      luckRating: liuNian.luckRating,
      focusAreas: liuNian.focusAreas,
      dayunRelation: liuNian.daYunRelation,
      fateRelation: liuNian.fateRelation,
    };
  }

  private getCurrentDayun(pillars: Array<{ startYear: number; endYear: number; ganZhi: string }>) {
    const currentYear = new Date().getFullYear();
    return pillars.find(p => currentYear >= p.startYear && currentYear <= p.endYear) || null;
  }
}
