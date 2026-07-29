// ============================================================
// 道之自然·命理引擎 — 天干地支常数与映射表
// Core constants: 天干地支, 五行, 纳音, 藏干, 节气
// ============================================================

import type { TianGan, DiZhi, WuXing, YinYang, TianGanInfo, DiZhiInfo, StarInfo, FlyingStar } from '../types';

// ---- 天干完整信息 ----
export const TIAN_GAN: Record<TianGan, TianGanInfo> = {
  '甲': { gan: '甲', wuxing: '木', yinyang: '阳', wxIndex: 0 },
  '乙': { gan: '乙', wuxing: '木', yinyang: '阴', wxIndex: 0 },
  '丙': { gan: '丙', wuxing: '火', yinyang: '阳', wxIndex: 1 },
  '丁': { gan: '丁', wuxing: '火', yinyang: '阴', wxIndex: 1 },
  '戊': { gan: '戊', wuxing: '土', yinyang: '阳', wxIndex: 2 },
  '己': { gan: '己', wuxing: '土', yinyang: '阴', wxIndex: 2 },
  '庚': { gan: '庚', wuxing: '金', yinyang: '阳', wxIndex: 3 },
  '辛': { gan: '辛', wuxing: '金', yinyang: '阴', wxIndex: 3 },
  '壬': { gan: '壬', wuxing: '水', yinyang: '阳', wxIndex: 4 },
  '癸': { gan: '癸', wuxing: '水', yinyang: '阴', wxIndex: 4 },
};

export const TIAN_GAN_LIST: TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// ---- 地支完整信息（含藏干） ----
// 藏干规则：本气 → 中气 → 余气
export const DI_ZHI: Record<DiZhi, DiZhiInfo> = {
  '子': { zhi: '子', wuxing: '水', yinyang: '阳', cangGan: ['癸'], wxIndex: 4 },
  '丑': { zhi: '丑', wuxing: '土', yinyang: '阴', cangGan: ['己', '癸', '辛'], wxIndex: 2 },
  '寅': { zhi: '寅', wuxing: '木', yinyang: '阳', cangGan: ['甲', '丙', '戊'], wxIndex: 0 },
  '卯': { zhi: '卯', wuxing: '木', yinyang: '阴', cangGan: ['乙'], wxIndex: 0 },
  '辰': { zhi: '辰', wuxing: '土', yinyang: '阳', cangGan: ['戊', '乙', '癸'], wxIndex: 2 },
  '巳': { zhi: '巳', wuxing: '火', yinyang: '阴', cangGan: ['丙', '庚', '戊'], wxIndex: 1 },
  '午': { zhi: '午', wuxing: '火', yinyang: '阳', cangGan: ['丁', '己'], wxIndex: 1 },
  '未': { zhi: '未', wuxing: '土', yinyang: '阴', cangGan: ['己', '丁', '乙'], wxIndex: 2 },
  '申': { zhi: '申', wuxing: '金', yinyang: '阳', cangGan: ['庚', '壬', '戊'], wxIndex: 3 },
  '酉': { zhi: '酉', wuxing: '金', yinyang: '阴', cangGan: ['辛'], wxIndex: 3 },
  '戌': { zhi: '戌', wuxing: '土', yinyang: '阳', cangGan: ['戊', '辛', '丁'], wxIndex: 2 },
  '亥': { zhi: '亥', wuxing: '水', yinyang: '阴', cangGan: ['壬', '甲'], wxIndex: 4 },
};

export const DI_ZHI_LIST: DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ---- 五行生克关系 ----
export const WU_XING_SHENG: Record<WuXing, WuXing> = {
  '木': '火',   // 木生火
  '火': '土',   // 火生土
  '土': '金',   // 土生金
  '金': '水',   // 金生水
  '水': '木',   // 水生木
};

export const WU_XING_KE: Record<WuXing, WuXing> = {
  '木': '土',   // 木克土
  '土': '水',   // 土克水
  '水': '火',   // 水克火
  '火': '金',   // 火克金
  '金': '木',   // 金克木
};

/** 五行相生相反（生我者） */
export const WU_XING_SHENG_WO: Record<WuXing, WuXing> = {
  '木': '水',   // 水生木
  '火': '木',   // 木生火
  '土': '火',   // 火生土
  '金': '土',   // 土生金
  '水': '金',   // 金生水
};

/** 五行相克相反（克我者） */
export const WU_XING_KE_WO: Record<WuXing, WuXing> = {
  '木': '金',   // 金克木
  '火': '水',   // 水克火
  '土': '木',   // 木克土
  '金': '火',   // 火克金
  '水': '土',   // 土克水
};

/** 五行颜色映射 */
export const WU_XING_COLORS: Record<WuXing, string> = {
  '木': '#2ECC71', // 绿
  '火': '#E74C3C', // 红
  '土': '#F39C12', // 黄
  '金': '#ECF0F1', // 白
  '水': '#3498DB', // 蓝/黑
};

/** 五行数字 */
export const WU_XING_NUMBERS: Record<WuXing, number[]> = {
  '木': [3, 8],
  '火': [2, 7],
  '土': [5, 10],
  '金': [4, 9],
  '水': [1, 6],
};

/** 五行对应方向 */
export const WU_XING_DIRECTIONS: Record<WuXing, string> = {
  '木': '东',
  '火': '南',
  '土': '中',
  '金': '西',
  '水': '北',
};

/** 五行对应季节 */
export const WU_XING_SEASONS: Record<WuXing, string> = {
  '木': '春',
  '火': '夏',
  '土': '季末',
  '金': '秋',
  '水': '冬',
};

// ---- 六十甲子（纳音表） ----
export const NAYIN_MAP: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金',
  '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木',
  '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金',
  '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水',
  '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金',
  '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水',
  '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火',
  '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水',
  '甲午': '沙中金', '乙未': '沙中金',
  '丙申': '山下火', '丁酉': '山下火',
  '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土',
  '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火',
  '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土',
  '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木',
  '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木',
  '壬戌': '大海水', '癸亥': '大海水',
};

// ---- 节气（太阳到达黄经度数） ----
export interface SolarTerm {
  name: string;
  /** 黄经度数 */
  longitude: number;
  /** 公历大致月份 */
  month: number;
  /** 公历大致日期范围 */
  dayRange: [number, number];
}

export const SOLAR_TERMS: SolarTerm[] = [
  { name: '立春', longitude: 315,  month: 2,  dayRange: [3, 5] },
  { name: '雨水', longitude: 330,  month: 2,  dayRange: [18, 20] },
  { name: '惊蛰', longitude: 345,  month: 3,  dayRange: [5, 7] },
  { name: '春分', longitude: 0,    month: 3,  dayRange: [20, 22] },
  { name: '清明', longitude: 15,   month: 4,  dayRange: [4, 6] },
  { name: '谷雨', longitude: 30,   month: 4,  dayRange: [19, 21] },
  { name: '立夏', longitude: 45,   month: 5,  dayRange: [5, 7] },
  { name: '小满', longitude: 60,   month: 5,  dayRange: [20, 22] },
  { name: '芒种', longitude: 75,   month: 6,  dayRange: [5, 7] },
  { name: '夏至', longitude: 90,   month: 6,  dayRange: [21, 22] },
  { name: '小暑', longitude: 105,  month: 7,  dayRange: [6, 8] },
  { name: '大暑', longitude: 120,  month: 7,  dayRange: [22, 24] },
  { name: '立秋', longitude: 135,  month: 8,  dayRange: [7, 9] },
  { name: '处暑', longitude: 150,  month: 8,  dayRange: [22, 24] },
  { name: '白露', longitude: 165,  month: 9,  dayRange: [7, 9] },
  { name: '秋分', longitude: 180,  month: 9,  dayRange: [22, 24] },
  { name: '寒露', longitude: 195,  month: 10, dayRange: [7, 9] },
  { name: '霜降', longitude: 210,  month: 10, dayRange: [23, 24] },
  { name: '立冬', longitude: 225,  month: 11, dayRange: [7, 8] },
  { name: '小雪', longitude: 240,  month: 11, dayRange: [22, 23] },
  { name: '大雪', longitude: 255,  month: 12, dayRange: [6, 8] },
  { name: '冬至', longitude: 270,  month: 12, dayRange: [21, 23] },
  { name: '小寒', longitude: 285,  month: 1,  dayRange: [5, 7] },
  { name: '大寒', longitude: 300,  month: 1,  dayRange: [20, 21] },
];

/** 节气 → 月地支对照表（以节气为月令分界） */
export const SOLAR_TERM_TO_MONTH_ZHI: Record<string, DiZhi> = {
  '立春': '寅', '惊蛰': '卯', '清明': '辰',
  '立夏': '巳', '芒种': '午', '小暑': '未',
  '立秋': '申', '白露': '酉', '寒露': '戌',
  '立冬': '亥', '大雪': '子', '小寒': '丑',
};

// ---- 九星信息 ----
export const NINE_STARS: Record<FlyingStar, StarInfo> = {
  1: { number: 1, name: '贪狼', wuxing: '水', type: '吉', attributes: ['一白', '桃花', '官运', '中男'], color: '#FFFFFF' },
  2: { number: 2, name: '巨门', wuxing: '土', type: '凶', attributes: ['二黑', '病符', '疾病', '老母'], color: '#000000' },
  3: { number: 3, name: '禄存', wuxing: '木', type: '凶', attributes: ['三碧', '蚩尤', '是非', '长男'], color: '#0000FF' },
  4: { number: 4, name: '文曲', wuxing: '木', type: '中性', attributes: ['四绿', '文昌', '学业', '长女'], color: '#008000' },
  5: { number: 5, name: '廉贞', wuxing: '土', type: '凶', attributes: ['五黄', '五鬼', '大凶', '中央'], color: '#FF0000' },
  6: { number: 6, name: '武曲', wuxing: '金', type: '吉', attributes: ['六白', '武职', '偏财', '少男'], color: '#FFD700' },
  7: { number: 7, name: '破军', wuxing: '金', type: '凶', attributes: ['七赤', '盗贼', '破财', '少女'], color: '#FF00FF' },
  8: { number: 8, name: '左辅', wuxing: '土', type: '吉', attributes: ['八白', '正财', '富贵', '少男'], color: '#FFFF00' },
  9: { number: 9, name: '右弼', wuxing: '火', type: '中性', attributes: ['九紫', '喜事', '婚姻', '中女'], color: '#FF4500' },
};

// ---- 空亡（旬空）规则 ----
// 空亡表：甲子旬→戌亥，甲戌旬→申酉，甲申旬→午未，甲午旬→辰巳，甲辰旬→寅卯，甲寅旬→子丑
export const KONG_WANG_MAP: Record<string, DiZhi[]> = {
  '甲子': ['戌', '亥'],
  '甲戌': ['申', '酉'],
  '甲申': ['午', '未'],
  '甲午': ['辰', '巳'],
  '甲辰': ['寅', '卯'],
  '甲寅': ['子', '丑'],
};

// ---- 月令权重表（地支在各月的当令力量） ----
// 月令决定五行旺衰
export const MONTH_POWER: Record<DiZhi, Record<WuXing, number>> = {
  '寅': { '木': 60, '火': 25, '土': 10, '金': 0, '水': 5 },  // 春木旺
  '卯': { '木': 100, '火': 0, '土': 0, '金': 0, '水': 0 },   // 仲春木极旺
  '辰': { '木': 20, '火': 10, '土': 50, '金': 10, '水': 10 }, // 季春土气渐长
  '巳': { '木': 15, '火': 60, '土': 15, '金': 0, '水': 10 },  // 孟夏火旺
  '午': { '木': 0, '火': 100, '土': 0, '金': 0, '水': 0 },    // 仲夏火极旺
  '未': { '木': 10, '火': 20, '土': 50, '金': 10, '水': 10 }, // 季夏土旺
  '申': { '木': 10, '火': 0, '土': 15, '金': 60, '水': 15 },  // 孟秋金旺
  '酉': { '木': 0, '火': 0, '土': 0, '金': 100, '水': 0 },    // 仲秋金极旺
  '戌': { '木': 10, '火': 10, '土': 50, '金': 20, '水': 10 }, // 季秋土旺
  '亥': { '木': 20, '火': 0, '土': 10, '金': 10, '水': 60 },  // 孟冬水旺
  '子': { '木': 0, '火': 0, '土': 0, '金': 5, '水': 95 },     // 仲冬水极旺
  '丑': { '木': 10, '火': 10, '土': 50, '金': 20, '水': 10 }, // 季冬土旺
};

// ---- 常规功能函数 ----

/** 天干转序号（0-9） */
export function tianGanIndex(gan: TianGan): number {
  return TIAN_GAN_LIST.indexOf(gan);
}

/** 地支转序号（0-11） */
export function diZhiIndex(zhi: DiZhi): number {
  return DI_ZHI_LIST.indexOf(zhi);
}

/** 干支组合转六十甲子序号（0-59） */
export function ganZhiIndex(gan: TianGan, zhi: DiZhi): number {
  // 甲子为0，乙丑为1，依次类推
  const gIdx = tianGanIndex(gan);
  const zIdx = diZhiIndex(zhi);
  // 天干和地支的索引差必须为偶数（阳干配阳支，阴干配阴支）
  // 60甲子公式：(天干序号 + 地支序号×6) % 60? No
  // 正确： (天干序号 + 12) % 10 == 地支序号 % 12 才合法
  // 计算：从甲子(0,0)开始，每前进1位，天干+1，地支+1
  // 通解： index = (zIdx - gIdx + 12) % 12; result = gIdx + index * 10;
  // 验证：甲子(0,0) → gIdx=0, zIdx=0 → index=0 → result=0 ✓
  // 乙丑(1,1) → gIdx=1, zIdx=1 → index=0 → result=1 ✓
  // 丙寅(2,2) → gIdx=2, zIdx=2 → index=0 → result=2 ✓
  // 甲戌(0,10) → gIdx=0, zIdx=10 → index=(10-0)%12 = 10 → result=0+10*10 = 100? NO
  // 正确公式：(gIdx * 6 + zIdx * 5) % 60 或更简单：
  // offset = (zIdx - gIdx) % 12; result = gIdx + offset * 10; if(result < 0) result += 60; if(result >= 60) result %= 60
  let offset = (zIdx - gIdx + 12) % 12;
  // 但offset必须是偶数（阳配阳，阴配阴）。不对，对于合法组合offset会自动是偶数
  // 如果gIdx和zIdx奇偶性不同，说明不是合法组合
  if ((gIdx % 2) !== (zIdx % 2)) {
    // 这里调用者传入了合法组合，所以应该不会进入
    return -1;
  }
  let idx = (gIdx + offset * 10) % 60;
  if (idx < 0) idx += 60;
  return idx;
}

/** 获取六十甲子某个位置的干支 */
export function getGanZhiByIndex(index: number): { gan: TianGan; zhi: DiZhi } {
  const gIdx = index % 10;
  const zIdx = index % 12;
  return {
    gan: TIAN_GAN_LIST[gIdx],
    zhi: DI_ZHI_LIST[zIdx],
  };
}

/** 获取纳音 */
export function getNayin(gan: TianGan, zhi: DiZhi): string {
  return NAYIN_MAP[`${gan}${zhi}`] || '未知';
}

/** 获取空亡 */
export function getKongWang(gan: TianGan, zhi: DiZhi): DiZhi[] {
  const idx = ganZhiIndex(gan, zhi);
  // 每10天干为一旬，旬首为天干为甲
  // 旬首干支：甲子、甲戌、甲申、甲午、甲辰、甲寅
  // 从当前干支找到旬首（前推至甲）
  const gIdx = tianGanIndex(gan);
  const zIdx = diZhiIndex(zhi);
  const offset = (gIdx + 10 - 0) % 10; // 到甲的距离
  const xunShouZhiIdx = (zIdx - offset + 12) % 12;
  const xunShouZhi = DI_ZHI_LIST[xunShouZhiIdx];
  const xunShouGan: TianGan = '甲';
  const key = `${xunShouGan}${xunShouZhi}` as keyof typeof KONG_WANG_MAP;
  return KONG_WANG_MAP[key] || [];
}
