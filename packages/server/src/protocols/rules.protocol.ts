// ============================================================
// 道之自然核心协议栈 — 规则中心
// 
// 所有验证阈值的唯一数据源
// 任何引擎、验证器、AI层都不得自行定义阈值
// 修改规则前必须确认来源文献
// ============================================================

/**
 * 道之自然规则体系
 * 每条规则附带来源文献引用
 */
export const DaoZhiGuangRules = {
  // ==================== 经度规则 ====================
  longitude: {
    /** 中国境内最小经度（新疆） */
    min: 73,
    /** 中国境内最大经度（黑龙江） */
    max: 135,
    /** 东八区标准经度 */
    beijingStandard: 120,
    /** 东六区（新疆等地）标准经度 */
    urumqiStandard: 90,
    source: '《改命纪实录》卷一§3.2',
  },

  // ==================== 真太阳时规则 ====================
  solarOffset: {
    /** 最大可接受的经度修正（分钟） */
    maxMinutes: 180,
    /** 正常范围的均时差 */
    equationOfTimeMax: 16,
    /** 跨时辰判定阈值（分钟） */
    shichenCrossThreshold: 30,
    source: '《改命纪实录》卷一§3.2·附二',
  },

  // ==================== 五行阈值 ====================
  wuxingThreshold: {
    /** 各五行基础权重（日主为参照） */
    wood: 8.0,
    fire: 7.5,
    earth: 8.5,
    metal: 8.0,
    water: 7.8,
    /** 五行极旺阈值（超过此值判为过旺） */
    extreme: 12.0,
    /** 五行极弱阈值（低于此值判为过弱） */
    weak: 3.0,
    source: '《改命纪实录》卷三§2.1',
  },

  // ==================== 月令规则 ====================
  monthWeight: {
    /** 道之自然特色：月令加倍系数 */
    value: 2.0,
    /** 次月令权重 */
    secondary: 1.5,
    source: '《改命纪实录》卷二§3.4',
  },

  // ==================== 时辰规则 ====================
  shichen: {
    /** 子时跨日判定：23:00后算次日 */
    ziHourStart: 23,
    /** 子时结束 */
    ziHourEnd: 1,
    source: '《改命纪实录》卷一§2.1',
  },

  // ==================== 身强弱判定阈值 ====================
  strengthThreshold: {
    /** 身强线 */
    strongMin: 65,
    /** 身弱线 */
    weakMax: 40,
    source: '《改命纪实录》卷二§4.5',
  },

  // ==================== 九宫飞星规则 ====================
  ninePalace: {
    /** 年飞星入中基数 */
    yearStarBase: 4,
    /** 月飞星入中基数 */
    monthStarBase: 5,
    /** 日飞星基数 */
    dayStarBase: 0,
    /** 九星吉凶判定线 */
    auspiciousStarMin: 6,
    source: '《改命纪实录》卷四§1.3',
  },

  // ==================== 出版/系统信息 ====================
  system: {
    /** 当前协议版本 */
    protocolVersion: '2.3',
    /** 系统版本 */
    systemVersion: '1.0.0',
    /** 核心文献 */
    canonicalSource: '《道之自然·改命纪实录》',
  },
} as const;

/**
 * 阈值规则（可调节参数）
 * 用于非关键性判断的阈值
 */
export const ThresholdRules = {
  /** 五行百分比偏差容差 */
  wuxingPercentTolerance: 2,
  /** 节气日期误差容限（天） */
  solarTermTolerance: 1,
  /** 日柱最大回溯年数 */
  dayPillarMaxLookback: 200,
  /** 使用真太阳时建议最小经度差 */
  trueSolarSuggestMinDiff: 3,
  /** AI输出最大字符数 */
  aiOutputMaxChars: 8000,
  /** AI生成方案最小建议数 */
  aiMinSuggestions: 3,
  /** 报告最小段落数 */
  reportMinSections: 5,
} as const;
