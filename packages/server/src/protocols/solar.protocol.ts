// ============================================================
// 道之自然核心协议 — 节气/太阳时协议 (Solar Protocol)
// 
// 管理节气日期、真太阳时修正、时辰判定的标准输出
// AI层只能读此协议，不可自行计算节气
// ============================================================

/** 节气信息协议 */
export interface SolarTermProtocol {
  /** 节气名称 */
  name: string;
  /** 阳历日期 */
  date: Date;
  /** 对应的月地支 */
  monthBranch: string;
  /** 太阳黄经 */
  longitude: number;
}

/** 真太阳时修正协议 */
export interface TrueSolarProtocol {
  /** 原始北京时间（小时） */
  beijingHour: number;
  /** 原始北京时间（分钟） */
  beijingMinute: number;
  /** 出生地经度 */
  longitude: number;
  /** 经度修正（分钟） */
  longitudeCorrection: number;
  /** 均时差修正（分钟） */
  equationOfTime: number;
  /** 总修正（分钟） */
  totalOffset: number;
  /** 修正后小时 */
  correctedHour: number;
  /** 修正后分钟 */
  correctedMinute: number;
  /** 修正后时辰名称 */
  shichen: string;
  /** 修正后时辰地支 */
  shichenBranch: string;
  /** 是否跨时辰 */
  crossedShichen: boolean;
}

/** 完整节气协议 */
export interface SolarProtocol {
  /** 协议版本 */
  version: string;
  /** 当年所有节气 */
  annualTerms: SolarTermProtocol[];
  /** 当前或指定节气 */
  currentTerm?: SolarTermProtocol;
  /** 真太阳时 */
  trueSolar?: TrueSolarProtocol;
  /** 当前月令 */
  currentMonthBranch: string;
  /** 数据来源 */
  source: string;
  /** 引擎来源 */
  engineSource: string;
  /** 合规检查 */
  violations: string[];
}

/**
 * 构建SolarProtocol
 */
export function buildSolarProtocol(
  annualTerms: SolarTermProtocol[],
  currentMonthBranch: string,
  trueSolar?: TrueSolarProtocol,
): SolarProtocol {
  return {
    version: '2.3',
    annualTerms,
    trueSolar,
    currentMonthBranch,
    source: '《改命纪实录》卷一§3.1-§3.5',
    engineSource: 'lunar-typescript v3 (天文台精确数据)',
    violations: [],
  };
}
