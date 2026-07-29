// ============================================================
// 道之自然核心协议 — 风水协议 (FengShui Protocol)
// 
// 九宫飞星空间引擎的标准输出
// AI层只能读取此协议，不可自行编造方位信息
// ============================================================

/** 九星协议 */
export interface NineStarProtocol {
  /** 星数 1-9 */
  number: number;
  /** 星名 */
  name: string;
  /** 吉凶类型 */
  type: '大吉' | '吉' | '中性' | '凶' | '大凶';
  /** 五行 */
  wuxing: string;
  /** 能量 % */
  energy: number;
  /** 宜 */
  suitable: string;
  /** 忌 */
  avoid: string;
}

/** 宫位协议 */
export interface PalaceProtocol {
  /** 宫位编号 1-9 */
  position: number;
  /** 宫名（坎/坤/震/巽/中/乾/兑/艮/离） */
  name: string;
  /** 方位（北/西南/东/东南/中/西北/西/东北/南） */
  direction: string;
  /** 当值星 */
  star: NineStarProtocol;
  /** 该宫五行 */
  palaceWuxing: string;
  /** 该宫能量% */
  energy: number;
  /** 综合评级 */
  rating: '大吉' | '吉' | '平' | '凶' | '大凶';
}

/** 空间冲突检测结果 */
export interface SpatialConflict {
  /** 冲突类型 */
  type: '五行相克' | '飞星冲突' | '命主相冲' | '三煞' | '五黄';
  /** 涉及宫位 */
  palaces: string[];
  /** 严重程度 */
  severity: '轻微' | '中等' | '严重';
  /** 描述 */
  description: string;
  /** 化解建议 */
  remedy?: string;
}

/** 九宫全日布局协议 */
export interface NinePalaceDailyProtocol {
  /** 日期 */
  date: Date;
  /** 年干支 */
  yearGanZhi: string;
  /** 月干支 */
  monthGanZhi: string;
  /** 日干支 */
  dayGanZhi: string;
  /** 年入中星 */
  yearStar: NineStarProtocol;
  /** 月入中星 */
  monthStar: NineStarProtocol;
  /** 日入中星 */
  dayStar: NineStarProtocol;
  /** 年飞星九宫 */
  yearPalaces: PalaceProtocol[];
  /** 月飞星九宫 */
  monthPalaces: PalaceProtocol[];
  /** 日飞星九宫 */
  dayPalaces: PalaceProtocol[];
  /** 最佳方位 */
  bestDirection: string;
  /** 最差方位 */
  worstDirection: string;
  /** 空间冲突 */
  conflicts: SpatialConflict[];
}

/** 命主空间映射 */
export interface UserSpaceMapping {
  /** 命主用神对应方位 */
  yongShenDirections: string[];
  /** 命主忌神对应方位 */
  jiShenDirections: string[];
  /** 本命文昌位 */
  wenChangPosition: string;
  /** 本命财位 */
  wealthPosition: string;
  /** 本命桃花位 */
  peachBlossomPosition: string;
  /** 本命煞位 */
  shaPosition: string;
}

/** 完整风水协议 */
export interface FengShuiProtocol {
  /** 九宫日盘 */
  dailyLayout: NinePalaceDailyProtocol;
  /** 命主空间映射 */
  userMapping?: UserSpaceMapping;
  /** 今日宜 */
  suitable: string[];
  /** 今日忌 */
  avoid: string[];
  /** 来源文献 */
  source: string;
  /** 合规 */
  violations: string[];
}
