// ============================================================
// 道之自然·命理引擎 — 神煞系统
// 常用神煞查询：天乙贵人、文昌、桃花、驿马、华盖等
// ============================================================

import type { BaZi, TianGan, DiZhi, ShenSha, ShenShaInfo, ShenShaAnalysis } from '../types';
import { TIAN_GAN_LIST, DI_ZHI_LIST, DI_ZHI } from '../utils/constants';

// ============================================================
// 神煞查询表
// ============================================================

/**
 * 天乙贵人
 * 口诀：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，辛逢虎马
 */
function getTianYiGuiRen(dayMaster: TianGan): DiZhi[] {
  const map: Record<TianGan, DiZhi[]> = {
    '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
    '乙': ['子', '申'], '己': ['子', '申'],
    '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '壬': ['卯', '巳'], '癸': ['卯', '巳'],
    '辛': ['寅', '午'],
  };
  return map[dayMaster] || [];
}

/**
 * 文昌贵人
 * 口诀：甲巳乙午丙戊申，丁酉庚亥辛见子，壬寅癸卯是文昌
 */
function getWenChang(dayMaster: TianGan): DiZhi[] {
  const map: Record<TianGan, DiZhi[]> = {
    '甲': ['巳'], '乙': ['午'], '丙': ['申'], '丁': ['酉'],
    '戊': ['申'], '己': ['酉'], '庚': ['亥'], '辛': ['子'],
    '壬': ['寅'], '癸': ['卯'],
  };
  return map[dayMaster] || [];
}

/**
 * 桃花（咸池）
 * 口诀：寅午戌见卯，巳酉丑见午，申子辰见酉，亥卯未见子
 */
function getTaoHua(dayZhi: DiZhi): DiZhi[] {
  const map: Record<DiZhi, DiZhi[]> = {
    '寅': ['卯'], '午': ['卯'], '戌': ['卯'],
    '巳': ['午'], '酉': ['午'], '丑': ['午'],
    '申': ['酉'], '子': ['酉'], '辰': ['酉'],
    '亥': ['子'], '卯': ['子'], '未': ['子'],
  };
  return map[dayZhi] || [];
}

/**
 * 驿马
 * 口诀：寅午戌见申，巳酉丑见亥，申子辰见寅，亥卯未见巳
 */
function getYiMa(dayZhi: DiZhi): DiZhi[] {
  const map: Record<DiZhi, DiZhi[]> = {
    '寅': ['申'], '午': ['申'], '戌': ['申'],
    '巳': ['亥'], '酉': ['亥'], '丑': ['亥'],
    '申': ['寅'], '子': ['寅'], '辰': ['寅'],
    '亥': ['巳'], '卯': ['巳'], '未': ['巳'],
  };
  return map[dayZhi] || [];
}

/**
 * 华盖
 * 口诀：寅午戌见戌，巳酉丑见丑，申子辰见辰，亥卯未见未
 */
function getHuaGai(dayZhi: DiZhi): DiZhi[] {
  const map: Record<DiZhi, DiZhi[]> = {
    '寅': ['戌'], '午': ['戌'], '戌': ['戌'],
    '巳': ['丑'], '酉': ['丑'], '丑': ['丑'],
    '申': ['辰'], '子': ['辰'], '辰': ['辰'],
    '亥': ['未'], '卯': ['未'], '未': ['未'],
  };
  return map[dayZhi] || [];
}

/**
 * 将星
 * 口诀：寅午戌见午，巳酉丑见酉，申子辰见子，亥卯未见卯
 */
function getJiangXing(dayZhi: DiZhi): DiZhi[] {
  const map: Record<DiZhi, DiZhi[]> = {
    '寅': ['午'], '午': ['午'], '戌': ['午'],
    '巳': ['酉'], '酉': ['酉'], '丑': ['酉'],
    '申': ['子'], '子': ['子'], '辰': ['子'],
    '亥': ['卯'], '卯': ['卯'], '未': ['卯'],
  };
  return map[dayZhi] || [];
}

/**
 * 羊刃
 * 口诀：甲卯乙辰丙戊午，丁未庚酉辛戌，壬子癸丑
 */
function getYangRen(dayMaster: TianGan): DiZhi[] {
  const map: Record<TianGan, DiZhi[]> = {
    '甲': ['卯'], '丙': ['午'], '戊': ['午'],
    '庚': ['酉'], '壬': ['子'],
    '乙': ['辰'], '丁': ['未'], '己': ['未'],
    '辛': ['戌'], '癸': ['丑'],
  };
  return map[dayMaster] || [];
}

// ============================================================
// 2. 完整神煞分析
// ============================================================

/** 查找某地支是否在列表中 */
function hasZhi(zhiList: DiZhi[], target: DiZhi): boolean {
  return zhiList.includes(target);
}

/** 获取神煞所在柱 */
function getShenShaPillar(bazi: BaZi, zhi: DiZhi): '年' | '月' | '日' | '时' {
  if (bazi.year.earthlyBranch === zhi) return '年';
  if (bazi.month.earthlyBranch === zhi) return '月';
  if (bazi.day.earthlyBranch === zhi) return '日';
  if (bazi.hour.earthlyBranch === zhi) return '时';
  return '日'; // fallback
}

/** 完整神煞分析 */
export function analyzeShenSha(bazi: BaZi): ShenShaAnalysis {
  const all: ShenShaInfo[] = [];
  const dayMaster = bazi.dayMaster;
  const dayZhi = bazi.day.earthlyBranch;
  const allZhi = [bazi.year.earthlyBranch, bazi.month.earthlyBranch, bazi.day.earthlyBranch, bazi.hour.earthlyBranch];

  // 天乙贵人
  for (const zhi of getTianYiGuiRen(dayMaster)) {
    if (hasZhi(allZhi, zhi)) {
      const pillar = getShenShaPillar(bazi, zhi);
      all.push({
        name: '天乙贵人',
        type: '吉',
        description: `命中有天乙贵人（${zhi}），逢凶化吉，贵人扶持`,
        pillar,
      });
    }
  }

  // 文昌贵人
  for (const zhi of getWenChang(dayMaster)) {
    if (hasZhi(allZhi, zhi)) {
      const pillar = getShenShaPillar(bazi, zhi);
      all.push({
        name: '文昌贵人',
        type: '吉',
        description: '文昌入命，聪明好学，文采出众，利学业考运',
        pillar,
      });
    }
  }

  // 桃花
  for (const zhi of getTaoHua(dayZhi)) {
    if (hasZhi(allZhi, zhi)) {
      const pillar = getShenShaPillar(bazi, zhi);
      const isYearOrMonthPillar = pillar === '年' || pillar === '月';
      all.push({
        name: '桃花',
        type: isYearOrMonthPillar ? '吉' : '中性',
        description: isYearOrMonthPillar
          ? '墙内桃花，夫妻恩爱，感情和美'
          : '墙外桃花，异性缘佳，须防感情纠纷',
        pillar,
      });
    }
  }

  // 驿马
  for (const zhi of getYiMa(dayZhi)) {
    if (hasZhi(allZhi, zhi)) {
      const pillar = getShenShaPillar(bazi, zhi);
      all.push({
        name: '驿马',
        type: '中性',
        description: '驿马星动，奔波远行，事业多变动，动中求财',
        pillar,
      });
    }
  }

  // 华盖
  for (const zhi of getHuaGai(dayZhi)) {
    if (hasZhi(allZhi, zhi)) {
      const pillar = getShenShaPillar(bazi, zhi);
      all.push({
        name: '华盖',
        type: '中性',
        description: '华盖照命，孤独清高，有艺术天赋，与佛道有缘',
        pillar,
      });
    }
  }

  // 将星
  for (const zhi of getJiangXing(dayZhi)) {
    if (hasZhi(allZhi, zhi)) {
      const pillar = getShenShaPillar(bazi, zhi);
      all.push({
        name: '将星',
        type: '吉',
        description: '将星入命，领导力强，有统帅之才',
        pillar,
      });
    }
  }

  // 羊刃
  for (const zhi of getYangRen(dayMaster)) {
    if (hasZhi(allZhi, zhi)) {
      const pillar = getShenShaPillar(bazi, zhi);
      all.push({
        name: '羊刃',
        type: '凶',
        description: '羊刃入命，性格刚烈，易有血光，刚锐不可挡',
        pillar,
      });
    }
  }

  const auspicious = all.filter(s => s.type === '吉');
  const inauspicious = all.filter(s => s.type === '凶');

  return { all, auspicious, inauspicious };
}
