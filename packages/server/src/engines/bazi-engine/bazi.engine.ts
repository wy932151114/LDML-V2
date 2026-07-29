// ============================================================
// 道之自然·命理AI系统 — 八字引擎 (BaziEngine)
// 
// 这是整个系统的灵魂核心。
// 所有后续分析（五行/九宫/改命/风水）全部依赖它。
// 
// 架构：模块化引擎
// core/           → 基础常量（天干/地支/藏干/五行/十神）
// solar/          → 太阳时系统（节气/真太阳时/时区）
// calculators/    → 计算器（四柱/五行平衡/身强弱/用神）
// models/         → 数据模型
// ============================================================

import { Injectable } from '@nestjs/common';

// core
import { HEAVENLY_STEMS, STEM_LIST } from './core/heavenlyStems';
import type { StemName } from './core/heavenlyStems';
import { EARTHLY_BRANCHES, BRANCH_LIST } from './core/earthlyBranches';
import type { BranchName } from './core/earthlyBranches';
import { HIDDEN_STEMS } from './core/hiddenStems';
import { getTenGod } from './core/tenGods';
import type { TenGod } from './core/tenGods';
import { ELEMENT_CN } from './core/fiveElements';

// solar
import { calculateTrueSolarTime, getShichen, getShichenBranch } from './solar/trueSolarTime';
import { getMonthBranchBySolarTerm } from './solar/solarTerms';

// calculators
import { calcYearPillar } from './calculators/yearPillar';
import { calcMonthPillar } from './calculators/monthPillar';
import { calcDayPillar } from './calculators/dayPillar';
import { calcHourPillar } from './calculators/hourPillar';
import { calcElementBalance } from './calculators/wuxingBalance';
import { analyzeStrength } from './calculators/strength';
import { calcUsefulGod } from './calculators/usefulGod';
import { getNayin } from './calculators/nayin';
import { getKongWang } from './calculators/kongWang';

import type { BirthInfo, Pillar, BaziResult as BaziResultModel } from './models/BaziResult';

@Injectable()
export class BaziEngine {
  /**
   * 完整八字排盘
   * 输入：出生时间 + 出生地
   * 输出：12项数据（真太阳时/四柱/藏干/十神/纳音/五行/身强弱/用神/忌神）
   * 
   * 这是所有命理分析的入口函数
   */
  calculate(input: BirthInfo): BaziResultModel {
    const { year, month, day, gender } = input;
    let { hour, minute } = input;
    let trueSolarInfo: BaziResultModel['trueSolarTime'];

    // Step 1: 真太阳时修正
    if (input.useTrueSolar && input.longitude !== undefined) {
      const date = new Date(year, month - 1, day, hour, minute);
      const solar = calculateTrueSolarTime(date, input.longitude);
      hour = solar.hour;
      minute = solar.minute;
      trueSolarInfo = {
        hour: solar.hour,
        minute: solar.minute,
        shichen: solar.shichen,
        crossed: solar.crossedShichen,
        offsetMinutes: Math.round(solar.totalOffset),
      };
    }

    // Step 2: 年柱
    const yearPillar = calcYearPillar(year, month, day);
    // Step 3: 月柱（依赖年干）
    const monthPillar = calcMonthPillar(year, month, day, yearPillar.heavenlyStem);
    // Step 4: 日柱
    const dayPillar = calcDayPillar(year, month, day);
    // Step 5: 时柱（依赖日干）
    const hourPillar = calcHourPillar(hour, minute, dayPillar.heavenlyStem);

    // Step 6: 构建完整柱信息（含纳音/藏干/空亡）
    const buildPillar = (p: { heavenlyStem: StemName; earthlyBranch: BranchName; full: string }): Pillar => ({
      ...p,
      nayin: getNayin(p.full),
      hiddenStems: HIDDEN_STEMS[p.earthlyBranch],
      kongWang: getKongWang(p.heavenlyStem, p.earthlyBranch),
    });

    const pillars = {
      year: buildPillar(yearPillar),
      month: buildPillar(monthPillar),
      day: buildPillar(dayPillar),
      hour: buildPillar(hourPillar),
    };

    const dayMaster = dayPillar.heavenlyStem;

    // Step 7: 五行平衡
    const stems = [yearPillar.heavenlyStem, monthPillar.heavenlyStem, dayPillar.heavenlyStem, hourPillar.heavenlyStem];
    const branches = [yearPillar.earthlyBranch, monthPillar.earthlyBranch, dayPillar.earthlyBranch, hourPillar.earthlyBranch];
    const elementBalance = calcElementBalance(stems, branches);

    // Step 8: 日主强弱
    const strength = analyzeStrength(dayMaster, monthPillar.earthlyBranch, branches, stems, elementBalance);

    // Step 9: 用神/忌神
    const usefulGod = calcUsefulGod(HEAVENLY_STEMS[dayMaster].element, strength, elementBalance);

    return {
      trueSolarTime: trueSolarInfo,
      pillars,
      dayMaster,
      gender,
      elementBalance,
      strength,
      usefulGod,
      calculatedAt: new Date(),
    };
  }

  /**
   * 排盘结果 -> 可读字符串
   */
  toString(result: BaziResultModel): string {
    const p = result.pillars;
    const w = result.elementBalance;
    const s = result.strength;
    const u = result.usefulGod;

    const pctStr = Object.entries(w.percentage)
      .map(([k, v]) => `${k} ${v}%`)
      .join(' | ');

    return `【八字排盘结果】
  出生时间：${result.calculatedAt.toISOString()}
  日主：${result.dayMaster}
  性别：${result.gender}
  ─────────────
  年柱：${p.year.full}（${p.year.nayin}）藏干：${p.year.hiddenStems.join('、')}
  月柱：${p.month.full}（${p.month.nayin}）藏干：${p.month.hiddenStems.join('、')}
  日柱：${p.day.full}（${p.day.nayin}）藏干：${p.day.hiddenStems.join('、')}
  时柱：${p.hour.full}（${p.hour.nayin}）藏干：${p.hour.hiddenStems.join('、')}
  ─────────────
  五行分布：${pctStr}
  日主强弱：${s.bodyStrength}（${s.description}）
  用神：${u.yongShen.join('、')}
  忌神：${u.jiShen.join('、')}
  ${result.trueSolarTime ? `  真太阳时修正（偏移${result.trueSolarTime.offsetMinutes}分钟）` : ''}`;
  }

  /**
   * 排盘结果 -> AI结构化输入
   */
  toAiInput(result: BaziResultModel) {
    return {
      bazi: {
        pillars: {
          year: result.pillars.year.full,
          month: result.pillars.month.full,
          day: result.pillars.day.full,
          hour: result.pillars.hour.full,
        },
        dayMaster: result.dayMaster,
        gender: result.gender,
      },
      fiveElements: {
        scores: result.elementBalance.scores,
        percentage: result.elementBalance.percentage,
        bodyStrength: result.strength.bodyStrength,
        yongShen: result.usefulGod.yongShen,
        jiShen: result.usefulGod.jiShen,
      },
    };
  }
}

// 从旧的bazi.engine.ts重定向的导出
export type { BirthInfo as BirthInfoInput, BaziResult as BaziResultOutput } from './models/BaziResult';
