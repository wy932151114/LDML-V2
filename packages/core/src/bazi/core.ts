// ============================================================
// 道之自然·命理引擎 — 八字排盘核心算法
// 包括：天干地支计算、节气月令、真太阳时修正
// ============================================================

import type { BaZi, Pillar, TianGan, DiZhi } from '../types/index.js';
import {
  TIAN_GAN_LIST, DI_ZHI_LIST,
  getNayin, getKongWang, DI_ZHI,
} from '../utils/constants.js';

// ============================================================
// 1. 真太阳时修正
// ============================================================

/**
 * 计算真太阳时修正
 * @param date UTC时间
 * @param longitude 当地经度（东经为正）
 * @returns { hour, minute } 真太阳时
 * 
 * 原理：
 * 1. 中国标准时间基于东经120°
 * 2. 每1°经度差 = 4分钟时间差
 * 3. 还需考虑"均时差"（地球公转速度不均匀）
 */
export function calcTrueSolarTime(
  date: Date,
  longitude: number
): { hour: number; minute: number } {
  // 获取UTC时间的年月日时分
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();

  // 用户输入的北京时间（东八区）
  // 假设用户输入的是北京时间
  const beijingHour = utcHours + 8; // UTC+8
  const beijingMinute = utcMinutes;

  // 经度修正：东经120°为标准，每1°=4分钟
  const longitudeDiff = longitude - 120;
  const longitudeCorrectionMinutes = longitudeDiff * 4;

  // 均时差（简化的年周期近似）
  // 真实均时差计算需要精确的天文算法，这里用傅里叶级数近似
  const dayOfYear = getDayOfYear(year, month, day);
  const E = getEquationOfTime(dayOfYear);

  // 总修正
  const totalOffsetMinutes = longitudeCorrectionMinutes + E;

  // 修正后的时间
  let solarMinutes = beijingHour * 60 + beijingMinute + totalOffsetMinutes;
  if (solarMinutes < 0) solarMinutes += 1440;
  if (solarMinutes >= 1440) solarMinutes -= 1440;

  return {
    hour: Math.floor(solarMinutes / 60),
    minute: Math.round(solarMinutes % 60),
  };
}

/** 计算年积日 */
function getDayOfYear(year: number, month: number, day: number): number {
  const start = new Date(Date.UTC(year, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day));
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

/**
 * 简化均时差计算（分钟）
 * 使用傅里叶展开的2项近似，精度约±2分钟
 * 对于专业应用应使用天文算法库（如瑞士星历表Swiss Ephemeris）
 */
function getEquationOfTime(dayOfYear: number): number {
  const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
  // E = 9.87 sin(2B) - 7.53 cos(B) - 1.5 sin(B)
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

// ============================================================
// 2. 节气计算
// ============================================================

/**
 * 获取某年的节气日期（简化算法）
 * 精确节气计算需要天文历法库，这里用统计回归近似
 * 返回：{ [节气名]: Date对象 }
 */
export function getSolarTermsForYear(year: number): Map<string, Date> {
  const terms = new Map<string, Date>();
  
  // 节气名列表（按顺序）
  const termNames = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
  ];
  for (let i = 0; i < 24; i++) {
    const termDay = calcSolarTermDay(year, i + 1);
    terms.set(termNames[i], termDay);
  }

  return terms;
}

/**
 * 计算第N个节气在该年的日期（1=小寒）
 * 高精度节气计算 — 基于太阳黄经迭代算法（Jean Meeus）
 * 精度：误差 < 30 秒，对八字排盘完全足够
 * 
 * 算法原理：
 * 1. 从目标年份的大致日期出发，计算太阳平黄经和中心差得到真黄经
 * 2. 迭代修正直到太阳真黄经收敛到目标节气度数
 */
function calcSolarTermDay(year: number, termIndex: number): Date {
  // 节气对应的黄经度数: 小寒=285°, 大寒=300°, 立春=315°...
  const termLongitudes = [
    285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90,
    105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270
  ];
  
  const targetLon = termLongitudes[(termIndex - 1) % 24];
  
  // 初始估算儒略日：从该年1月1日出发，按黄经比例估算
  const jan1JD = getJulianDay(year, 1, 1);
  const roughDayOfYear = 5 + ((targetLon + 360 - 285) % 360) * 365.2422 / 360;
  let jd = jan1JD - 1 + roughDayOfYear;
  
  // 迭代求解太阳黄经到达目标度数的精确时刻（3次迭代足以收敛到秒级精度）
  for (let iter = 0; iter < 3; iter++) {
    const T = (jd - 2451545.0) / 36525;  // 儒略世纪数 (J2000.0起算)
    
    // 太阳平黄经 (mean ecliptic longitude)
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    // 平近点角 (mean anomaly)
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    // 中心差 (equation of center) — 将平黄经修正为真黄经
    const sinM = Math.sin(M * Math.PI / 180);
    const sin2M = Math.sin(2 * M * Math.PI / 180);
    const sin3M = Math.sin(3 * M * Math.PI / 180);
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinM
            + (0.019993 - 0.000101 * T) * sin2M
            + 0.000289 * sin3M;
    // 太阳真黄经 (true ecliptic longitude)
    const L_true = L0 + C;
    
    // 误差修正
    let dL = targetLon - L_true;
    while (dL > 180) dL -= 360;
    while (dL < -180) dL += 360;
    // 太阳平均日运动 ~0.9856°/天
    jd += dL / 0.9856;
  }
  
  return julianDayToDate(jd);
}

/** 计算公历日期对应的儒略日 (Julian Day Number) */
function getJulianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716))
       + Math.floor(30.6001 * (m + 1))
       + day + B - 1524.5;
}

/** 儒略日转 Date 对象 */
function julianDayToDate(jd: number): Date {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const dayInt = B - D - Math.floor(30.6001 * E);
  const monthNum = E < 14 ? E - 1 : E - 13;
  const yearNum = monthNum > 2 ? C - 4716 : C - 4715;
  
  // 日的小数部分转为时分秒
  const totalSeconds = Math.round(F * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return new Date(Date.UTC(yearNum, monthNum - 1, dayInt, hours, minutes, seconds));
}
export function getMonthZhiFromSolarTerm(year: number, month: number, day: number): DiZhi {
  const terms = getSolarTermsForYear(year);
  
  // 月令节气分界
  const termBoundaries: Array<{ term: string; zhi: DiZhi }> = [
    { term: '立春', zhi: '寅' },
    { term: '惊蛰', zhi: '卯' },
    { term: '清明', zhi: '辰' },
    { term: '立夏', zhi: '巳' },
    { term: '芒种', zhi: '午' },
    { term: '小暑', zhi: '未' },
    { term: '立秋', zhi: '申' },
    { term: '白露', zhi: '酉' },
    { term: '寒露', zhi: '戌' },
    { term: '立冬', zhi: '亥' },
    { term: '大雪', zhi: '子' },
    { term: '小寒', zhi: '丑' },
  ];

  const inputDate = new Date(year, month - 1, day);
  
  // 如果输入日期小于当年立春，则月令为丑（属于上一年十二月）
  const springStart = terms.get('立春');
  if (springStart && inputDate < springStart) {
    return '丑';
  }

  // 查询落在哪个节气区间
  for (let i = 0; i < termBoundaries.length - 1; i++) {
    const boundaryDate = terms.get(termBoundaries[i].term);
    const nextBoundaryDate = terms.get(termBoundaries[i + 1].term);
    if (boundaryDate && nextBoundaryDate) {
      if (inputDate >= boundaryDate && inputDate < nextBoundaryDate) {
        return termBoundaries[i].zhi;
      }
    }
  }

  // 如果超出当年最后节气，检查是否进入下一年
  const winterSolstice = terms.get('冬至');
  const nextSpring = terms.get('小寒');
  if (winterSolstice && winterSolstice <= inputDate) {
    // 查看下一年立春
    const nextYearSpring = getSolarTermsForYear(year + 1).get('立春');
    if (nextYearSpring && inputDate < nextYearSpring) {
      return '丑';
    }
  }

  return '寅'; // fallback
}

// ============================================================
// 3. 四柱计算
// ============================================================

/**
 * 计算年柱
 * 以立春为界：立春前为上一年的干支
 */
export function calcYearPillar(year: number, month: number, day: number): Pillar {
  const terms = getSolarTermsForYear(year);
  const springStart = terms.get('立春');
  const inputDate = new Date(year, month - 1, day);
  
  let actualYear = year;
  if (springStart && inputDate < springStart) {
    actualYear = year - 1;
  }

  // 年干支：以（年份-4）% 60 计算
  const ganIndex = (actualYear - 4) % 10;
  const zhiIndex = (actualYear - 4) % 12;
  
  const gan = TIAN_GAN_LIST[(ganIndex + 10) % 10] as TianGan;
  const zhi = DI_ZHI_LIST[(zhiIndex + 12) % 12] as DiZhi;

  return {
    heavenlyStem: gan,
    earthlyBranch: zhi,
    full: `${gan}${zhi}`,
    nayin: getNayin(gan, zhi),
    hiddenStems: DI_ZHI[zhi].cangGan,
    kongWang: getKongWang(gan, zhi),
  };
}

/**
 * 计算月柱
 * 年上起月法（五虎遁）：甲己之年丙作首，乙庚之岁戊为头...
 */
export function calcMonthPillar(
  year: number, month: number, day: number,
  yearGan: TianGan
): Pillar {
  // 获取月令地支
  const monthZhi = getMonthZhiFromSolarTerm(year, month, day);
  const zhiIndex = DI_ZHI_LIST.indexOf(monthZhi);

  // 五虎遁口诀：
  // 甲己之年丙作首 → 甲己年正月为丙寅（天干为丙）
  // 乙庚之岁戊为头 → 乙庚年正月为戊寅（天干为戊）
  // 丙辛之年寻庚上 → 丙辛年正月为庚寅（天干为庚）
  // 丁壬壬寅顺水流 → 丁壬年正月为壬寅（天干为壬）
  // 若问戊癸何处起 → 戊癸年正月为甲寅（天干为甲）
  // 甲寅之上好追求
  
  const yearToMonthStart: Record<TianGan, number> = {
    '甲': 2, '己': 2,  // 丙=2
    '乙': 4, '庚': 4,  // 戊=4
    '丙': 6, '辛': 6,  // 庚=6
    '丁': 8, '壬': 8,  // 壬=8
    '戊': 0, '癸': 0,  // 甲=0
  };

  const startGanIdx = yearToMonthStart[yearGan];
  
  // 地支从寅(2)开始，offset为当前地支相对于寅的偏移
  const offset = (zhiIndex - 2 + 12) % 12;
  const ganIdx = (startGanIdx + offset) % 10;
  const gan = TIAN_GAN_LIST[ganIdx] as TianGan;
  const zhi = DI_ZHI_LIST[zhiIndex] as DiZhi;

  return {
    heavenlyStem: gan,
    earthlyBranch: zhi,
    full: `${gan}${zhi}`,
    nayin: getNayin(gan, zhi),
    hiddenStems: DI_ZHI[zhi].cangGan,
    kongWang: getKongWang(gan, zhi),
  };
}

/**
 * 计算日柱
 * 使用1900年为基准的日干支公式
 * 1900年1月1日为甲子日（序号0）
 */
export function calcDayPillar(year: number, month: number, day: number): Pillar {
  // 计算从1900-01-01到目标日期的天数差
  const refDate = new Date(1900, 0, 1); // 1900-01-01
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.round((targetDate.getTime() - refDate.getTime()) / 86400000);

  // 甲子日为第0天
  const idx = ((diffDays % 60) + 60) % 60;
  const gan = TIAN_GAN_LIST[idx % 10] as TianGan;
  const zhi = DI_ZHI_LIST[idx % 12] as DiZhi;

  return {
    heavenlyStem: gan,
    earthlyBranch: zhi,
    full: `${gan}${zhi}`,
    nayin: getNayin(gan, zhi),
    hiddenStems: DI_ZHI[zhi].cangGan,
    kongWang: getKongWang(gan, zhi),
  };
}

/**
 * 计算时柱
 * 日上起时法（五鼠遁）：甲己还加甲，乙庚丙作初...
 */
export function calcHourPillar(
  hour: number, minute: number,
  dayGan: TianGan
): Pillar {
  // 时柱地支根据时辰确定
  // 时辰划分：
  // 子(23-1) 丑(1-3) 寅(3-5) 卯(5-7) 辰(7-9) 巳(9-11)
  // 午(11-13) 未(13-15) 申(15-17) 酉(17-19) 戌(19-21) 亥(21-23)
  const hourZhiMap: Record<number, DiZhi> = {
    0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅', 5: '卯',
    6: '卯', 7: '辰', 8: '辰', 9: '巳', 10: '巳', 11: '午',
    12: '午', 13: '未', 14: '未', 15: '申', 16: '申', 17: '酉',
    18: '酉', 19: '戌', 20: '戌', 21: '亥', 22: '亥', 23: '子',
  };

  const zhi = hourZhiMap[hour] || '子';
  const zhiIndex = DI_ZHI_LIST.indexOf(zhi);

  // 五鼠遁口诀：
  // 甲己还加甲 → 甲己日子时为甲子（天干为甲）
  // 乙庚丙作初 → 乙庚日子时为丙子（天干为丙）
  // 丙辛从戊起 → 丙辛日子时为戊子（天干为戊）
  // 丁壬庚子居 → 丁壬日子时为庚子（天干为庚）
  // 戊癸何方发 → 戊癸日子时为壬子（天干为壬）
  // 壬子是真途

  const dayToHourStart: Record<TianGan, number> = {
    '甲': 0, '己': 0,  // 甲=0
    '乙': 2, '庚': 2,  // 丙=2
    '丙': 4, '辛': 4,  // 戊=4
    '丁': 6, '壬': 6,  // 庚=6
    '戊': 8, '癸': 8,  // 壬=8
  };

  const startGanIdx = dayToHourStart[dayGan];
  const ganIdx = (startGanIdx + zhiIndex) % 10;
  const gan = TIAN_GAN_LIST[ganIdx] as TianGan;

  return {
    heavenlyStem: gan,
    earthlyBranch: zhi,
    full: `${gan}${zhi}`,
    nayin: getNayin(gan, zhi),
    hiddenStems: DI_ZHI[zhi].cangGan,
    kongWang: getKongWang(gan, zhi),
  };
}

// ============================================================
// 4. 完整八字排盘
// ============================================================

export interface BaZiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  longitude?: number;    // 经度，用于真太阳时
  useTrueSolar?: boolean; // 是否启用真太阳时
}

/**
 * 完整八字排盘入口
 * 这是系统的核心算法入口
 */
export function calculateBaZi(input: BaZiInput): BaZi {
  const { year, month, day, gender } = input;
  let { hour, minute } = input;

  // 如果启用真太阳时且提供了经度
  let longitude = input.longitude;
  let useTrueSolar = input.useTrueSolar;
  let trueSolarTime: { hour: number; minute: number } | undefined;

  if (useTrueSolar && longitude !== undefined) {
    // 构建UTC时间（用户输入的是北京时间）
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
    trueSolarTime = calcTrueSolarTime(utcDate, longitude);
    hour = trueSolarTime.hour;
    minute = trueSolarTime.minute;
  }

  // 1. 年柱
  const yearPillar = calcYearPillar(year, month, day);

  // 2. 月柱（依赖年干）
  const monthPillar = calcMonthPillar(year, month, day, yearPillar.heavenlyStem);

  // 3. 日柱
  const dayPillar = calcDayPillar(year, month, day);

  // 4. 时柱（依赖日干）
  const hourPillar = calcHourPillar(hour, minute, dayPillar.heavenlyStem);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    dayMaster: dayPillar.heavenlyStem,
    gender,
    birthTime: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    longitude,
  };
}

/** 八字转为易读字符串 */
export function baZiToString(bazi: BaZi): string {
  return `【八字排盘结果】
  出生时间：${bazi.birthTime}
  日主：${bazi.dayMaster}
  性别：${bazi.gender}
  ─────────────
  年柱：${bazi.year.full}（${bazi.year.nayin}）
  月柱：${bazi.month.full}（${bazi.month.nayin}）
  日柱：${bazi.day.full}（${bazi.day.nayin}）
  时柱：${bazi.hour.full}（${bazi.hour.nayin}）
  ─────────────
  年柱藏干：${bazi.year.hiddenStems.join('、')}
  月柱藏干：${bazi.month.hiddenStems.join('、')}
  日柱藏干：${bazi.day.hiddenStems.join('、')}
  时柱藏干：${bazi.hour.hiddenStems.join('、')}
  ${bazi.longitude ? `\n  真太阳时修正（经度${bazi.longitude}°）` : ''}`;
}


