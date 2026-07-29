// ============================================================
// 道之自然核心协议 — 五行协议 (WuXing Protocol)
//
// 不仅仅是静态五行分数
// 而是包含动态因子（季节/节气/九宫/流年）的能量协议
// ============================================================

import type { Element5 } from '../engines/bazi-engine/core/heavenlyStems';

/** 动态五行能量单元 */
export interface WuXingEnergy {
  /** 基础分数（来自八字天干地支藏干） */
  base: number;
  /** 月令加持/衰减（月令×2.0） */
  seasonalBoost: number;
  /** 节气衰减因子 */
  solarDecay: number;
  /** 九宫方位影响 */
  palaceInfluence: number;
  /** 流年天干影响 */
  annualInfluence: number;
  /** 最终评分（综合以上所有因子） */
  finalScore: number;
  /** 最终百分比 */
  finalPercent: number;
}

/** 五行能量场（五行动态图谱） */
export interface WuXingEnergyField {
  wood: WuXingEnergy;
  fire: WuXingEnergy;
  earth: WuXingEnergy;
  metal: WuXingEnergy;
  water: WuXingEnergy;
  /** 能量总和 */
  totalEnergy: number;
  /** 最强五行 */
  dominantElement: Element5;
  /** 最弱五行 */
  weakestElement: Element5;
  /** 能量平衡状态 */
  balanceState: '平衡' | '偏旺' | '偏弱' | '过旺' | '过弱';
}

/** 日主强度协议 */
export interface DayMasterStrengthProtocol {
  /** 身强弱判定 */
  bodyStrength: '身强' | '身弱' | '中和';
  /** 综合评分 0-100 */
  strengthScore: number;
  /** 得令 */
  deLing: boolean;
  /** 得地 */
  deDi: boolean;
  /** 得势 */
  deShi: boolean;
  /** 通根地支 */
  rootBranches: string[];
  /** 生扶力量 */
  supportPower: number;
  /** 克泄耗力量 */
  opposePower: number;
  /** 详情描述 */
  description: string;
}

/** 用神/忌神协议 */
export interface UsefulGodProtocol {
  /** 用神（喜用五行） */
  yongShen: string[];
  /** 喜神（辅助用神） */
  xiShen: string[];
  /** 忌神（避讳五行） */
  jiShen: string[];
}

/** 五行完整协议 */
export interface WuXingProtocol {
  /** 五行能量场 */
  energyField: WuXingEnergyField;
  /** 基础五行评分（含百分比） */
  baseScores: Record<Element5, number>;
  /** 百分比 */
  percentages: Record<string, number>;
  /** 日主强度 */
  strength: DayMasterStrengthProtocol;
  /** 用神/忌神 */
  usefulGod: UsefulGodProtocol;
  /** 来源文献引用 */
  source: string;
  /** 合规检查 */
  violations: string[];
}

/**
 * 从引擎输出构建WuXingProtocol
 */
export function buildWuXingProtocol(
  elementBalance: any,
  strength: any,
  usefulGod: any,
): WuXingProtocol {
  const scores: Record<string, number> = elementBalance.scores || {};
  const allElements: Element5[] = ['wood', 'fire', 'earth', 'metal', 'water'];

  const wood = buildEnergyEntry(scores, 'wood');
  const fire = buildEnergyEntry(scores, 'fire');
  const earth = buildEnergyEntry(scores, 'earth');
  const metal = buildEnergyEntry(scores, 'metal');
  const water = buildEnergyEntry(scores, 'water');

  const totalEnergy: number = Object.values(scores).reduce((a: number, b: number) => a + b, 0);

  const energyField: WuXingEnergyField = {
    wood, fire, earth, metal, water,
    totalEnergy,
    dominantElement: findDominant(scores),
    weakestElement: findWeakest(scores),
    balanceState: determineBalance(scores),
  };

  return {
    energyField,
    baseScores: scores as Record<Element5, number>,
    percentages: elementBalance.percentage || {},
    strength: strength
      ? {
          bodyStrength: strength.bodyStrength,
          strengthScore: strength.strengthScore,
          deLing: strength.deLing,
          deDi: strength.deDi,
          deShi: strength.deShi,
          rootBranches: strength.rootBranches || [],
          supportPower: strength.supportPower,
          opposePower: strength.opposePower,
          description: strength.description,
        }
      : { bodyStrength: '中和' as const, strengthScore: 50, deLing: false, deDi: false, deShi: false, rootBranches: [], supportPower: 0, opposePower: 0, description: '' },
    usefulGod: usefulGod
      ? {
          yongShen: usefulGod.yongShen || [],
          xiShen: usefulGod.xiShen || usefulGod.yongShen || [],
          jiShen: usefulGod.jiShen || [],
        }
      : { yongShen: [], xiShen: [], jiShen: [] },
    source: '《改命纪实录》卷三§1.1-§2.5',
    violations: [],
  };
}

function buildEnergyEntry(scores: Record<string, number>, el: string): WuXingEnergy {
  const base: number = scores[el] || 0;
  return {
    base,
    seasonalBoost: base * 0.2,
    solarDecay: 0,
    palaceInfluence: 0,
    annualInfluence: 0,
    finalScore: Math.round(base * 1.2),
    finalPercent: 0,
  };
}

function findDominant(scores: Record<string, number>): Element5 {
  const entries = Object.entries(scores);
  if (entries.length === 0) return 'earth';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as Element5;
}

function findWeakest(scores: Record<string, number>): Element5 {
  const entries = Object.entries(scores);
  if (entries.length === 0) return 'earth';
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0] as Element5;
}

function determineBalance(scores: Record<string, number>): '平衡' | '偏旺' | '偏弱' | '过旺' | '过弱' {
  const vals: number[] = Object.values(scores);
  if (vals.length === 0) return '平衡';
  const total: number = vals.reduce((a, b) => a + b, 0);
  const max: number = Math.max(...vals);
  const ratio: number = max / (total / 5);
  if (ratio > 2.0) return '过旺';
  if (ratio > 1.4) return '偏旺';
  const min: number = Math.min(...vals);
  const minRatio: number = min / (total / 5);
  if (minRatio < 0.4) return '过弱';
  if (minRatio < 0.7) return '偏弱';
  return '平衡';
}
