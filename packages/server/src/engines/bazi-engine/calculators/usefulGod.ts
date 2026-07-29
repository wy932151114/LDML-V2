// ============================================================
// 道之自然·命理引擎 — 用神算法
// 根据日主强弱确定用神/喜神/忌神
// 身强→克泄耗为用，身弱→生扶为用
// ============================================================

import type { Element5 } from '../core/heavenlyStems';
import { ELEMENT_CN, GENERATE, CONTROL, ALL_ELEMENTS } from '../core/fiveElements';
import type { StrengthResult } from './strength';
import type { ElementScore } from './wuxingBalance';

export interface UsefulGodResult {
  /** 用神（最需要的五行） */
  yongShen: string[];
  /** 喜神 */
  xiShen: string[];
  /** 忌神 */
  jiShen: string[];
  /** 平衡状态 */
  balanceState: '平衡' | '偏旺' | '偏弱' | '过旺' | '过弱';
  /** 缺失的五行 */
  missing: string[];
  /** 过旺的五行 */
  excess: string[];
}

/**
 * 用神/喜神/忌神算法
 * 
 * 核心原则（道之自然）：
 * 1. 身强→用克泄耗（官杀、食伤、财）
 * 2. 身弱→用生扶（印星、比劫）
 * 3. 过旺需疏通（通关为要）
 * 4. 过弱需补益（扶抑为法）
 */
export function calcUsefulGod(
  dayMasterElement: Element5,
  strength: StrengthResult,
  elementBalance: ElementScore,
): UsefulGodResult {
  const scores = elementBalance.scores;
  const dmEl = dayMasterElement;

  // 缺失五行：得分<20
  const missing = ALL_ELEMENTS
    .filter(el => scores[el] < 20 && el !== dmEl)
    .map(el => ELEMENT_CN[el]);

  // 过旺五行：得分>150
  const excess = ALL_ELEMENTS
    .filter(el => scores[el] > 150)
    .map(el => ELEMENT_CN[el]);

  // 平衡状态
  let balanceState: '平衡' | '偏旺' | '偏弱' | '过旺' | '过弱';
  const maxScore = Math.max(...Object.values(scores));
  const minScore = Math.min(...Object.values(scores));
  if (strength.strengthScore >= 75) balanceState = maxScore > 200 ? '过旺' : '偏旺';
  else if (strength.strengthScore <= 30) balanceState = minScore < 20 ? '过弱' : '偏弱';
  else balanceState = '平衡';

  // 用神/喜神/忌神
  let yongShen: Element5[];
  let xiShen: Element5[];
  let jiShen: Element5[];

  if (strength.bodyStrength === '身强') {
    // 身强：克我(官杀) + 我生(食伤) + 我克(财) 为用
    // 克我：找到能克制日主五行的元素
    const controlMe = Object.entries(CONTROL).find(([, v]) => v === dmEl)?.[0] as Element5;
    const iGenerate = GENERATE[dmEl]; // 我生
    const iControl = CONTROL[dmEl];   // 我克
    yongShen = [controlMe, iGenerate, iControl].filter((v, i, a) => a.indexOf(v) === i);
    xiShen = yongShen.map(el => {
      // 喜神 = 生用神的
      for (const [k, v] of Object.entries(GENERATE)) {
        if (v === el) return k as Element5;
      }
      return el;
    }).filter((v, i, a) => a.indexOf(v) === i);
    // 忌神：生我（印）+ 同我（比劫）
    const strengthenMe = Object.entries(GENERATE).find(([, v]) => v === dmEl)?.[0] as Element5;
    jiShen = [dmEl, strengthenMe].filter((v, i, a) => a.indexOf(v) === i);
  } else if (strength.bodyStrength === '身弱') {
    // 身弱：生我(印) + 同我(比劫) 为用
    const generateMe = Object.entries(GENERATE).find(([, v]) => v === dmEl)?.[0] as Element5;
    yongShen = [generateMe, dmEl].filter((v, i, a) => a.indexOf(v) === i);
    xiShen = [generateMe, dmEl];
    // 忌神：克我（官杀）
    const controlMe = Object.entries(CONTROL).find(([, v]) => v === dmEl)?.[0] as Element5;
    jiShen = [controlMe].filter((v, i, a) => a.indexOf(v) === i);
  } else {
    // 中和：哪弱补哪
    const min = Math.min(...Object.values(scores));
    yongShen = ALL_ELEMENTS.filter(el => scores[el] === min);
    xiShen = ALL_ELEMENTS.filter(el => scores[el] < 40);
    jiShen = ALL_ELEMENTS.filter(el => scores[el] > 100);
    if (yongShen.length === 0) yongShen = [dmEl];
  }

  return {
    yongShen: Array.from(new Set(yongShen)).map(el => ELEMENT_CN[el]),
    xiShen: Array.from(new Set(xiShen)).map(el => ELEMENT_CN[el]),
    jiShen: Array.from(new Set(jiShen)).map(el => ELEMENT_CN[el]),
    balanceState,
    missing,
    excess,
  };
}
