// ============================================================
// 道之自然·命理引擎 — 日柱计算器
// 使用干支纪日算法，以1900年1月1日为基准
// 1900-01-01 为甲子日（日干支序号0）
// ============================================================

import { indexToStem, STEM_LIST } from '../core/heavenlyStems';
import { indexToBranch, BRANCH_LIST } from '../core/earthlyBranches';
import type { PillarResult } from './yearPillar';

/**
 * 计算日柱
 * @param year 公历年份
 * @param month 公历月份 (1-12)
 * @param day 公历日期
 * @returns 日柱干支
 * 
 * 公式：计算从1900-01-01(甲子日)到目标日期的天数差
 * 日干支 = (天数差 % 60)
 */
export function calcDayPillar(year: number, month: number, day: number): PillarResult {
  // 基准日：1900年1月1日（甲子日，序号0）
  const refDate = new Date(1900, 0, 1);
  const targetDate = new Date(year, month - 1, day);

  // 天数差
  const diffMs = targetDate.getTime() - refDate.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  // 日干支序号 (0-59)
  const idx = ((diffDays % 60) + 60) % 60;

  return {
    heavenlyStem: STEM_LIST[idx % 10],
    earthlyBranch: BRANCH_LIST[idx % 12],
    full: `${STEM_LIST[idx % 10]}${BRANCH_LIST[idx % 12]}`,
  };
}
