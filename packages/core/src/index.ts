// ============================================================
// 道之自然·核心算法库 — 统一导出入口
// ============================================================

// 类型导出
export * from './types/index';

// 工具/常量
export * from './utils/constants';

// 八字引擎
export {
  calculateBaZi,
  baZiToString,
  calcTrueSolarTime,
  getSolarTermsForYear,
} from './bazi/core';
export type { BaZiInput } from './bazi/core';

// 五行系统
export {
  calculateWuXing,
  analyzeShiShen,
  wuxingToString,
  scoreWuXing,
  determineYongShen,
  analyzeDayMasterStrength,
} from './wuxing/analysis';

// 九宫飞星
export {
  calculateNinePalace,
  ninePalaceToString,
  getYearStarCenter,
  getMonthStarCenter,
  getDayStarCenter,
  generateFlyingStarLayout,
  analyzeStarPair,
  calculateMingGua,
  PALACE_NAMES,
  PALACE_DIRECTIONS,
  PALACE_WU_XING,
} from './jiugong/flyingStar';

// 大运流年
export {
  calculateDaYun,
  calculateLiuNian,
  calculateStartLuckAge,
} from './dayun/dayunEngine';

// 神煞
export {
  analyzeShenSha,
} from './shensha/shensha';
