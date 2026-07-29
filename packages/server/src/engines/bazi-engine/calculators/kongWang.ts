// ============================================================
// 道之自然·命理引擎 — 空亡（旬空）
// 甲子旬→戌亥空，甲戌旬→申酉空...
// ============================================================

import type { BranchName } from '../core/earthlyBranches';
import { STEM_LIST, indexToStem } from '../core/heavenlyStems';
import { BRANCH_LIST, indexToBranch } from '../core/earthlyBranches';
import { getGanZhiIndex } from './index';

/**
 * 空亡表
 * 每旬有两个地支为空亡
 */
const KONG_WANG: Record<string, BranchName[]> = {
  '甲子': ['戌', '亥'],
  '甲戌': ['申', '酉'],
  '甲申': ['午', '未'],
  '甲午': ['辰', '巳'],
  '甲辰': ['寅', '卯'],
  '甲寅': ['子', '丑'],
};

/**
 * 获取某干支的空亡地支
 * @param stem 天干
 * @param branch 地支
 * @returns 空亡地支列表
 */
export function getKongWang(stem: string, branch: string): BranchName[] {
  // 找到旬首（天干为甲）
  const stemIdx = STEM_LIST.indexOf(stem as any);
  const branchIdx = BRANCH_LIST.indexOf(branch as any);
  if (stemIdx === -1 || branchIdx === -1) return [];

  const offset = stemIdx; // 到甲的距离
  const xunShouBranchIdx = ((branchIdx - offset) % 12 + 12) % 12;
  const xunShouBranch = BRANCH_LIST[xunShouBranchIdx];
  const key = `甲${xunShouBranch}` as keyof typeof KONG_WANG;

  return KONG_WANG[key] || [];
}

/**
 * 判断某地支是否为空亡
 */
export function isKongWang(stem: string, branch: string, targetBranch: string): boolean {
  const kw = getKongWang(stem, branch);
  return kw.includes(targetBranch as BranchName);
}
