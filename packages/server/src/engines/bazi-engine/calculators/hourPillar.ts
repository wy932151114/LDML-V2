// ============================================================
// 道之自然·命理引擎 — 时柱计算器
// 日上起时法（五鼠遁）
// 口诀：甲己还加甲，乙庚丙作初...
// 时辰由真太阳时决定，不是标准时间
// ============================================================

import type { StemName } from '../core/heavenlyStems';
import { STEM_LIST } from '../core/heavenlyStems';
import type { BranchName } from '../core/earthlyBranches';
import { BRANCH_LIST, branchToIndex } from '../core/earthlyBranches';
import { getShichenBranch } from '../solar/trueSolarTime';
import type { PillarResult } from './yearPillar';

/**
 * 五鼠遁起时表
 * 甲己日 → 甲子时(天干从甲始)
 * 乙庚日 → 丙子时
 * 丙辛日 → 戊子时
 * 丁壬日 → 庚子时
 * 戊癸日 → 壬子时
 */
const DAY_TO_HOUR_START: Record<StemName, number> = {
  '甲': 0, '己': 0,  // 甲=0
  '乙': 2, '庚': 2,  // 丙=2
  '丙': 4, '辛': 4,  // 戊=4
  '丁': 6, '壬': 6,  // 庚=6
  '戊': 8, '癸': 8,  // 壬=8
};

/**
 * 计算时柱
 * @param hour 小时 (0-23，真太阳时修正后的)
 * @param minute 分钟 (0-59)
 * @param dayStem 日柱天干
 * @returns 时柱干支
 */
export function calcHourPillar(
  hour: number,
  minute: number,
  dayStem: StemName
): PillarResult {
  // 1. 时辰决定时地支
  const hourBranch = getShichenBranch(hour, minute) as BranchName;
  const branchIdx = branchToIndex(hourBranch);

  // 2. 五鼠遁求时天干
  const startIndex = DAY_TO_HOUR_START[dayStem];
  const stemIdx = (startIndex + branchIdx) % 10;

  return {
    heavenlyStem: STEM_LIST[stemIdx],
    earthlyBranch: hourBranch,
    full: `${STEM_LIST[stemIdx]}${hourBranch}`,
  };
}
