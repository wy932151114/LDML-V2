// ============================================================
// 道之自然核心协议 — 八字协议 (Bazi Protocol)
// 版本 2.3
// 
// 所有AI分析层、报告层、风水层读取这个协议对象
// 算法层产出此协议，AI层只能读取，不可修改
// ============================================================

import type { StemName } from '../engines/bazi-engine/core/heavenlyStems';
import type { BranchName } from '../engines/bazi-engine/core/earthlyBranches';
import type { Element5 } from '../engines/bazi-engine/core/heavenlyStems';

/** 单柱协议 */
export interface PillarProtocol {
  heavenlyStem: StemName;
  earthlyBranch: BranchName;
  full: string;
  nayin: string;
  hiddenStems: StemName[];
  kongWang: BranchName[];
  /** 十神关系（以日主为参照） */
  tenGod?: string;
}

/** 四柱集合 */
export interface FourPillarsProtocol {
  year: PillarProtocol;
  month: PillarProtocol;
  day: PillarProtocol;
  hour: PillarProtocol;
}

/** 八字完整协议 — AI层唯一可读的八字数据 */
export interface BaziProtocol {
  /** 协议版本 */
  version: string;
  /** 四柱 */
  pillars: FourPillarsProtocol;
  /** 日主 */
  dayMaster: StemName;
  /** 日主五行 */
  dayMasterElement: Element5;
  /** 性别 */
  gender: string;
  /** 真太阳时信息 */
  trueSolarTime?: {
    hour: number;
    minute: number;
    shichen: string;
    crossed: boolean;
    offsetMinutes: number;
  };
  /** 计算时间 */
  calculatedAt: Date;
  /** 来源文献引用 */
  source: string;
  /** 合规检查结果 */
  violations: string[];
}

/**
 * 从引擎输出构建BaziProtocol
 * 确保AI层只能读取不能修改
 */
export function buildBaziProtocol(
  engineOutput: any,
  options?: { version?: string },
): BaziProtocol {
  const v = options?.version || '2.3';
  return {
    version: v,
    pillars: engineOutput.pillars as FourPillarsProtocol,
    dayMaster: engineOutput.dayMaster,
    dayMasterElement: (engineOutput.strength?.dayMasterElement || 'earth') as Element5,
    gender: engineOutput.gender || '男',
    trueSolarTime: engineOutput.trueSolarTime,
    calculatedAt: engineOutput.calculatedAt || new Date(),
    source: '《改命纪实录》卷二§1.1-§2.7',
    violations: [],
  };
}
