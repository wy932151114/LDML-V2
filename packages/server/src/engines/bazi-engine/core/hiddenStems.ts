// ============================================================
// 道之自然·命理引擎 — 藏干系统
// 独立文件，极其重要
// 每个地支所藏的天干（本气→中气→余气）
// ============================================================

import type { StemName } from './heavenlyStems';
import type { BranchName } from './earthlyBranches';

/**
 * 藏干表
 * 第1个为本气（主气），第2个为中气，第3个为余气
 * 对应月令主事之分野
 */
export const HIDDEN_STEMS: Record<BranchName, StemName[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '戊', '庚'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

/** 获取本气（主要能量） */
export function getMainStem(branch: BranchName): StemName {
  return HIDDEN_STEMS[branch][0];
}

/** 获取中气（次要能量，可能没有） */
export function getMiddleStem(branch: BranchName): StemName | null {
  return HIDDEN_STEMS[branch].length >= 2 ? HIDDEN_STEMS[branch][1] : null;
}

/** 获取余气（残留能量，可能没有） */
export function getRemnantStem(branch: BranchName): StemName | null {
  return HIDDEN_STEMS[branch].length >= 3 ? HIDDEN_STEMS[branch][2] : null;
}

/** 获取某地支所有藏干（按权重排列） */
export function getAllHiddenStems(branch: BranchName): StemName[] {
  return [...HIDDEN_STEMS[branch]];
}

/** 藏干数量 */
export function getHiddenStemCount(branch: BranchName): number {
  return HIDDEN_STEMS[branch].length;
}
