// ============================================================
// 道之自然·命理引擎 — 九宫飞星核心算法
// 洛书九宫 + 流年飞星 + 流月飞星 + 日飞星 + 方位能量
// ============================================================

import type { FlyingStar, PalaceInfo, NinePalaceResult, MingGuaInfo, MingGuaDirection, WuXing, TianGan, DiZhi } from '../types';
import { NINE_STARS, DI_ZHI_LIST, TIAN_GAN_LIST } from '../utils/constants';

// ============================================================
// 1. 洛书九宫基础布局
// ============================================================

/**
 * 洛书九宫原始数字排列（5居中）
 * 戴九履一，左三右七，二四为肩，六八为足
 *    4   9   2    ← 东南(4) 南(9) 西南(2)
 *    3   5   7    ← 东(3)   中(5)  西(7)
 *    8   1   6    ← 东北(8) 北(1) 西北(6)
 * 
 * 以下数组按宫位序号索引（与 pos=1~9 同步）：
 * [北(1), 西南(2), 东(3), 东南(4), 中(5), 西北(6), 西(7), 东北(8), 南(9)]
 */
export const BASIC_LO_SHU: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** 宫位名称 */
export const PALACE_NAMES: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽',
  5: '中',
  6: '乾', 7: '兑', 8: '艮', 9: '离',
};

/** 宫位方位 */
export const PALACE_DIRECTIONS: Record<number, string> = {
  1: '北', 2: '西南', 3: '东', 4: '东南',
  5: '中',
  6: '西北', 7: '西', 8: '东北', 9: '南',
};

/** 宫位五行 */
export const PALACE_WU_XING: Record<number, WuXing> = {
  1: '水', 2: '土', 3: '木', 4: '木',
  5: '土',
  6: '金', 7: '金', 8: '土', 9: '火',
};

/** 宫位适用事件 */
export const PALACE_SUITABLE: Record<number, string[]> = {
  1: ['事业', '财运', '官运', '北方'],
  2: ['家庭', '健康', '女性', '西南'],
  3: ['事业', '名声', '创新', '东方'],
  4: ['学业', '考试', '文职', '东南'],
  5: ['全局', '中心', '整体运势'],
  6: ['官运', '地位', '领导力', '西北'],
  7: ['沟通', '表达', '艺术', '西方'],
  8: ['财运', '贵人', '创业', '东北'],
  9: ['婚姻', '感情', '喜事', '南方'],
};

/** 宫位禁忌 */
export const PALACE_AVOID: Record<number, string[]> = {
  1: ['水灾', '冷冻', '阴寒'],
  2: ['疾病', '沉闷', '停滞'],
  3: ['口舌', '争吵', '冲动'],
  4: ['桃花纠纷', '优柔寡断'],
  5: ['大病', '破财', '大凶'],
  6: ['争权', '过于强势'],
  7: ['破财', '失盗', '小人'],
  8: ['停滞', '坐享其成'],
  9: ['火灾', '急躁', '血光'],
};

// ============================================================
// 2. 飞星计算
// ============================================================

/**
 * 计算流年飞星入中宫的数字
 * 
 * 规则：
 * 上元甲子一白求 → 上元甲子年（1864年），一白入中
 * 中元甲子四绿求 → 中元甲子年（1924年），四绿入中
 * 下元甲子七赤求 → 下元甲子年（1984年），七赤入中
 * 
 * 当前为下元八运（2004-2023），继续使用七赤入中公式
 * 2024年后进入下元九运，但三元九运周期为180年
 */
export function getYearStarCenter(year: number): FlyingStar {
  // 九星周期：每9年一个循环
  // 当前元运起始年：1984年（下元甲子，七赤入中）
  const baseYear = 1984;
  const baseStar: FlyingStar = 7; // 七赤
  const offset = (year - baseYear) % 9;
  let center = ((baseStar - 1 + offset) % 9) + 1;
  return center as FlyingStar;
}

/**
 * 计算流月飞星入中宫的数字
 * 
 * 规则：以子午卯酉年为界
 * 子午卯酉年 → 正月(寅月)八白入中
 * 辰戌丑未年 → 正月(寅月)五黄入中
 * 寅申巳亥年 → 正月(寅月)二黑入中
 * 每月顺飞一位
 */
export function getMonthStarCenter(year: number, month: number): FlyingStar {
  const monthZhi = getMonthZhi(year, month);
  // 地支分组
  const group1: DiZhi[] = ['子', '午', '卯', '酉'];  // 四正 — 八白起
  const group2: DiZhi[] = ['辰', '戌', '丑', '未'];  // 四库 — 五黄起
  const group3: DiZhi[] = ['寅', '申', '巳', '亥'];  // 四生 — 二黑起

  let baseStar: number;
  if (group1.includes(monthZhi as DiZhi)) {
    baseStar = 8;
  } else if (group2.includes(monthZhi as DiZhi)) {
    baseStar = 5;
  } else {
    baseStar = 2;
  }

  // 正月(寅月)为基准，每月+1
  const monthOffset = (month >= 2 ? month - 2 : month + 10); // 寅月=2, 卯月=3...
  const center = ((baseStar - 1 + monthOffset) % 9) + 1;
  return center as FlyingStar;
}

/** 获取月份的地支 */
function getMonthZhi(year: number, month: number): string {
  // 寅为正月(2月)，依次类推
  const zhiMap: Record<number, string> = {
    2: '寅', 3: '卯', 4: '辰', 5: '巳', 6: '午', 7: '未',
    8: '申', 9: '酉', 10: '戌', 11: '亥', 12: '子', 1: '丑',
  };
  return zhiMap[month] || '寅';
}

/**
 * 计算日飞星入中宫的数字（简化版）
 * 
 * 日飞星计算较复杂，这里使用简化的公式
 * 基于2000年1月1日为基准（该日为某一起点）
 */
export function getDayStarCenter(year: number, month: number, day: number): FlyingStar {
  // 使用更精确的日飞星公式
  // 冬至后：上元甲子日一白入中 → 使用上元公式
  // 夏至后：上元甲子日九紫入中（逆飞）→ 使用下元公式
  
  // 简化：基于2000-01-01为甲子日且为基准
  const refDate = new Date(2000, 0, 1);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.round((targetDate.getTime() - refDate.getTime()) / 86400000);
  
  // 冬至后顺飞，夏至后逆飞
  // 这里简化使用顺飞算法
  const baseStar = 1; // 一白
  const offset = ((diffDays % 9) + 9) % 9;
  const center = ((baseStar - 1 + offset) % 9) + 1;
  return center as FlyingStar;
}

// ============================================================
// 3. 九宫飞星排盘
// ============================================================

/**
 * 根据入中宫的星数，排布九宫飞星
 * 
 * 顺飞规则：中宫数字为N时，
 * 中=N, 西北=N-1, 西=N-2, 东北=N-3, 南=N-4,
 * 北=N-5, 西南=N-6, 东=N-7, 东南=N-8
 * 
 * 实际使用的是：从"中"开始，按"中→西北→西→东北→南→北→西南→东→东南"的顺序
 * 依次用N, N+1, N+2, ..., N+8，超过9则减9
 */
export function generateFlyingStarLayout(centerStar: FlyingStar): number[] {
  // 飞星路径：中(4) → 西北(5) → 西(6) → 东北(7) → 南(8) → 北(0) → 西南(1) → 东(2) → 东南(3)
  const flyPath = [4, 5, 6, 7, 8, 0, 1, 2, 3];
  
  const result: number[] = [];
  for (const pos of flyPath) {
    let star = centerStar + pos;
    if (star > 9) star -= 9;
    if (star < 1) star += 9;
    result.push(star);
  }
  
  // result顺序：[中, 西北, 西, 东北, 南, 北, 西南, 东, 东南]
  // 需要重排为：[北, 西南, 东, 东南, 中, 西北, 西, 东北, 南]
  // 即：[5, 6, 7, 8, 0, 1, 2, 3, 4]
  const reorder = [5, 6, 7, 8, 0, 1, 2, 3, 4];
  return reorder.map(i => result[i]);
}

/**
 * 分析飞星组合能量
 * 判断两颗星同宫时的吉凶
 */
export function analyzeStarPair(star1: FlyingStar, star2: FlyingStar): {
  energy: number;
  type: '吉' | '凶' | '中性' | '大吉' | '大凶';
  description: string;
} {
  const info1 = NINE_STARS[star1];
  const info2 = NINE_STARS[star2];

  // 吉凶组合规则
  const isAuspicious1 = info1.type === '吉';
  const isAuspicious2 = info2.type === '吉';

  // 吉+吉 = 大吉
  if (isAuspicious1 && isAuspicious2) {
    return { energy: 90, type: '大吉', description: `吉星汇聚：${info1.name}遇${info2.name}，大吉之兆` };
  }
  // 吉+凶 = 中性（取决于力量对比）
  if ((isAuspicious1 && info2.type === '凶') || (info1.type === '凶' && isAuspicious2)) {
    return { energy: 45, type: '中性', description: `${info1.name}与${info2.name}相会，吉凶参半` };
  }
  // 凶+凶 = 大凶
  if (info1.type === '凶' && info2.type === '凶') {
    return { energy: 10, type: '大凶', description: `凶星汇聚：${info1.name}遇${info2.name}，须注意防范` };
  }
  // 中性组合
  return { energy: 55, type: '中性', description: `${info1.name}与${info2.name}同宫` };
}

// ============================================================
// 4. 完整九宫计算
// ============================================================

/** 构建单个宫位信息 */
function buildPalaceInfo(
  position: number,
  baseStar: number,
  yearStar: number,
  monthStar: number,
  dayStar: number
): PalaceInfo {
  const currentStar = yearStar; // 年飞星为主
  const starInfo = NINE_STARS[currentStar as FlyingStar];
  const baseInfo = NINE_STARS[baseStar as FlyingStar];

  // 分析能量
  const pairAnalysis = analyzeStarPair(baseStar as FlyingStar, currentStar as FlyingStar);
  
  // 飞星间五行生克修正
  const starWx = starInfo.wuxing;
  const baseWx = baseInfo.wuxing;
  const energyAdjustment = getEnergyAdjustment(starWx, baseWx);

  return {
    position,
    name: PALACE_NAMES[position],
    direction: PALACE_DIRECTIONS[position],
    currentStar: currentStar as FlyingStar,
    baseStar: baseStar as FlyingStar,
    yearStar: yearStar as FlyingStar,
    monthStar: monthStar as FlyingStar,
    dayStar: dayStar as FlyingStar,
    energy: Math.min(100, Math.max(0, pairAnalysis.energy + energyAdjustment)),
    type: pairAnalysis.type,
    suitable: PALACE_SUITABLE[position] || [],
    avoid: PALACE_AVOID[position] || [],
  };
}

/** 根据五行生克调整能量 */
function getEnergyAdjustment(starWx: WuXing, baseWx: WuXing): number {
  // 星五行生宫位五行 = +5
  // 宫位五行生星五行 = -5
  // 星五行克宫位五行 = -10
  // 宫位五行克星五行 = +10
  const shengMap: Record<WuXing, WuXing> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const keMap: Record<WuXing, WuXing> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

  if (shengMap[starWx] === baseWx) return 5;
  if (shengMap[baseWx] === starWx) return -5;
  if (keMap[starWx] === baseWx) return -10;
  if (keMap[baseWx] === starWx) return 10;
  return 0;
}

// ============================================================
// 6. 命卦（个人卦数）计算
// ============================================================

/**
 * 命卦（Ming Gua / Personal Kua Number）计算
 * 
 * 基于出生年份和性别，计算个人的本命卦数
 * 用于选择吉方、确定房屋朝向等
 * 
 * 公式：
 * 1. 年份各位数字之和，反复求和至个位数
 * 2. 男性：11 - 个位数（2000年前）/ 9 - 个位数（2000年后）
 *    女性：4 + 个位数（2000年前）/ 6 + 个位数（2000年后）
 * 3. 结果若为5（中宫无向），男→2(坤) 女→8(艮)
 * 
 * @param year 出生年份
 * @param gender 性别 'male' | 'female'
 * @returns 命卦信息
 */
export function calculateMingGua(year: number, gender: 'male' | 'female'): MingGuaInfo {
  // 1. 年份各位数之和并缩减至个位
  let sum = String(year).split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
  while (sum >= 10) {
    sum = String(sum).split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
  }

  // 2. 应用性别公式
  const before2000 = year < 2000;
  let kua: number;
  if (gender === 'male') {
    kua = before2000 ? 11 - sum : 9 - sum;
  } else {
    kua = before2000 ? 4 + sum : 6 + sum;
  }

  // 3. 若kua>9则-9，若kua<1则+9
  while (kua > 9) kua -= 9;
  while (kua < 1) kua += 9;

  // 4. 5（中宫无向）→ 男2坤 女8艮
  let mingGuaNumber = kua;
  if (kua === 5) {
    mingGuaNumber = gender === 'male' ? 2 : 8;
  }

  const guaName = PALACE_NAMES[mingGuaNumber];
  const direction = PALACE_DIRECTIONS[mingGuaNumber];
  const starInfo = NINE_STARS[mingGuaNumber as FlyingStar];

  return {
    year,
    gender,
    sum,
    kuaRaw: kua,
    mingGuaNumber: mingGuaNumber as FlyingStar,
    guaName,
    direction,
    wuxing: PALACE_WU_XING[mingGuaNumber],
    starName: starInfo?.name || '',
    guaType: getMingGuaType(mingGuaNumber),
    auspiciousDirections: getAuspiciousDirections(mingGuaNumber, gender),
  };
}

/** 命卦东西四命类型 */
function getMingGuaType(number: number): string {
  // 东四命：1坎, 3震, 4巽, 9离
  // 西四命：2坤, 6乾, 7兑, 8艮
  return [1, 3, 4, 9].includes(number) ? '东四命' : '西四命';
}

/** 命卦吉利方位 */
function getAuspiciousDirections(number: number, gender: 'male' | 'female'): MingGuaDirection[] {
  // 每个命卦有4个吉方：生气、天医、延年、伏位
  const directions: Record<number, MingGuaDirection[]> = {
    1: [
      { name: '生气', direction: '东南', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '东', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '南', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '北', energy: '小吉', description: '稳定安宁方位' },
    ],
    2: [
      { name: '生气', direction: '东北', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '西', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '西北', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '西南', energy: '小吉', description: '稳定安宁方位' },
    ],
    3: [
      { name: '生气', direction: '南', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '北', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '东南', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '东', energy: '小吉', description: '稳定安宁方位' },
    ],
    4: [
      { name: '生气', direction: '北', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '南', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '东', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '东南', energy: '小吉', description: '稳定安宁方位' },
    ],
    6: [
      { name: '生气', direction: '西', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '东北', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '西南', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '西北', energy: '小吉', description: '稳定安宁方位' },
    ],
    7: [
      { name: '生气', direction: '西北', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '西南', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '东北', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '西', energy: '小吉', description: '稳定安宁方位' },
    ],
    8: [
      { name: '生气', direction: '西南', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '西北', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '西', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '东北', energy: '小吉', description: '稳定安宁方位' },
    ],
    9: [
      { name: '生气', direction: '东', energy: '大吉', description: '事业财运最佳方位' },
      { name: '天医', direction: '东南', energy: '吉', description: '健康贵人方位' },
      { name: '延年', direction: '北', energy: '吉', description: '婚姻长寿方位' },
      { name: '伏位', direction: '南', energy: '小吉', description: '稳定安宁方位' },
    ],
  };
  return directions[number] || [];
}
// ============================================================

/**
 * 完整的九宫飞星计算
 * 
 * @param year 目标年份
 * @param month 目标月份 (1-12)
 * @param day 目标日期
 * @returns 九宫飞星完整结果
 */
export function calculateNinePalace(
  year: number,
  month: number,
  day: number
): NinePalaceResult {
  // 计算各层次入中星
  const yearCenter = getYearStarCenter(year);
  const monthCenter = getMonthStarCenter(year, month);
  const dayCenter = getDayStarCenter(year, month, day);

  // 生成各层次飞星布局
  const yearLayout = generateFlyingStarLayout(yearCenter);
  const monthLayout = generateFlyingStarLayout(monthCenter);
  const dayLayout = generateFlyingStarLayout(dayCenter);

  // 构建九宫
  const palaces: PalaceInfo[] = [];
  for (let i = 0; i < 9; i++) {
    const pos = i + 1; // 1-9
    const palace = buildPalaceInfo(
      pos,
      BASIC_LO_SHU[i],     // 原局飞星
      yearLayout[i],       // 年飞星
      monthLayout[i],      // 月飞星
      dayLayout[i]         // 日飞星
    );
    palaces.push(palace);
  }

  // 找出吉凶方位
  const sortedByEnergy = [...palaces].sort((a, b) => b.energy - a.energy);
  const bestPalace = sortedByEnergy[0];
  const worstPalace = sortedByEnergy[sortedByEnergy.length - 1];

  const auspiciousStars = palaces
    .filter(p => p.type === '吉' || p.type === '大吉')
    .map(p => p.currentStar)
    .filter((v, i, a) => a.indexOf(v) === i);

  const inauspiciousStars = palaces
    .filter(p => p.type === '凶' || p.type === '大凶')
    .map(p => p.currentStar)
    .filter((v, i, a) => a.indexOf(v) === i);

  return {
    year: palaces,
    month: palaces.map((p, i) => ({
      ...p,
      currentStar: monthLayout[i] as FlyingStar,
      yearStar: yearLayout[i] as FlyingStar,
      monthStar: monthLayout[i] as FlyingStar,
      dayStar: dayLayout[i] as FlyingStar,
      ...analyzeStarPair(monthLayout[i] as FlyingStar, BASIC_LO_SHU[i] as FlyingStar),
    })),
    day: palaces.map((p, i) => ({
      ...p,
      currentStar: dayLayout[i] as FlyingStar,
      yearStar: yearLayout[i] as FlyingStar,
      monthStar: monthLayout[i] as FlyingStar,
      dayStar: dayLayout[i] as FlyingStar,
      ...analyzeStarPair(dayLayout[i] as FlyingStar, BASIC_LO_SHU[i] as FlyingStar),
    })),
    summary: {
      auspiciousStars,
      inauspiciousStars,
      bestDirection: `${bestPalace.direction}（${bestPalace.name}宫）`,
      worstDirection: `${worstPalace.direction}（${worstPalace.name}宫）`,
      bestTime: `${year}年${month}月`,
    },
  };
}

/** 九宫飞星结果格式化输出 */
export function ninePalaceToString(np: NinePalaceResult): string {
  const yearMap = np.year.map(p => 
    `  ${p.direction}${p.name}宫：${p.currentStar}号${NINE_STARS[p.currentStar].name}星（${p.type}）能量${p.energy}%`
  ).join('\n');

  return `【九宫飞星】${np.summary.bestTime}
  
  飞星布局：
${yearMap}

  最佳方位：${np.summary.bestDirection}
  最差方位：${np.summary.worstDirection}
  吉星：${np.summary.auspiciousStars.map(s => NINE_STARS[s].name).join('、')}
  凶星：${np.summary.inauspiciousStars.map(s => NINE_STARS[s].name).join('、')}

  宜：${np.year.filter(p => p.type === '吉' || p.type === '大吉').map(p => `${p.direction}方（${PALACE_SUITABLE[p.position].slice(0, 3).join('、')}）`).join('；')}
  忌：${np.year.filter(p => p.type === '凶' || p.type === '大凶').map(p => `${p.direction}方（${PALACE_AVOID[p.position].slice(0, 3).join('、')}）`).join('；')}`;
}
