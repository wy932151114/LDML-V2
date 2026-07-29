// ============================================================
// 道之自然·命理引擎 — 大运排算（动态生命历程）
// 包括：起运年龄、大运排列、流年分析
// ============================================================

import type { BaZi, TianGan, DiZhi, DaYun, DaYunPillar, LiuNian, WuXing } from '../types';
import {
  TIAN_GAN_LIST, DI_ZHI_LIST, TIAN_GAN, DI_ZHI,
  getNayin, MONTH_POWER,
} from '../utils/constants';
import { getShiShen } from '../wuxing/analysis';
import { getSolarTermsForYear } from '../bazi/core';

// ============================================================
// 1. 起运年龄（阳男阴女顺行，阴男阳女逆行）
// ============================================================

/**
 * 计算起运年龄
 * 
 * 核心规则：
 * 阳年男、阴年女 → 顺行（从出生日顺数到下一个节气）
 * 阴年男、阳年女 → 逆行（从出生日逆数到上一个节气）
 * 
 * 每三天 = 一岁运
 * 一天 = 四个月
 * 一个时辰(2小时) = 十天
 */
export function calculateStartLuckAge(
  bazi: BaZi,
  birthYear: number,
  birthMonth: number,
  birthDay: number
): number {
  const yearGan = bazi.year.heavenlyStem;
  const gender = bazi.gender;

  // 阳年判定：甲丙戊庚壬
  const isYangYear = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan);

  // 阳男阴女 = 顺行；阴男阳女 = 逆行
  const isForward = (isYangYear && gender === '男') || (!isYangYear && gender === '女');

  // 12个节令（起运以节为界，而非中气）
  const jieTerms = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', 
                    '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  const terms = getSolarTermsForYear(birthYear);

  let targetTerm: Date | null = null;

  if (isForward) {
    // 顺行：找出生后第一个节
    for (const name of jieTerms) {
      const d = terms.get(name);
      if (d && d > birthDate) { targetTerm = d; break; }
    }
    if (!targetTerm) {
      const nextTerms = getSolarTermsForYear(birthYear + 1);
      for (const name of jieTerms) {
        const d = nextTerms.get(name);
        if (d) { targetTerm = d; break; }
      }
    }
  } else {
    // 逆行：找出生前最近的一个节（而非列表中最后的节气）
    let closestDiff = Infinity;
    for (const name of jieTerms) {
      const d = terms.get(name);
      if (d && d < birthDate) {
        const diff = birthDate.getTime() - d.getTime();
        if (diff < closestDiff) { closestDiff = diff; targetTerm = d; }
      }
    }
    // 没有找到（出生早于立春）则查上一年
    if (!targetTerm) {
      const prevTerms = getSolarTermsForYear(birthYear - 1);
      let closestPrevDiff = Infinity;
      for (const name of jieTerms) {
        const d = prevTerms.get(name);
        if (d && d < birthDate) {
          const diff = birthDate.getTime() - d.getTime();
          if (diff < closestPrevDiff) { closestPrevDiff = diff; targetTerm = d; }
        }
      }
    }
  }

  if (!targetTerm) {
    // 异常降级：使用月份估算
    return calculateStartLuckAgeFallback(bazi, birthYear, birthMonth, birthDay);
  }

  // 计算间隔天数（精确到秒）
  const diffMs = isForward
    ? targetTerm.getTime() - birthDate.getTime()
    : birthDate.getTime() - targetTerm.getTime();

  const totalDays = diffMs / (1000 * 60 * 60 * 24);

  // 三天 = 一岁（古法起运公式）
  // 四舍五入到整数，范围 [1, 10]
  const startAgeFloat = totalDays / 3;
  const startAge = Math.max(1, Math.min(10, Math.round(startAgeFloat)));

  return startAge;
}

/** 降级方案：基于月份估算（当节气数据异常时使用） */
function calculateStartLuckAgeFallback(
  bazi: BaZi,
  birthYear: number,
  birthMonth: number,
  birthDay: number
): number {
  const yearGan = bazi.year.heavenlyStem;
  const gender = bazi.gender;
  const isYangYear = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan);
  const isForward = (isYangYear && gender === '男') || (!isYangYear && gender === '女');

  let baseAge: number;
  if (birthMonth >= 11 || birthMonth <= 1) {
    baseAge = isForward ? 3 : 4;
  } else if (birthMonth >= 2 && birthMonth <= 4) {
    baseAge = isForward ? 4 : 5;
  } else if (birthMonth >= 5 && birthMonth <= 7) {
    baseAge = isForward ? 5 : 6;
  } else {
    baseAge = isForward ? 4 : 5;
  }

  return Math.max(1, Math.min(10, baseAge));
}
// ============================================================
// 2. 大运序列
// ============================================================

/**
 * 排列大运
 * 每十年一大运，从起运年龄开始
 */
export function calculateDaYun(bazi: BaZi, startAge: number): DaYun {
  const yearGan = bazi.year.heavenlyStem;
  const gender = bazi.gender;
  const isYangYear = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan);
  const isForward = (isYangYear && gender === '男') || (!isYangYear && gender === '女');

  const monthGan = bazi.month.heavenlyStem;
  const monthZhi = bazi.month.earthlyBranch;

  const pillars: DaYunPillar[] = [];
  const birthYear = parseInt(bazi.birthTime.substring(0, 4));

  // 从月柱开始，顺/逆推
  let ganIdx = TIAN_GAN_LIST.indexOf(monthGan);
  let zhiIdx = DI_ZHI_LIST.indexOf(monthZhi);
  const genderStr = isForward ? '顺行' : '逆行';

  // 男性大运天干数：此方法为当前流派通用方法
  // 月柱顺行：天干+1，地支+1
  // 月柱逆行：天干-1，地支-1
  if (!isForward) {
    ganIdx = (ganIdx - 1 + 10) % 10;
    zhiIdx = (zhiIdx - 1 + 12) % 12;
  }

  for (let i = 0; i < 8; i++) {
    // 每个大运递增/递减一位
    const offset = isForward ? (i + 1) : -(i + 1);
    const gIdx = ((ganIdx + offset) % 10 + 10) % 10;
    const zIdx = ((zhiIdx + offset) % 12 + 12) % 12;

    const gan = TIAN_GAN_LIST[gIdx] as TianGan;
    const zhi = DI_ZHI_LIST[zIdx] as DiZhi;

    const startA = startAge + i * 10;
    const endA = startAge + (i + 1) * 10 - 1;
    const startY = birthYear + startA;
    const endY = birthYear + endA;

    // 天干十神（直接算）
    const stemSS = getShiShen(bazi.dayMaster, gan);
    // 地支十神用藏干本气
    const cangGan = DI_ZHI[zhi].cangGan[0];
    const branchSS = getShiShen(bazi.dayMaster, cangGan);

    // 大运干支五行
    const wxList: WuXing[] = [TIAN_GAN[gan].wuxing];
    const zhiWx = DI_ZHI[zhi].wuxing;
    if (wxList.indexOf(zhiWx) === -1) wxList.push(zhiWx);
    pillars.push({
      ganZhi: `${gan}${zhi}`,
      startAge: startA,
      endAge: endA,
      startYear: startY,
      endYear: endY,
      stemShiShen: stemSS || undefined,
      branchShiShen: branchSS || undefined,
      wuxing: wxList,
    });
  }

  return { startAge, pillars };
}

// ============================================================
// 3. 流年分析
// ============================================================

/** 分析当前或目标年份的流年 */
export function calculateLiuNian(
  targetYear: number,
  bazi: BaZi,
  daYun: DaYun
): LiuNian {
  // 流年干支
  const ganIdx = (targetYear - 4) % 10;
  const zhiIdx = (targetYear - 4) % 12;
  const tiangan = TIAN_GAN_LIST[(ganIdx + 10) % 10] as TianGan;
  const dizhi = DI_ZHI_LIST[(zhiIdx + 12) % 12] as DiZhi;

  // 流年十神
  const shiShens: import('../types').ShiShen[] = [];
  const stemSS = getShiShen(bazi.dayMaster, tiangan);
  if (stemSS) shiShens.push(stemSS);
  const branchSS = getShiShen(bazi.dayMaster, dizhi);
  if (branchSS) shiShens.push(branchSS);

  // 流年五行
  const wxList: WuXing[] = [TIAN_GAN[tiangan].wuxing];
  const zhiWx = DI_ZHI[dizhi].wuxing;
  if (!wxList.includes(zhiWx)) wxList.push(zhiWx);

  // 找到当年所处的大运
  const currentDaYun = daYun.pillars.find(
    p => targetYear >= p.startYear && targetYear <= p.endYear
  );

  // 用神判断（简化）
  const luckRating = getLiuNianRating(tiangan, dizhi, bazi, wxList);

  // 重点关注领域
  const focusAreas = getLiuNianFocus(dizhi, luckRating);

  return {
    year: targetYear,
    ganZhi: `${tiangan}${dizhi}`,
    tiangan,
    dizhi,
    shiShen: shiShens,
    wuxing: wxList,
    daYunRelation: currentDaYun ? `处于${currentDaYun.ganZhi}大运` : '大运交界期',
    fateRelation: `流年与命局共同作用`,
    luckRating,
    focusAreas,
  };
}

/** 流年吉凶评级 */
function getLiuNianRating(
  gan: TianGan,
  zhi: DiZhi,
  bazi: BaZi,
  yearWx: WuXing[]
): '大吉' | '吉' | '平' | '凶' | '大凶' {
  const dayMasterWx = TIAN_GAN[bazi.dayMaster].wuxing;

  // 流年天干是否与日主相同（伏吟/比劫年）
  if (gan === bazi.dayMaster) {
    // 身强则忌，身弱则喜
    return '平';
  }

  // 流年地支是否与日支相同
  if (zhi === bazi.day.earthlyBranch) {
    return '凶'; // 日柱伏吟
  }

  // 流年与日主相合
  const heMap: Record<TianGan, TianGan> = {
    '甲': '己', '乙': '庚', '丙': '辛', '丁': '壬', '戊': '癸',
    '己': '甲', '庚': '乙', '辛': '丙', '壬': '丁', '癸': '戊',
  };
  if (heMap[gan] === bazi.dayMaster) {
    return '吉'; // 天干五合，合化有情
  }

  // 流年地支三合、六合判断（简化）
  // 简单规则：流年五行生扶日主为吉，克制为凶
  const shengMap: Record<WuXing, WuXing> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const keMap: Record<WuXing, WuXing> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

  for (const wx of yearWx) {
    if (shengMap[wx] === dayMasterWx) return '吉';
    if (keMap[wx] === dayMasterWx) return '凶';
  }

  return '平';
}

/** 判断流年关注领域 */
function getLiuNianFocus(zhi: DiZhi, rating: string): string[] {
  const focusMap: Record<DiZhi, string[]> = {
    '子': ['事业', '学术'],
    '丑': ['财运', '家庭'],
    '寅': ['事业', '创业'],
    '卯': ['财运', '名声'],
    '辰': ['变动', '家庭'],
    '巳': ['学业', '名誉'],
    '午': ['事业', '感情'],
    '未': ['健康', '家庭'],
    '申': ['事业', '迁移'],
    '酉': ['财运', '感情'],
    '戌': ['健康', '官司'],
    '亥': ['人际', '心灵成长'],
  };

  const focuses = focusMap[zhi] || ['综合'];
  if (rating === '大凶' || rating === '凶') {
    focuses.push('健康', '财务风险');
  }
  return focuses;
}