// ============================================================
// 道之自然·命理引擎 — 月柱计算器
// 年上起月法（五虎遁）
// 口诀：甲己之年丙作首，乙庚之岁戊为头...
// 月令由节气决定，不是农历月份
// ============================================================

import type { StemName } from '../core/heavenlyStems';
import { indexToStem, STEM_LIST } from '../core/heavenlyStems';
import type { BranchName } from '../core/earthlyBranches';
import { BRANCH_LIST, branchToIndex } from '../core/earthlyBranches';
import { getMonthBranchBySolarTerm } from '../solar/solarTerms';
import type { PillarResult } from './yearPillar';

/**
 * 五虎遁起月表
 * 甲己年 → 丙寅月(天干从丙始)
 * 乙庚年 → 戊寅月
 * 丙辛年 → 庚寅月
 * 丁壬年 → 壬寅月
 * 戊癸年 → 甲寅月
 */
const YEAR_TO_MONTH_START: Record<StemName, number> = {
  '甲': 2, '己': 2,  // 丙=2
  '乙': 4, '庚': 4,  // 戊=4
  '丙': 6, '辛': 6,  // 庚=6
  '丁': 8, '壬': 8,  // 壬=8
  '戊': 0, '癸': 0,  // 甲=0
};

/**
 * 计算月柱
 * @param year 公历年份
 * @param month 公历月份
 * @param day 公历日期
 * @param yearStem 年柱天干（来自年柱计算）
 * @returns 月柱干支
 */
export function calcMonthPillar(
  year: number,
  month: number,
  day: number,
  yearStem: StemName
): PillarResult {
  // 1. 节气决定月地支
  const monthBranch = getMonthBranchBySolarTerm(year, month, day);
  const branchIdx = branchToIndex(monthBranch);

  // 2. 五虎遁求月天干
  const startIndex = YEAR_TO_MONTH_START[yearStem];
  // 地支从寅(2)开始，偏移量 = (当前地支序号 - 2 + 12) % 12
  const offset = (branchIdx - 2 + 12) % 12;
  const stemIdx = (startIndex + offset) % 10;

  return {
    heavenlyStem: STEM_LIST[stemIdx],
    earthlyBranch: monthBranch,
    full: `${STEM_LIST[stemIdx]}${monthBranch}`,
  };
}
