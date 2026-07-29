// ============================================================
// 道之自然·命理引擎 — 五行动态分析系统
// 日主强弱、用神算法、十神分析、五行动态平衡
// ============================================================

import type {
  BaZi, Pillar, WuXing,
  TianGan, DiZhi,
  WuXingAnalysis, ShiShen, ShiShenAnalysis,
} from '../types';
import {
  TIAN_GAN, DI_ZHI, TIAN_GAN_LIST, DI_ZHI_LIST,
  WU_XING_SHENG, WU_XING_KE,
  WU_XING_SHENG_WO, WU_XING_KE_WO,
  MONTH_POWER,
} from '../utils/constants';

// ============================================================
// 1. 基础五行汇总
// ============================================================

/** 从四柱中提取所有天干和地支藏干的五行分布 */
export function collectAllWuXing(bazi: BaZi): WuXing[] {
  const result: WuXing[] = [];
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];

  for (const pillar of pillars) {
    // 天干五行
    result.push(TIAN_GAN[pillar.heavenlyStem].wuxing);
    
    // 地支本气五行（权重最大）
    const zhiInfo = DI_ZHI[pillar.earthlyBranch];
    result.push(zhiInfo.wuxing);
    
    // 藏干五行（每个藏干计一次）
    for (const cangGan of pillar.hiddenStems) {
      result.push(TIAN_GAN[cangGan].wuxing);
    }
  }

  return result;
}

// ============================================================
// 2. 五行计分系统（带月令权重）
// ============================================================

/** 五行计分：考虑月令、地支力量、藏干多寡 */
export function scoreWuXing(bazi: BaZi): Record<WuXing, number> {
  const scores: Record<WuXing, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  const monthZhi = bazi.month.earthlyBranch;
  const monthPower = MONTH_POWER[monthZhi];

  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];

  for (const pillar of pillars) {
    // === 天干（透干）权重高 ===
    const ganWx = TIAN_GAN[pillar.heavenlyStem].wuxing;
    // 天干得月令加成：如果天干五行与月令地支五行相同，加30%
    let ganScore = 36; // 天干基础分
    if (monthPower[ganWx] > 50) {
      ganScore *= 1.3; // 得令
    } else if (monthPower[ganWx] < 10) {
      ganScore *= 0.8; // 失令
    }
    // 月令五行与天干相同的情况
    const monthWx = DI_ZHI[monthZhi].wuxing;
    if (ganWx === monthWx) {
      ganScore *= 1.5; // 天干同月令，加倍
    }
    scores[ganWx] += Math.round(ganScore);

    // === 地支（本气）权重中等 ===
    const zhiWx = DI_ZHI[pillar.earthlyBranch].wuxing;
    let zhiScore = 24; // 地支基础分
    // 地支的月令力量
    zhiScore *= (monthPower[zhiWx] / 50 + 0.5);
    scores[zhiWx] += Math.round(zhiScore);

    // === 藏干（余气）权重较低 ===
    for (const cangGan of pillar.hiddenStems) {
      const cangWx = TIAN_GAN[cangGan].wuxing;
      let cangScore = 10;
      // 本气（第一个藏干）权重更高
      if (cangGan === DI_ZHI[pillar.earthlyBranch].cangGan[0]) {
        cangScore = 16;
      }
      // 中气（第二个）权重次之
      else if (DI_ZHI[pillar.earthlyBranch].cangGan.length > 1 && 
               cangGan === DI_ZHI[pillar.earthlyBranch].cangGan[1]) {
        cangScore = 12;
      }
      scores[cangWx] += cangScore;
    }
  }

  return scores;
}

// ============================================================
// 3. 日主强弱判定
// ============================================================

/** 判断日主强弱（身强/身弱/中和） */
export function analyzeDayMasterStrength(
  bazi: BaZi,
  scores: Record<WuXing, number>
): { strength: string; bodyStrength: '身强' | '身弱' | '中和' } {
  const dayMasterWx = TIAN_GAN[bazi.dayMaster].wuxing;
  const dmScore = scores[dayMasterWx];

  // 计算其他五行的总分
  const otherScores = Object.entries(scores)
    .filter(([wx]) => wx !== dayMasterWx)
    .reduce((sum, [, score]) => sum + score, 0);

  // 生助日主的五行（生我、同我）
  const shengWo = WU_XING_SHENG_WO[dayMasterWx]; // 生我
  const shengScore = scores[shengWo] || 0;
  const sameScore = dmScore; // 同我（日主本身）

  // 克制日主的五行（克我、我生）
  const keWo = WU_XING_KE_WO[dayMasterWx]; // 克我
  const keScore = scores[keWo] || 0;

  // 日主支持率 = (生我 + 同我) / (克我 + 我生)
  const supportRatio = (shengScore + sameScore) / Math.max(keScore + (scores[WU_XING_SHENG[dayMasterWx]] || 0), 1);

  let strength: string;
  let bodyStrength: '身强' | '身弱' | '中和';

  if (supportRatio >= 2.0) {
    strength = '极强';
    bodyStrength = '身强';
  } else if (supportRatio >= 1.3) {
    strength = '强';
    bodyStrength = '身强';
  } else if (supportRatio >= 0.7) {
    strength = '中和';
    bodyStrength = '中和';
  } else if (supportRatio >= 0.4) {
    strength = '弱';
    bodyStrength = '身弱';
  } else {
    strength = '极弱';
    bodyStrength = '身弱';
  }

  return { strength, bodyStrength };
}

// ============================================================
// 4. 用神/喜神/忌神算法
// ============================================================

/** 
 * 用神算法（道之自然规则）
 * 
 * 核心原则：
 * 1. 身强则用克泄耗（克我、我生、我克皆为用）
 * 2. 身弱则用生扶（生我、同我皆为用）
 * 3. 过旺需疏通（通关为要）
 * 4. 过弱需补益（扶抑为法）
 * 5. 缺失五行需酌情补益
 */
export function determineYongShen(
  bodyStrength: '身强' | '身弱' | '中和',
  scores: Record<WuXing, number>,
  dayMasterWx: WuXing
): {
  yongShen: WuXing[];
  xiShen: WuXing[];
  jiShen: WuXing[];
  balanceState: string;
  missing: WuXing[];
  excess: WuXing[];
} {
  const allWx: WuXing[] = ['木', '火', '土', '金', '水'];
  const missing = allWx.filter(wx => scores[wx] < 20 && wx !== dayMasterWx);
  const excess = allWx.filter(wx => scores[wx] > 150);

  let balanceState: string;
  if (bodyStrength === '身强') {
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 200) {
      balanceState = '过旺';
    } else {
      balanceState = '偏旺';
    }
  } else if (bodyStrength === '身弱') {
    const minScore = Math.min(...Object.values(scores));
    if (minScore < 20) {
      balanceState = '过弱';
    } else {
      balanceState = '偏弱';
    }
  } else {
    balanceState = '平衡';
  }

  let yongShen: WuXing[];
  let xiShen: WuXing[];
  let jiShen: WuXing[];

  if (bodyStrength === '身强') {
    // 身强：需克泄耗
    // 用神 = 克我、我生（泄）、我克（耗）
    const keWoWx = WU_XING_KE_WO[dayMasterWx];  // 克我（官杀）
    const woShengWx = WU_XING_SHENG[dayMasterWx]; // 我生（食伤）
    const woKeWx = WU_XING_KE[dayMasterWx];       // 我克（财）

    yongShen = [keWoWx, woShengWx, woKeWx];
    // 喜神 = 与用神相生的五行
    xiShen = yongShen.map(wx => WU_XING_SHENG_WO[wx]).filter(w => w !== dayMasterWx);
    if (xiShen.length === 0) xiShen = yongShen;
    // 忌神 = 生我的、同我的
    jiShen = [WU_XING_SHENG_WO[dayMasterWx], dayMasterWx].filter((v, i, a) => a.indexOf(v) === i);
  } else if (bodyStrength === '身弱') {
    // 身弱：需生扶
    // 用神 = 生我（印星）、同我（比劫）
    const shengWoWx = WU_XING_SHENG_WO[dayMasterWx]; // 生我
    yongShen = [shengWoWx, dayMasterWx];
    // 喜神 = 助用神的
    xiShen = [shengWoWx, dayMasterWx];
    // 忌神 = 克我、我生的
    const keWoWx = WU_XING_KE_WO[dayMasterWx];
    const woShengWx = WU_XING_SHENG[dayMasterWx];
    jiShen = [keWoWx, woShengWx].filter((v, i, a) => a.indexOf(v) === i);
  } else {
    // 中和：哪弱补哪，平衡为要
    const minScore = Math.min(...Object.values(scores));
    yongShen = allWx.filter(wx => scores[wx] === minScore);
    xiShen = allWx.filter(wx => scores[wx] < 60);
    jiShen = allWx.filter(wx => scores[wx] > 100);
    if (yongShen.length === 0) yongShen = allWx;
  }

  // 去重
  yongShen = [...new Set(yongShen)];
  xiShen = [...new Set(xiShen)];
  jiShen = [...new Set(jiShen)];

  return { yongShen, xiShen, jiShen, balanceState, missing, excess };
}

// ============================================================
// 5. 十神分析
// ============================================================

/** 根据日干获取某天干的十神（也支持DiZhi，会自动用本气） */
export function getShiShen(
  dayMaster: TianGan,
  target: TianGan | DiZhi
): ShiShen | null {
  // 如果传入的是DiZhi，用本气（第一个藏干）
  const isDiZhi = (t: any): t is DiZhi => DI_ZHI_LIST.includes(t);
  const targetGan: TianGan = isDiZhi(target) ? DI_ZHI[target].cangGan[0] : target;
  
  const dmInfo = TIAN_GAN[dayMaster];
  const tgInfo = TIAN_GAN[targetGan];

  // 阴阳同异判断
  const sameYinYang = dmInfo.yinyang === tgInfo.yinyang;

  if (dmInfo.wuxing === tgInfo.wuxing) {
    return sameYinYang ? '比肩' : '劫财';
  }

  // 生我者为印
  if (WU_XING_SHENG_WO[dmInfo.wuxing] === tgInfo.wuxing) {
    return sameYinYang ? '偏印' : '正印';
  }

  // 我生者为食伤
  if (WU_XING_SHENG[dmInfo.wuxing] === tgInfo.wuxing) {
    return sameYinYang ? '食神' : '伤官';
  }

  // 克我者为官杀
  if (WU_XING_KE_WO[dmInfo.wuxing] === tgInfo.wuxing) {
    return sameYinYang ? '偏官' : '正官';
  }

  // 我克者为财
  if (WU_XING_KE[dmInfo.wuxing] === tgInfo.wuxing) {
    return sameYinYang ? '偏财' : '正财';
  }

  return null;
}

/** 完整十神分析 */
export function analyzeShiShen(bazi: BaZi): ShiShenAnalysis {
  const dayMaster = bazi.dayMaster;
  const stemShiShen: Record<TianGan, ShiShen | null> = {} as Record<TianGan, ShiShen | null>;
  const branchShiShen: Record<DiZhi, ShiShen[]> = {} as Record<DiZhi, ShiShen[]>;
  const stats: Record<ShiShen, number> = {} as Record<ShiShen, number>;
  
  // 初始化统计
  const shiShenList: ShiShen[] = ['正官', '偏官', '正印', '偏印', '正财', '偏财', '食神', '伤官', '比肩', '劫财'];
  for (const s of shiShenList) stats[s] = 0;

  // 分析天干
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  for (const pillar of pillars) {
    const s = getShiShen(dayMaster, pillar.heavenlyStem);
    if (s) {
      stemShiShen[pillar.heavenlyStem] = s;
      stats[s]++;
    }

    // 地支藏干
    branchShiShen[pillar.earthlyBranch] = [];
    for (const cangGan of pillar.hiddenStems) {
      const s2 = getShiShen(dayMaster, cangGan);
      if (s2) {
        branchShiShen[pillar.earthlyBranch].push(s2);
        stats[s2]++;
      }
    }
  }

  // 十神力量排名
  const ranking = shiShenList
    .map(s => ({ shishen: s, count: stats[s], power: stats[s] * 10 }))
    .sort((a, b) => b.count - a.count);

  return { stem: stemShiShen, branch: branchShiShen, stats, ranking };
}

// ============================================================
// 6. 完整五行分析入口
// ============================================================

/**
 * 完整的五行分析
 * 这是道之自然系统的核心决策入口之一
 * 输出 = 日主强弱 + 用神/喜神/忌神 + 五行动态平衡
 */
export function calculateWuXing(bazi: BaZi): WuXingAnalysis {
  const scores = scoreWuXing(bazi);
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentage = Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, Math.round((v / totalScore) * 100)])
  ) as Record<WuXing, number>;

  const dayMasterWx = TIAN_GAN[bazi.dayMaster].wuxing;
  const { strength, bodyStrength } = analyzeDayMasterStrength(bazi, scores);
  const { yongShen, xiShen, jiShen, balanceState, missing, excess } =
    determineYongShen(bodyStrength, scores, dayMasterWx);

  return {
    scores,
    percentage,
    dayMasterWx,
    dayMasterStrength: strength,
    bodyStrength,
    yongShen,
    xiShen,
    jiShen,
    balanceState: balanceState as '平衡' | '偏旺' | '偏弱' | '过旺' | '过弱',
    missing,
    excess,
  };
}

/** 五行分析易读字符串 */
export function wuxingToString(wx: WuXingAnalysis): string {
  const pctStr = Object.entries(wx.percentage)
    .map(([k, v]) => `${k} ${v}%`)
    .join(' | ');

  return `【五行动态分析】
  日主：${wx.dayMasterWx}
  日主强弱：${wx.dayMasterStrength}
  身强弱：${wx.bodyStrength}
  平衡状态：${wx.balanceState}
  ─────────────
  五行分布：${pctStr}
  ─────────────
  用神：${wx.yongShen.join('、')}
  喜神：${wx.xiShen.join('、')}
  忌神：${wx.jiShen.join('、')}
  ${wx.missing.length ? `\n  缺失：${wx.missing.join('、')}` : ''}
  ${wx.excess.length ? `\n  过旺：${wx.excess.join('、')}` : ''}`;
}
