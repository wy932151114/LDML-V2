// ============================================================
// 道之自然·命理引擎 — 地支常量
// 独立文件，含生肖、五行、阴阳
// ============================================================

import type { Element5, YinYang } from './heavenlyStems';

export type BranchName = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

export interface EarthlyBranch {
  name: BranchName;
  element: Element5;
  elementCn: string;
  yinYang: YinYang;
  animal: string;
  /** 五行序号 */
  wxIndex: number;
}

export const EARTHLY_BRANCHES: Record<BranchName, EarthlyBranch> = {
  '子': { name: '子', element: 'water', elementCn: '水', yinYang: 'yang', animal: 'rat',    wxIndex: 4 },
  '丑': { name: '丑', element: 'earth', elementCn: '土', yinYang: 'yin',  animal: 'ox',     wxIndex: 2 },
  '寅': { name: '寅', element: 'wood',  elementCn: '木', yinYang: 'yang', animal: 'tiger',  wxIndex: 0 },
  '卯': { name: '卯', element: 'wood',  elementCn: '木', yinYang: 'yin',  animal: 'rabbit', wxIndex: 0 },
  '辰': { name: '辰', element: 'earth', elementCn: '土', yinYang: 'yang', animal: 'dragon', wxIndex: 2 },
  '巳': { name: '巳', element: 'fire',  elementCn: '火', yinYang: 'yin',  animal: 'snake',  wxIndex: 1 },
  '午': { name: '午', element: 'fire',  elementCn: '火', yinYang: 'yang', animal: 'horse',  wxIndex: 1 },
  '未': { name: '未', element: 'earth', elementCn: '土', yinYang: 'yin',  animal: 'goat',   wxIndex: 2 },
  '申': { name: '申', element: 'metal', elementCn: '金', yinYang: 'yang', animal: 'monkey', wxIndex: 3 },
  '酉': { name: '酉', element: 'metal', elementCn: '金', yinYang: 'yin',  animal: 'rooster',wxIndex: 3 },
  '戌': { name: '戌', element: 'earth', elementCn: '土', yinYang: 'yang', animal: 'dog',    wxIndex: 2 },
  '亥': { name: '亥', element: 'water', elementCn: '水', yinYang: 'yin',  animal: 'pig',    wxIndex: 4 },
};

export const BRANCH_LIST: BranchName[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 地支转序号 (0-11) */
export function branchToIndex(branch: BranchName): number {
  return BRANCH_LIST.indexOf(branch);
}

/** 序号转地支 */
export function indexToBranch(index: number): BranchName {
  return BRANCH_LIST[((index % 12) + 12) % 12];
}

/** 生肖对应 */
export function getAnimal(branch: BranchName): string {
  return EARTHLY_BRANCHES[branch].animal;
}
