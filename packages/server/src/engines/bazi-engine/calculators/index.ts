// ============================================================
// 道之自然·命理引擎 — calculators 统一导出
// ============================================================

export { calcYearPillar } from './yearPillar';
export { calcMonthPillar } from './monthPillar';
export { calcDayPillar } from './dayPillar';
export { calcHourPillar } from './hourPillar';
export type { PillarResult } from './yearPillar';

export { calcElementBalance } from './wuxingBalance';
export type { ElementScore } from './wuxingBalance';

export { analyzeStrength } from './strength';
export type { StrengthResult } from './strength';

export { calcUsefulGod } from './usefulGod';
export type { UsefulGodResult } from './usefulGod';

export { getNayin } from './nayin';
export { getKongWang, isKongWang } from './kongWang';

/** 获取六十甲子序号 (0-59) */
export function getGanZhiIndex(stem: string, branch: string): number {
  const si = STEM_LIST.indexOf(stem as any);
  const bi = BRANCH_LIST.indexOf(branch as any);
  if (si === -1 || bi === -1) return -1;
  const offset = ((bi - si) % 12 + 12) % 12;
  return (si + offset * 10) % 60;
}
import { STEM_LIST } from '../core/heavenlyStems';
import { BRANCH_LIST } from '../core/earthlyBranches';
