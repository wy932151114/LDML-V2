// ============================================================
// 道之自然核心协议栈 — 标准化错误系统
// 
// 所有错误必须可追溯、可分级、可建议
// AI 层不得自行编造错误信息
// ============================================================

/**
 * 错误等级
 * warning  → 可继续，但需提示用户
 * error    → 数据不达标，使用降级方案
 * fatal    → 阻断流程，必须修正输入
 */
export type DaoErrorLevel = 'warning' | 'error' | 'fatal';

/**
 * 道之自然标准错误结构
 * 所有验证器、引擎、AI层都必须使用此结构
 */
export interface DaoError {
  /** 错误码，如 LONGITUDE_OUT_OF_RANGE */
  code: string;
  /** 用户友好的错误消息 */
  message: string;
  /** 数据来源引用（原文出处） */
  source: string;
  /** 严重级别 */
  level: DaoErrorLevel;
  /** 修复建议 */
  suggestion?: string;
  /** 关联的字段名 */
  field?: string;
  /** 实际收到的值 */
  actualValue?: string | number;
  /** 允许的范围 */
  expectedRange?: string;
}

/**
 * 错误码枚举
 * 格式: DOMAIN_SPECIFIC_ERROR
 */
export enum DaoErrorCode {
  // === 经度 ===
  LONGITUDE_OUT_OF_RANGE = 'LONGITUDE_OUT_OF_RANGE',
  LONGITUDE_NOT_PROVIDED = 'LONGITUDE_NOT_PROVIDED',
  CITY_NOT_FOUND = 'CITY_NOT_FOUND',

  // === 时间 ===
  SOLAR_OFFSET_EXCEEDS_LIMIT = 'SOLAR_OFFSET_EXCEEDS_LIMIT',
  BIRTH_DATE_INVALID = 'BIRTH_DATE_INVALID',
  BIRTH_HOUR_INVALID = 'BIRTH_HOUR_INVALID',
  SOLAR_TERM_MISMATCH = 'SOLAR_TERM_MISMATCH',

  // === 八字 ===
  FOUR_PILLARS_INCOMPLETE = 'FOUR_PILLARS_INCOMPLETE',
  DAY_MASTER_UNDEFINED = 'DAY_MASTER_UNDEFINED',
  STEM_BRANCH_MISMATCH = 'STEM_BRANCH_MISMATCH',

  // === 五行 ===
  WUXING_SCORE_IMBALANCE = 'WUXING_SCORE_IMBALANCE',
  WUXING_THRESHOLD_EXCEEDED = 'WUXING_THRESHOLD_EXCEEDED',
  YONG_SHEN_CONFLICT = 'YONG_SHEN_CONFLICT',

  // === 风水 ===
  DIRECTION_NOT_FOUND = 'DIRECTION_NOT_FOUND',
  PALACE_CONFLICT = 'PALACE_CONFLICT',
  NINE_STAR_OVERLAP = 'NINE_STAR_OVERLAP',

  // === 仪式 ===
  RITUAL_TIME_INVALID = 'RITUAL_TIME_INVALID',
  RITUAL_DIRECTION_CONFLICT = 'RITUAL_DIRECTION_CONFLICT',

  // === AI ===
  AI_PROMPT_INJECTION = 'AI_PROMPT_INJECTION',
  AI_OUTPUT_VALIDATION_FAILED = 'AI_OUTPUT_VALIDATION_FAILED',
  AI_CALCULATION_DEVIATION = 'AI_CALCULATION_DEVIATION',

  // === 通用 ===
  INTERNAL_ENGINE_ERROR = 'INTERNAL_ENGINE_ERROR',
  DATA_INTEGRITY_VIOLATION = 'DATA_INTEGRITY_VIOLATION',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
}

/**
 * 错误工厂：快速创建标准化错误
 */
export function createDaoError(
  code: DaoErrorCode,
  message: string,
  source: string,
  level: DaoErrorLevel = 'error',
  suggestion?: string,
  field?: string,
  actualValue?: string | number,
  expectedRange?: string,
): DaoError {
  return {
    code,
    message,
    source,
    level,
    suggestion: suggestion || getDefaultSuggestion(code),
    field,
    actualValue,
    expectedRange,
  };
}

/** 默认建议映射 */
function getDefaultSuggestion(code: DaoErrorCode): string {
  const map: Record<string, string> = {
    [DaoErrorCode.LONGITUDE_OUT_OF_RANGE]: '请输入中国境内经度（73°E-135°E）',
    [DaoErrorCode.LONGITUDE_NOT_PROVIDED]: '请提供出生地经度以启用真太阳时修正',
    [DaoErrorCode.CITY_NOT_FOUND]: '请从支持的城市列表中选择',
    [DaoErrorCode.BIRTH_DATE_INVALID]: '请检查出生日期是否正确（1900-01-01至当日）',
    [DaoErrorCode.BIRTH_HOUR_INVALID]: '请输入0-23之间的时辰',
    [DaoErrorCode.WUXING_THRESHOLD_EXCEEDED]: '建议结合大运流年重新分析',
    [DaoErrorCode.RITUAL_TIME_INVALID]: '请选择吉时范围（辰/巳/午/申/酉时）',
    [DaoErrorCode.AI_OUTPUT_VALIDATION_FAILED]: 'AI输出未通过校验，请重试',
  };
  return map[code] || '请检查输入数据后重试';
}

/**
 * 验证结果：可以包含错误列表
 */
export interface ValidationResult {
  valid: boolean;
  errors: DaoError[];
  warnings: DaoError[];
  passedChecks: string[];
}

/** 空的验证通过结果 */
export function emptyValidationResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [], passedChecks: [] };
}
