// ============================================================
// 道之自然·命理引擎 — 真太阳时计算
// 核心公式：真太阳时 = 标准时间 + 经度修正 + 均时差
// 影响时柱，进而影响子女/晚年/偏财/灵性/改命时机
// ============================================================

import { CHINA_STANDARD_LONGITUDE, getLongitudeOffset } from './timezone';

export interface TrueSolarResult {
  /** 真太阳时的Date对象 */
  date: Date;
  /** 修正后的小时 (0-23) */
  hour: number;
  /** 修正后的分钟 (0-59) */
  minute: number;
  /** 对应的时辰名称 */
  shichen: string;
  /** 经度修正值（分钟） */
  longitudeCorrection: number;
  /** 均时差修正值（分钟） */
  equationOfTime: number;
  /** 总偏移（分钟） */
  totalOffset: number;
  /** 是否跨了时辰（影响时柱） */
  crossedShichen: boolean;
}

/**
 * 计算真太阳时
 * @param date 用户输入的本地时间（Date对象）
 * @param longitude 当地经度（东经为正，如北京116.4）
 * @returns 真太阳时结果
 * 
 * 原理：
 * 1. 中国以北京时（东八区，东经120°）为标准
 * 2. 每1°经度差 = 4分钟时间差
 * 3. 均时差修正（地球公转速度不均匀，约±16分钟）
 */
export function calculateTrueSolarTime(
  date: Date,
  longitude: number
): TrueSolarResult {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const origHour = date.getHours();
  const origMinute = date.getMinutes();

  // 1. 经度修正
  const longitudeCorrection = getLongitudeOffset(longitude);

  // 2. 均时差
  const dayOfYear = getDayOfYear(year, month, day);
  const equationOfTime = getEquationOfTime(dayOfYear);

  // 3. 总修正（分钟）
  const totalOffset = longitudeCorrection + equationOfTime;

  // 4. 修正后时间
  let totalMinutes = origHour * 60 + origMinute + totalOffset;
  if (totalMinutes < 0) totalMinutes += 1440;
  if (totalMinutes >= 1440) totalMinutes -= 1440;

  const resultHour = Math.floor(totalMinutes / 60);
  const resultMinute = Math.round(totalMinutes % 60);

  // 5. 时辰判定
  const origShichen = getShichen(origHour, origMinute);
  const resultShichen = getShichen(resultHour, resultMinute);

  // 6. 构建结果Date（保留年月日，替换时分）
  const resultDate = new Date(date);
  resultDate.setHours(resultHour, resultMinute, 0, 0);

  return {
    date: resultDate,
    hour: resultHour,
    minute: resultMinute,
    shichen: resultShichen,
    longitudeCorrection: Math.round(longitudeCorrection * 100) / 100,
    equationOfTime: Math.round(equationOfTime * 100) / 100,
    totalOffset: Math.round(totalOffset * 100) / 100,
    crossedShichen: origShichen !== resultShichen,
  };
}

/**
 * 简化版：直接输入北京时间+经度
 * @param beijingHour 北京时间（小时，0-23）
 * @param beijingMinute 北京时间（分钟，0-59）
 * @param longitude 当地经度
 * @param year 年份
 * @param month 月份 (1-12)
 * @param day 日期
 */
export function quickTrueSolar(
  beijingHour: number,
  beijingMinute: number,
  longitude: number,
  year: number,
  month: number,
  day: number,
): TrueSolarResult {
  const date = new Date(year, month - 1, day, beijingHour, beijingMinute);
  return calculateTrueSolarTime(date, longitude);
}

/**
 * 均时差计算（分钟）
 * 使用傅里叶展开近似，精度约±2分钟
 */
function getEquationOfTime(dayOfYear: number): number {
  const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/** 年积日 */
function getDayOfYear(year: number, month: number, day: number): number {
  const start = new Date(Date.UTC(year, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day));
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

/**
 * 时辰对照表
 * 子(23-1) 丑(1-3) 寅(3-5) 卯(5-7) 辰(7-9) 巳(9-11)
 * 午(11-13) 未(13-15) 申(15-17) 酉(17-19) 戌(19-21) 亥(21-23)
 */
export function getShichen(hour: number, minute: number = 0): string {
  const map: Record<number, string> = {
    0: '子时', 1: '丑时', 2: '丑时', 3: '寅时', 4: '寅时',
    5: '卯时', 6: '卯时', 7: '辰时', 8: '辰时', 9: '巳时',
    10: '巳时', 11: '午时', 12: '午时', 13: '未时', 14: '未时',
    15: '申时', 16: '申时', 17: '酉时', 18: '酉时', 19: '戌时',
    20: '戌时', 21: '亥时', 22: '亥时', 23: '子时',
  };
  return map[hour] || '未知';
}

/**
 * 获取时辰对应的地支
 */
export function getShichenBranch(hour: number, minute: number = 0): string {
  const map: Record<number, string> = {
    0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅',
    5: '卯', 6: '卯', 7: '辰', 8: '辰', 9: '巳',
    10: '巳', 11: '午', 12: '午', 13: '未', 14: '未',
    15: '申', 16: '申', 17: '酉', 18: '酉', 19: '戌',
    20: '戌', 21: '亥', 22: '亥', 23: '子',
  };
  return map[hour] || '子';
}
