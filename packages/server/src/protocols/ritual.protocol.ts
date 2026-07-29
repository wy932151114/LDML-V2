// ============================================================
// 道之自然核心协议 — 仪式协议 (Ritual Protocol)
// 
// 改命仪式/布局的标准输出
// AI层只能读取此协议，不得自行增减仪式内容
// ============================================================

/** 仪式类型 */
export type RitualType = 
  | '开光' | '供奉' | '摆放' | '佩带' 
  | '安宅' | '净宅' | '招财' | '化煞' 
  | '求缘' | '学业' | '健康' | '事业';

/** 仪式物品 */
export interface RitualItem {
  /** 物品名称 */
  name: string;
  /** 对应五行 */
  wuxing: string;
  /** 用途说明 */
  purpose: string;
  /** 来源文献 */
  source: string;
}

/** 仪式时辰 */
export interface RitualTime {
  /** 时辰 */
  shichen: string;
  /** 地支 */
  branch: string;
  /** 吉凶评级 */
  rating: '上吉' | '吉' | '平' | '凶';
  /** 适宜使用 */
  suitable: string;
}

/** 仪式方向 */
export interface RitualDirection {
  /** 方位 */
  direction: string;
  /** 寓意 */
  meaning: string;
  /** 宜 */
  suitable: string;
}

/** 仪式方案协议 */
export interface RitualProtocol {
  /** 仪式名称 */
  name: string;
  /** 类型 */
  type: RitualType;
  /** 目的 */
  purpose: string;
  /** 对应的用神五行 */
  targetWuxing: string;
  /** 所需物品 */
  items: RitualItem[];
  /** 最佳时辰 */
  bestTime: RitualTime;
  /** 可选的次佳时辰 */
  alternativeTimes: RitualTime[];
  /** 方位 */
  direction: RitualDirection;
  /** 持续周期（天） */
  durationDays: number;
  /** 效果开始时间 */
  effectStart: string;
  /** 注意事项 */
  precautions: string[];
  /** 禁忌 */
  taboos: string[];
  /** 来源文献 */
  source: string;
  /** 合规 */
  violations: string[];
}

/** 日仪式建议协议 */
export interface DailyRitualProtocol {
  /** 今日最推荐的仪式 */
  recommendedRituals: RitualProtocol[];
  /** 今日最佳时辰 */
  todayBestTime: RitualTime;
  /** 今日最佳方位 */
  todayBestDirection: string;
  /** 今日禁忌 */
  todayTaboos: string[];
}
