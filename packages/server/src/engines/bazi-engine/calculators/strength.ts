// ============================================================
// 道之自然·命理引擎 — 日主强弱判定
// 综合判断维度：得令/得地/得势/生扶/克泄耗
// 这是整个命理分析最关键的一步
// ============================================================

import type { Element5 } from '../core/heavenlyStems';
import { HEAVENLY_STEMS } from '../core/heavenlyStems';
import type { BranchName } from '../core/earthlyBranches';
import { EARTHLY_BRANCHES } from '../core/earthlyBranches';
import { HIDDEN_STEMS, getMainStem } from '../core/hiddenStems';
import { GENERATE, DRAIN, CONTROL, CONSUME, ELEMENT_CN, cnToElement } from '../core/fiveElements';
import type { ElementScore } from './wuxingBalance';

export interface StrengthResult {
  /** 日主五行 */
  dayMasterElement: Element5;
  /** 得令：是否生于月令旺相 */
  deLing: boolean;
  /** 得地：地支是否有本气通根 */
  deDi: boolean;
  /** 通根地支 */
  rootBranches: string[];
  /** 得势：是否有同五行天干 */
  deShi: boolean;
  /** 生扶力量 */
  supportPower: number;
  /** 克泄耗力量 */
  opposePower: number;
  /** 日主强弱评分 (0-100) */
  strengthScore: number;
  /** 身强弱 */
  bodyStrength: '身强' | '身弱' | '中和';
  /** 力量描述 */
  description: string;
}

/**
 * 日主强弱综合判定
 * 
 * 判定维度：
 * 1. 得令：日主是否生于当令之月（月令加倍）
 * 2. 得地：地支是否有本气通根（尤其是日支和月支）
 * 3. 得势：天干是否有比劫相助
 * 4. 生扶：生我的印星力量
 * 5. 克泄耗：克我、我生、我克的力量总和
 */
export function analyzeStrength(
  dayMaster: string,
  monthBranch: BranchName,
  branches: BranchName[],
  stems: string[],
  elementBalance: ElementScore,
): StrengthResult {
  const dmEl = HEAVENLY_STEMS[dayMaster as keyof typeof HEAVENLY_STEMS].element;
  const monthEl = EARTHLY_BRANCHES[monthBranch].element;
  const dmCn = ELEMENT_CN[dmEl];
  const monthCn = ELEMENT_CN[monthEl];

  // 1. 得令：日主五行 == 月令五行
  const deLing = dmEl === monthEl;

  // 2. 得地：地支是否有日主本气
  let deDi = false;
  const rootBranches: string[] = [];
  for (const br of branches) {
    const mainStem = getMainStem(br);
    const stemEl = HEAVENLY_STEMS[mainStem].element;
    if (stemEl === dmEl) {
      deDi = true;
      rootBranches.push(br);
    }
  }

  // 3. 得势：天干是否有比劫
  let deShi = false;
  for (const s of stems) {
    const sEl = HEAVENLY_STEMS[s as keyof typeof HEAVENLY_STEMS].element;
    if (sEl === dmEl) deShi = true;
  }

  // 4. 生扶力量：生我(印) + 同我(比劫)
  const generateMe = DRAIN[dmEl];  // 生我者
  const support = elementBalance.scores[dmEl] + (elementBalance.scores[generateMe] || 0);

  // 5. 克泄耗力量：克我(官杀) + 我生(食伤) + 我克(财)
  const controlMe = CONSUME[dmEl];  // 克我
  const iGenerate = GENERATE[dmEl]; // 我生
  const iControl = CONTROL[dmEl];   // 我克
  const oppose = (elementBalance.scores[controlMe] || 0)
               + (elementBalance.scores[iGenerate] || 0)
               + (elementBalance.scores[iControl] || 0);

  // 综合评分
  const total = support + oppose;
  const strengthScore = total > 0 ? Math.round((support / total) * 100) : 50;

  // 判定
  let bodyStrength: '身强' | '身弱' | '中和';
  let description: string;

  if (strengthScore >= 65) {
    bodyStrength = '身强';
    description = `日主${dmCn}${deLing ? '得令' : '失令'}，${deDi ? '通根' : '根浅'}，${deShi ? '得势' : '势单'}。生扶(${support}) > 克泄耗(${oppose})，身强。`;
  } else if (strengthScore <= 40) {
    bodyStrength = '身弱';
    description = `日主${dmCn}${deLing ? '得令' : '失令'}，${deDi ? '有根' : '无根'}，${deShi ? '有助' : '无助'}。克泄耗(${oppose}) > 生扶(${support})，身弱。`;
  } else {
    bodyStrength = '中和';
    description = `日主${dmCn}五行能量较为均衡，生扶(${support})与克泄耗(${oppose})相当，中和。`;
  }

  return {
    dayMasterElement: dmEl,
    deLing,
    deDi,
    rootBranches,
    deShi,
    supportPower: support,
    opposePower: oppose,
    strengthScore,
    bodyStrength,
    description,
  };
}
