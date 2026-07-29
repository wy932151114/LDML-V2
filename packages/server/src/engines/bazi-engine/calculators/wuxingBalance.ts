// ============================================================
// 道之自然·命理引擎 — 五行平衡计算器
// 天干+地支+藏干的五行力量统计
// 月令加权（道之自然特色：月令加倍）
// ============================================================

import type { Element5 } from '../core/heavenlyStems';
import { HEAVENLY_STEMS } from '../core/heavenlyStems';
import type { BranchName } from '../core/earthlyBranches';
import { EARTHLY_BRANCHES } from '../core/earthlyBranches';
import { HIDDEN_STEMS } from '../core/hiddenStems';
import { ALL_ELEMENTS, ELEMENT_CN, cnToElement } from '../core/fiveElements';

export interface ElementScore {
  scores: Record<Element5, number>;
  percentage: Record<string, number>;
  totalScore: number;
}

/**
 * 月令权重表
 * 每个地支在各月的五行力量比重
 * 道之自然特色：月令加倍
 */
const MONTH_POWER: Record<BranchName, Record<Element5, number>> = {
  '寅': { wood: 60,  fire: 25, earth: 10, metal: 0,  water: 5  },
  '卯': { wood: 100, fire: 0,  earth: 0,  metal: 0,  water: 0  },
  '辰': { wood: 20,  fire: 10, earth: 50, metal: 10, water: 10 },
  '巳': { wood: 15,  fire: 60, earth: 15, metal: 0,  water: 10 },
  '午': { wood: 0,   fire: 100,earth: 0,  metal: 0,  water: 0  },
  '未': { wood: 10,  fire: 20, earth: 50, metal: 10, water: 10 },
  '申': { wood: 10,  fire: 0,  earth: 15, metal: 60, water: 15 },
  '酉': { wood: 0,   fire: 0,  earth: 0,  metal: 100,water: 0  },
  '戌': { wood: 10,  fire: 10, earth: 50, metal: 20, water: 10 },
  '亥': { wood: 20,  fire: 0,  earth: 10, metal: 10, water: 60 },
  '子': { wood: 0,   fire: 0,  earth: 0,  metal: 5,  water: 95 },
  '丑': { wood: 10,  fire: 10, earth: 50, metal: 20, water: 10 },
};

/**
 * 计算五行动态能量
 * 考虑因素：
 * 1. 天干透干（高权重）
 * 2. 地支本气（中等权重）
 * 3. 藏干余气（低权重）
 * 4. 月令加权（道之自然特色）
 * 
 * @param stems 天干数组 [年干, 月干, 日干, 时干]
 * @param branches 地支数组 [年支, 月支, 日支, 时支]
 * @returns 五行评分
 */
export function calcElementBalance(
  stems: string[],
  branches: BranchName[],
): ElementScore {
  const scores: Record<Element5, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const monthZhi = branches[1]; // 月支
  const monthPower = MONTH_POWER[monthZhi];

  for (let i = 0; i < 4; i++) {
    const stemKey = stems[i] as keyof typeof HEAVENLY_STEMS;
    const stemInfo = HEAVENLY_STEMS[stemKey];
    const branchInfo = EARTHLY_BRANCHES[branches[i]];
    const hiddenStems = HIDDEN_STEMS[branches[i]];

    // === 天干（透干）权重高 ===
    let stemScore = 36;
    const stemEl = stemInfo.element;
    // 月令加权：如果天干五行与月令五行相合，加分
    if (monthPower[stemEl] > 50) stemScore *= 1.3;
    else if (monthPower[stemEl] < 10) stemScore *= 0.8;
    // 月令五行与天干相同加倍
    const monthEl = EARTHLY_BRANCHES[monthZhi].element;
    if (stemEl === monthEl) stemScore *= 1.5;
    scores[stemEl] += Math.round(stemScore);

    // === 地支（本气）权重中等 ===
    let branchScore = 24;
    branchScore *= (monthPower[branchInfo.element] / 50 + 0.5);
    scores[branchInfo.element] += Math.round(branchScore);

    // === 藏干（余气）权重低 ===
    for (let j = 0; j < hiddenStems.length; j++) {
      const cangEl = HEAVENLY_STEMS[hiddenStems[j]].element;
      let cangScore = 10;
      if (j === 0) cangScore = 16;    // 本气
      else if (j === 1) cangScore = 12; // 中气
      scores[cangEl] += cangScore;
    }
  }

  // 百分比
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentage: Record<string, number> = {};
  for (const el of ALL_ELEMENTS) {
    percentage[ELEMENT_CN[el]] = Math.round((scores[el] / totalScore) * 100);
  }

  return { scores, percentage, totalScore };
}
