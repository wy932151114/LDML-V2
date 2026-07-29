// ============================================================
// 道之自然·命理引擎 — 节气系统（v4 - lunar-typescript引擎）
// 八字月份不是农历正月，而是节气月令
// 立春→寅月，惊蛰→卯月，清明→辰月...
// 
// 使用lunar-typescript提供精确节气日期
// 精度：天文台级
// ============================================================

import type { BranchName } from '../core/earthlyBranches';
// 动态导入lunar-typescript（避免NestJS bundle问题）
// @ts-ignore
import * as LunarLib from 'lunar-typescript';

/** 节气信息 */
export interface SolarTermInfo {
  name: string;
  /** 太阳黄经度数 */
  longitude: number;
  /** 对应的月地支 */
  monthBranch: BranchName;
  /** 公历大致月份 */
  month: number;
  /** 公历日期范围 [最早, 最晚] */
  dayRange: [number, number];
}

export const SOLAR_TERMS: SolarTermInfo[] = [
  { name: '小寒', longitude: 285,  monthBranch: '丑', month: 1,  dayRange: [5, 7]    },
  { name: '大寒', longitude: 300,  monthBranch: '丑', month: 1,  dayRange: [20, 21]  },
  { name: '立春', longitude: 315,  monthBranch: '寅', month: 2,  dayRange: [3, 5]    },
  { name: '雨水', longitude: 330,  monthBranch: '寅', month: 2,  dayRange: [18, 20]  },
  { name: '惊蛰', longitude: 345,  monthBranch: '卯', month: 3,  dayRange: [5, 7]    },
  { name: '春分', longitude: 0,    monthBranch: '卯', month: 3,  dayRange: [20, 22]  },
  { name: '清明', longitude: 15,   monthBranch: '辰', month: 4,  dayRange: [4, 6]    },
  { name: '谷雨', longitude: 30,   monthBranch: '辰', month: 4,  dayRange: [19, 21]  },
  { name: '立夏', longitude: 45,   monthBranch: '巳', month: 5,  dayRange: [5, 7]    },
  { name: '小满', longitude: 60,   monthBranch: '巳', month: 5,  dayRange: [20, 22]  },
  { name: '芒种', longitude: 75,   monthBranch: '午', month: 6,  dayRange: [5, 7]    },
  { name: '夏至', longitude: 90,   monthBranch: '午', month: 6,  dayRange: [21, 22]  },
  { name: '小暑', longitude: 105,  monthBranch: '未', month: 7,  dayRange: [6, 8]    },
  { name: '大暑', longitude: 120,  monthBranch: '未', month: 7,  dayRange: [22, 24]  },
  { name: '立秋', longitude: 135,  monthBranch: '申', month: 8,  dayRange: [7, 9]    },
  { name: '处暑', longitude: 150,  monthBranch: '申', month: 8,  dayRange: [22, 24]  },
  { name: '白露', longitude: 165,  monthBranch: '酉', month: 9,  dayRange: [7, 9]    },
  { name: '秋分', longitude: 180,  monthBranch: '酉', month: 9,  dayRange: [22, 24]  },
  { name: '寒露', longitude: 195,  monthBranch: '戌', month: 10, dayRange: [7, 9]    },
  { name: '霜降', longitude: 210,  monthBranch: '戌', month: 10, dayRange: [23, 24]  },
  { name: '立冬', longitude: 225,  monthBranch: '亥', month: 11, dayRange: [7, 8]    },
  { name: '小雪', longitude: 240,  monthBranch: '亥', month: 11, dayRange: [22, 23]  },
  { name: '大雪', longitude: 255,  monthBranch: '子', month: 12, dayRange: [6, 8]    },
  { name: '冬至', longitude: 270,  monthBranch: '子', month: 12, dayRange: [21, 23]  },
];

/**
 * 节气中文名 → 英文索引映射
 * lunar-typescript使用这些名称
 */
const TERM_NAMES_MAP: Record<string, string> = {
  '小寒': 'XiaoHan', '大寒': 'DaHan',
  '立春': 'LiChun', '雨水': 'YuShui',
  '惊蛰': 'JingZhe', '春分': 'ChunFen',
  '清明': 'QingMing', '谷雨': 'GuYu',
  '立夏': 'LiXia', '小满': 'XiaoMan',
  '芒种': 'MangZhong', '夏至': 'XiaZhi',
  '小暑': 'XiaoShu', '大暑': 'DaShu',
  '立秋': 'LiQiu', '处暑': 'ChuShu',
  '白露': 'BaiLu', '秋分': 'QiuFen',
  '寒露': 'HanLu', '霜降': 'ShuangJiang',
  '立冬': 'LiDong', '小雪': 'XiaoXue',
  '大雪': 'DaXue', '冬至': 'DongZhi',
};

/**
 * 获取某年所有24节气的日期
 * 使用lunar-typescript的天文台级算法
 * 缓存结果避免重复计算
 */
const termCache = new Map<string, Map<string, Date>>();

export function getSolarTermDates(year: number): Map<string, Date> {
  const cacheKey = String(year);
  if (termCache.has(cacheKey)) {
    return termCache.get(cacheKey)!;
  }

  const result = new Map<string, Date>();
  const L = LunarLib as any;
  const JieQi = L.JieQi;

  // 用lunar-typescript的JieQi类获取精确节气时间
  // JieQi构造函数: new JieQi(name, solar)
  // 我们通过遍历整年每天检查来实现
  
  // 直接获取每天节气的精确方式
  const TERM_NAMES = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
  
  // 遍历整年，通过lunar-typescript获取每个节气的日期
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, m, d);
      const solar = L.Solar.fromDate(date);
      const lunar = solar.getLunar();
      const jq = lunar.getCurrentJieQi();
      if (jq) {
        const name = jq.getName();
        if (TERM_NAMES.includes(name) && !result.has(name)) {
          result.set(name, new Date(year, m, d));
        }
      }
    }
  }

  termCache.set(cacheKey, result);
  return result;
}

/** 清除节气缓存（用于测试） */
export function clearSolarTermCache(): void {
  termCache.clear();
}

/**
 * 根据出生日期获取月令地支
 * 这是八字排盘的关键——节气决定月柱
 */
export function getMonthBranchBySolarTerm(
  year: number,
  month: number,
  day: number
): BranchName {
  const terms = getSolarTermDates(year);
  const inputDate = new Date(year, month - 1, day);

  // 月令节气对照（按时间顺序）
  const boundaries: Array<{ termName: string; branch: BranchName }> = [
    { termName: '小寒', branch: '丑' },
    { termName: '立春', branch: '寅' },
    { termName: '惊蛰', branch: '卯' },
    { termName: '清明', branch: '辰' },
    { termName: '立夏', branch: '巳' },
    { termName: '芒种', branch: '午' },
    { termName: '小暑', branch: '未' },
    { termName: '立秋', branch: '申' },
    { termName: '白露', branch: '酉' },
    { termName: '寒露', branch: '戌' },
    { termName: '立冬', branch: '亥' },
    { termName: '大雪', branch: '子' },
  ];

  // 先处理跨年情况：小寒在1月，立春在2月，所以1月小寒前的属于上一年丑月
  const xiaoHan = terms.get('小寒');

  // 1月1日到小寒之间 → 丑月（上一年十二月）
  if (xiaoHan && inputDate < xiaoHan) {
    return '丑';
  }

  // 遍历节气区间
  for (let i = 0; i < boundaries.length - 1; i++) {
    const current = terms.get(boundaries[i].termName);
    const next = terms.get(boundaries[i + 1].termName);
    if (current && next && inputDate >= current && inputDate < next) {
      return boundaries[i].branch;
    }
  }

  // 大雪之后到年底 → 子月
  const daXue = terms.get('大雪');
  if (daXue && inputDate >= daXue) {
    return '子';
  }

  return '丑'; // fallback
}

/**
 * 获取两个节气之间的天数差
 */
export function daysBetweenTerms(year: number, termA: string, termB: string): number {
  const terms = getSolarTermDates(year);
  const a = terms.get(termA);
  const b = terms.get(termB);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * 获取某个月的起始节气
 */
export function getMonthStartTerm(year: number, monthBranch: BranchName): Date | null {
  const terms = getSolarTermDates(year);
  const termMap: Record<BranchName, string> = {
    '寅': '立春', '卯': '惊蛰', '辰': '清明',
    '巳': '立夏', '午': '芒种', '未': '小暑',
    '申': '立秋', '酉': '白露', '戌': '寒露',
    '亥': '立冬', '子': '大雪', '丑': '小寒',
  };
  const termName = termMap[monthBranch];
  return terms.get(termName) || null;
}
