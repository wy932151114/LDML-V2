// ============================================================
// 道之自然·命理引擎 — 数据模型
// BirthInfo: 出生信息输入
// BaziResult: 排盘结果输出
// ============================================================

import type { StemName } from '../core/heavenlyStems';
import type { BranchName } from '../core/earthlyBranches';
import type { StrengthResult } from '../calculators/strength';
import type { UsefulGodResult } from '../calculators/usefulGod';
import type { ElementScore } from '../calculators/wuxingBalance';

/** 出生信息输入 */
export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  longitude?: number;
  useTrueSolar?: boolean;
  birthPlace?: string;
}

/** 单柱信息 */
export interface Pillar {
  heavenlyStem: StemName;
  earthlyBranch: BranchName;
  full: string;
  nayin: string;
  hiddenStems: StemName[];
  kongWang: BranchName[];
}

/** 排盘完整结果 */
export interface BaziResult {
  /** 真太阳时处理后的时间 */
  trueSolarTime?: {
    hour: number;
    minute: number;
    shichen: string;
    crossed: boolean;
    offsetMinutes: number;
  };
  /** 四柱 */
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  /** 日主 */
  dayMaster: StemName;
  /** 性别 */
  gender: string;
  /** 五行评分 */
  elementBalance: ElementScore;
  /** 日主强弱 */
  strength: StrengthResult;
  /** 用神/喜神/忌神 */
  usefulGod: UsefulGodResult;
  /** 排盘时间 */
  calculatedAt: Date;
}
