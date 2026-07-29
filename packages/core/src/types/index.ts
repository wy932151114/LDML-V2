// ============================================================
// 道之自然·命理AI引擎 — 核心类型定义
// dao-zhi-guang fate engine — core type system
// ============================================================

// ---- 天干地支 ----
export type TianGan =
  | '甲' | '乙' | '丙' | '丁' | '戊'
  | '己' | '庚' | '辛' | '壬' | '癸';

export type DiZhi =
  | '子' | '丑' | '寅' | '卯' | '辰' | '巳'
  | '午' | '未' | '申' | '酉' | '戌' | '亥';

export type WuXing = '木' | '火' | '土' | '金' | '水';
export type YinYang = '阳' | '阴';

export interface TianGanInfo {
  gan: TianGan;
  wuxing: WuXing;
  yinyang: YinYang;
  /** 五行序号 0木1火2土3金4水 */
  wxIndex: number;
}

export interface DiZhiInfo {
  zhi: DiZhi;
  wuxing: WuXing;
  yinyang: YinYang;
  /** 藏干（本气、中气、余气） */
  cangGan: TianGan[];
  wxIndex: number;
}

// ---- 八字四柱 ----
export interface Pillar {
  heavenlyStem: TianGan;
  earthlyBranch: DiZhi;
  /** 该柱的干支组合文字 */
  full: string;
  /** 纳音五行 */
  nayin: string;
  /** 藏干列表（含本中余气） */
  hiddenStems: TianGan[];
  /** 空亡地支（如果有） */
  kongWang?: DiZhi[];
}

export interface BaZi {
  /** 年柱 */
  year: Pillar;
  /** 月柱 */
  month: Pillar;
  /** 日柱 */
  day: Pillar;
  /** 时柱 */
  hour: Pillar;
  /** 日主（日干） */
  dayMaster: TianGan;
  /** 性别 */
  gender: '男' | '女';
  /** 出生时间（UTC+8或真太阳时修正后） */
  birthTime: string;
  /** 出生地经度（用于真太阳时） */
  longitude?: number;
  /** 农历信息 */
  lunarInfo?: LunarInfo;
}

// ---- 农历 ----
export interface LunarInfo {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  leapMonth: number;
  /** 生肖 */
  zodiac: string;
  /** 年干支 */
  yearGanZhi: string;
}

// ---- 十神 ----
export type ShiShen =
  | '正官' | '偏官' | '正印' | '偏印'
  | '正财' | '偏财' | '食神' | '伤官' | '比肩' | '劫财';

export interface ShiShenAnalysis {
  /** 天干十神 */
  stem: Record<TianGan, ShiShen | null>;
  /** 地支藏干十神 */
  branch: Record<DiZhi, ShiShen[]>;
  /** 十神统计 */
  stats: Record<ShiShen, number>;
  /** 十神力量排名 */
  ranking: Array<{ shishen: ShiShen; count: number; power: number }>;
}

// ---- 五行 ----
export interface WuXingAnalysis {
  /** 各五行在原局的得分（0-100） */
  scores: Record<WuXing, number>;
  /** 各五行在原局的百分比 */
  percentage: Record<WuXing, number>;
  /** 日主五行 */
  dayMasterWx: WuXing;
  /** 日主强弱：极强/强/中和/弱/极弱 */
  dayMasterStrength: string;
  /** 身的强弱身强/身弱 */
  bodyStrength: '身强' | '身弱' | '中和';
  /** 用神（最需要的五行） */
  yongShen: WuXing[];
  /** 喜神 */
  xiShen: WuXing[];
  /** 忌神 */
  jiShen: WuXing[];
  /** 五行动态平衡状态 */
  balanceState: '平衡' | '偏旺' | '偏弱' | '过旺' | '过弱';
  /** 缺失的五行 */
  missing: WuXing[];
  /** 能量过剩的五行 */
  excess: WuXing[];
}

// ---- 大运 ----
export interface DaYunPillar {
  /** 大运干支 */
  ganZhi: string;
  /** 起始年龄 */
  startAge: number;
  /** 结束年龄 */
  endAge: number;
  /** 起始年份 */
  startYear: number;
  /** 结束年份 */
  endYear: number;
  /** 天干十神 */
  stemShiShen?: ShiShen;
  /** 地支十神 */
  branchShiShen?: ShiShen;
  /** 与用神关系 */
  yongShenRelation?: '用神' | '忌神' | '闲神' | '喜神';
  /** 运势评价 */
  luckRating?: '大吉' | '吉' | '平' | '凶' | '大凶';
  /** 天干地支五行 */
  wuxing: WuXing[];
}

export interface DaYun {
  /** 起运年龄 */
  startAge: number;
  /** 所有大运 */
  pillars: DaYunPillar[];
}

// ---- 流年 ----
export interface LiuNian {
  year: number;
  ganZhi: string;
  tiangan: TianGan;
  dizhi: DiZhi;
  shiShen: ShiShen[];
  wuxing: WuXing[];
  /** 与当年大运的关系 */
  daYunRelation: string;
  /** 与命局的关系 */
  fateRelation: string;
  /** 吉凶等级 */
  luckRating: '大吉' | '吉' | '平' | '凶' | '大凶';
  /** 重点关注领域 */
  focusAreas: string[];
}

// ---- 神煞 ----
export type ShenSha =
  | '天乙贵人' | '文昌贵人' | '天德贵人' | '月德贵人'
  | '太极贵人' | '国印贵人' | '驿马' | '桃花'
  | '孤辰' | '寡宿' | '亡神' | '劫煞'
  | '灾煞' | '勾绞' | '元辰' | '华盖'
  | '将星' | '金舆' | '禄神' | '羊刃';

export interface ShenShaInfo {
  name: ShenSha;
  type: '吉' | '凶' | '中性';
  description: string;
  pillar: '年' | '月' | '日' | '时';
}

export interface ShenShaAnalysis {
  all: ShenShaInfo[];
  auspicious: ShenShaInfo[];
  inauspicious: ShenShaInfo[];
}

// ============================================================
// 九宫飞星类型
// ============================================================

export type FlyingStar = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface StarInfo {
  number: FlyingStar;
  name: string;
  wuxing: WuXing;
  type: '吉' | '凶' | '中性';
  /** 代表人物、方位、属性 */
  attributes: string[];
  /** 飞星五行颜色 */
  color: string;
}

export interface PalaceInfo {
  /** 宫位编号 1坎2坤3震4巽5中6乾7兑8艮9离 */
  position: number;
  /** 宫位名称 */
  name: string;
  /** 方位 */
  direction: string;
  /** 当前飞星 */
  currentStar: FlyingStar;
  /** 原局飞星（洛书基础） */
  baseStar: FlyingStar;
  /** 年月叠加飞星 */
  yearStar: FlyingStar;
  monthStar: FlyingStar;
  /** 日飞星 */
  dayStar: FlyingStar;
  /** 能量值（0-100） */
  energy: number;
  /** 吉凶 */
  type: '吉' | '凶' | '中性' | '大吉' | '大凶';
  /** 适用事件 */
  suitable: string[];
  /** 禁忌 */
  avoid: string[];
}

export interface NinePalaceResult {
  /** 年份飞星盘 */
  year: PalaceInfo[];
  /** 月份飞星盘 */
  month: PalaceInfo[];
  /** 日飞星盘 */
  day: PalaceInfo[];
  /** 飞星能量总览 */
  summary: {
    auspiciousStars: FlyingStar[];
    inauspiciousStars: FlyingStar[];
    bestDirection: string;
    worstDirection: string;
    bestTime: string;
  };
}

// ============================================================
// 命卦类型
// ============================================================

export interface MingGuaDirection {
  name: string;
  direction: string;
  energy: string;
  description: string;
}

export interface MingGuaInfo {
  /** 出生年份 */
  year: number;
  /** 性别 */
  gender: 'male' | 'female';
  /** 年份各位数之和（个位） */
  sum: number;
  /** 原始卦数（可能为5） */
  kuaRaw: number;
  /** 命卦数（已映射5→2/8） */
  mingGuaNumber: FlyingStar;
  /** 卦名 */
  guaName: string;
  /** 方位 */
  direction: string;
  /** 五行 */
  wuxing: WuXing;
  /** 对应星名 */
  starName: string;
  /** 东四命/西四命 */
  guaType: string;
  /** 吉利方位 */
  auspiciousDirections: MingGuaDirection[];
}

// ============================================================
// 改命策略类型
// ============================================================

export type StrategyType =
  | '方位调整'
  | '时间选择'
  | '物品摆放'
  | '颜色搭配'
  | '职业方向'
  | '人际策略'
  | '修行方法'
  | '饮食调理'
  | '居住调整';

export type EffectCycle = '即时' | '3天' | '7天' | '15天' | '1个月' | '3个月' | '半年' | '1年';

export interface FortuneStrategy {
  type: StrategyType;
  title: string;
  description: string;
  /** 具体操作 */
  action: string;
  /** 最佳时间 */
  bestTime?: string;
  /** 最佳方位 */
  bestDirection?: string;
  /** 所需物品 */
  items?: string[];
  /** 效果周期 */
  effectCycle: EffectCycle;
  /** 建议等级 1-5 */
  priority: 1 | 2 | 3 | 4 | 5;
  /** 原理说明（道之自然风格） */
  principle: string;
  /** 经典出处 */
  classicSource?: string;
}

export interface SolutionReport {
  /** 命主基本信息 */
  personInfo: string;
  /** 八字排盘 */
  bazi: BaZi;
  /** 五行分析 */
  wuxing: WuXingAnalysis;
  /** 大运 */
  dayun: DaYun;
  /** 当前流年 */
  currentYear: LiuNian;
  /** 本期（本月/今日）九宫 */
  currentNinePalace: NinePalaceResult;
  /** 改命策略（按优先级排序） */
  strategies: FortuneStrategy[];
  /** 综合建议 */
  summary: string;
  /** 特别提醒 */
  warnings?: string[];
  /** 后续追踪建议 */
  followUp?: string;
}

// ============================================================
// API类型
// ============================================================

export interface UserProfile {
  id: string;
  name: string;
  gender: '男' | '女';
  birthDate: string;      // YYYY-MM-DD
  birthHour: string;      // HH:mm
  birthPlace?: string;
  longitude?: number;
  latitude?: number;
  timezone?: string;
  phone?: string;
  createdAt: string;
  membershipLevel?: 'free' | 'basic' | 'premium' | 'vip';
}

export interface DailyFortune {
  userId: string;
  date: string;
  baziSummary: string;
  wuxingState: string;
  luckyDirection: string;
  unluckyDirection: string;
  luckyColors: string[];
  luckyNumbers: number[];
  fortuneItems: Array<{
    category: '事业' | '财运' | '感情' | '健康' | '学业';
    rating: '大吉' | '吉' | '平' | '凶' | '大凶';
    description: string;
    advice: string;
  }>;
  AIAdvice: string;
  generatedAt: string;
}

export interface RitualTemplate {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  procedures: string[];
  items: string[];
  bestTime: string;
  bestDirection: string;
  duration: number;       // 分钟
  effectCycle: EffectCycle;
  principle: string;
  source: string;
  tags: string[];
}
