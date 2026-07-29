// ============================================================
// 道之自然·命理引擎 — 年柱计算器
// 以立春为界：立春前为上一年干支
// ============================================================

import type { StemName } from '../core/heavenlyStems';
import { STEM_LIST, indexToStem } from '../core/heavenlyStems';
import type { BranchName } from '../core/earthlyBranches';
import { BRANCH_LIST, indexToBranch } from '../core/earthlyBranches';
import { getSolarTermDates } from '../solar/solarTerms';

export interface PillarResult {
  heavenlyStem: StemName;
  earthlyBranch: BranchName;
  full: string;
}

/**
 * 计算年柱
 * @param year 公历年份
 * @param month 公历月份 (1-12)
 * @param day 公历日期
 * @returns 年柱干支
 */
export function calcYearPillar(year: number, month: number, day: number): PillarResult {
  const terms = getSolarTermDates(year);
  const springStart = terms.get('立春');
  const inputDate = new Date(year, month - 1, day);

  // 立春前属于上一年
  let actualYear = year;
  if (springStart && inputDate < springStart) {
    actualYear = year - 1;
  }

  // 年干支: (年份-4) % 60
  const stemIndex = ((actualYear - 4) % 10 + 10) % 10;
  const branchIndex = ((actualYear - 4) % 12 + 12) % 12;

  return {
    heavenlyStem: STEM_LIST[stemIndex],
    earthlyBranch: BRANCH_LIST[branchIndex],
    full: `${STEM_LIST[stemIndex]}${BRANCH_LIST[branchIndex]}`,
  };
}
