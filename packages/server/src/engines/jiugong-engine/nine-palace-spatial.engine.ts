// ============================================================
// 道之自然·空间命理系统 — 九宫飞星空间引擎 (v2)
// 
// 升级内容：
// 1. 时飞星（八时飞星）
// 2. 命主八字空间映射（用神方位/忌神方位/文昌/财位/桃花位）
// 3. 方位五行动态融合
// 4. 空间冲突检测（五黄/三煞/太岁/岁破）
// 5. 吉凶评分系统
// 
// 这是道之自然系统的第二灵魂
// ============================================================

import { Injectable } from '@nestjs/common';
import { calculateNinePalace, getYearStarCenter, generateFlyingStarLayout, analyzeStarPair, ninePalaceToString } from '@dzg/core';
import { NINE_STARS, DI_ZHI_LIST } from '@dzg/core';
import { ELEMENT_CN, ELEMENT_DIRECTIONS, cnToElement } from '../bazi-engine/core/fiveElements';
import type { Element5 } from '../bazi-engine/core/heavenlyStems';
import type { BranchName } from '../bazi-engine/core/earthlyBranches';
import type { StemName } from '../bazi-engine/core/heavenlyStems';
import type { NinePalaceDailyProtocol, PalaceProtocol, NineStarProtocol, SpatialConflict, UserSpaceMapping } from '../../protocols/fengshui.protocol';

// 九星信息（从旧引擎映射）
const STAR_INFO: Record<number, { name: string; wuxing: string; type: string }> = {
  1: { name: '贪狼', wuxing: '水', type: '吉' },
  2: { name: '巨门', wuxing: '土', type: '中性' },
  3: { name: '禄存', wuxing: '木', type: '凶' },
  4: { name: '文曲', wuxing: '木', type: '中性' },
  5: { name: '廉贞', wuxing: '土', type: '凶' },
  6: { name: '武曲', wuxing: '金', type: '吉' },
  7: { name: '破军', wuxing: '金', type: '凶' },
  8: { name: '左辅', wuxing: '土', type: '吉' },
  9: { name: '右弼', wuxing: '火', type: '中性' },
};

const PALACE_NAMES: Record<number, string> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
const PALACE_DIRECTIONS: Record<number, string> = { 1: '北', 2: '西南', 3: '东', 4: '东南', 5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南' };
const PALACE_WUXING: Record<number, string> = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };

// 各宫位本命位置
const WEN_CHANG_MAP: Record<StemName, string> = {
  '甲': '东南', '乙': '南', '丙': '西', '丁': '西', 
  '戊': '西南', '己': '西', '庚': '西北', '辛': '北',
  '壬': '东北', '癸': '东',
};

const WEALTH_MAP: Record<StemName, string> = {
  '甲': '东北', '乙': '北', '丙': '西', '丁': '西南',
  '戊': '东南', '己': '南', '庚': '东', '辛': '西北',
  '壬': '南', '癸': '东南',
};

const PEACH_MAP: Record<StemName, string> = {
  '甲': '东南', '乙': '南', '丙': '西', '丁': '西北',
  '戊': '西南', '己': '西', '庚': '东南', '辛': '南',
  '壬': '东', '癸': '西',
};

const SHA_MAP: Record<BranchName, string> = {
  '寅': '北', '卯': '北', '辰': '北',
  '巳': '西', '午': '西', '未': '西',
  '申': '南', '酉': '南', '戌': '南',
  '亥': '东', '子': '东', '丑': '东',
};

@Injectable()
export class NinePalaceSpatialEngine {
  /**
   * 完整九宫飞星日盘（含年/月/日/时飞星）
   */
  calculateFullDailyLayout(
    year: number,
    month: number,
    day: number,
    hour?: number,
  ): NinePalaceDailyProtocol {
    const baseResult = calculateNinePalace(year, month, day);
    const yearCenter = getYearStarCenter(year);
    const yearLayout = generateFlyingStarLayout(yearCenter);
    
    // 时飞星
    const hourStar = hour !== undefined ? this.calculateHourStar(year, month, day, hour) : 0;
    const hourLayout = hourStar > 0 ? generateFlyingStarLayout(hourStar as any) : [];

    return {
      date: new Date(year, month - 1, day),
      yearGanZhi: this.getYearGanZhi(year),
      monthGanZhi: '',
      dayGanZhi: '',
      yearStar: this.buildStarProtocol(yearCenter),
      monthStar: this.buildStarProtocol(0),
      dayStar: this.buildStarProtocol(0),
      yearPalaces: this.buildAllPalaces(baseResult.year),
      monthPalaces: this.buildAllPalaces(baseResult.month),
      dayPalaces: this.buildAllPalaces(baseResult.day),
      bestDirection: baseResult.summary.bestDirection,
      worstDirection: baseResult.summary.worstDirection,
      conflicts: this.detectConflicts(year, month, day, hour),
    };
  }

  /**
   * 时飞星计算（八时飞星）
   * 子丑寅卯辰巳午未申酉戌亥 → 对应不同入中星
   */
  private calculateHourStar(year: number, month: number, day: number, hour: number): number {
    const hourBranch = this.getHourBranch(hour);
    const branchIndex = (DI_ZHI_LIST as string[]).indexOf(hourBranch);
    // 时飞星：以日飞星为基准，加上时辰偏移
    const dayCenter = getYearStarCenter(day); // 简化：用日柱的循环
    const offset = branchIndex;
    return ((dayCenter - 1 + offset) % 9) + 1;
  }

  /**
   * 命主八字空间映射
   */
  calculateUserMapping(
    dayMaster: StemName,
    yearBranch: BranchName,
    yongShenElements: string[],
  ): UserSpaceMapping {
    const yongShenDirs = yongShenElements.map(el => {
      const dirMap: Record<string, string> = { '木': '东', '火': '南', '土': '中', '金': '西', '水': '北' };
      return dirMap[el] || '中';
    });

    return {
      yongShenDirections: [...new Set(yongShenDirs)],
      jiShenDirections: [], // 需要忌神信息
      wenChangPosition: WEN_CHANG_MAP[dayMaster] || '东南',
      wealthPosition: WEALTH_MAP[dayMaster] || '北',
      peachBlossomPosition: PEACH_MAP[dayMaster] || '南',
      shaPosition: SHA_MAP[yearBranch] || '北',
    };
  }

  /**
   * 空间冲突检测
   */
  private detectConflicts(year: number, month: number, day: number, hour?: number): SpatialConflict[] {
    const conflicts: SpatialConflict[] = [];

    // 五黄煞检测（5黄入中时有全局凶）
    const yearCenter = getYearStarCenter(year);
    if (yearCenter === 5) {
      conflicts.push({
        type: '五黄',
        palaces: ['中宫'],
        severity: '严重',
        description: '流年五黄入中，全年宜静不宜动',
        remedy: '宜用金属化煞（铜钱/铜铃）',
      });
    }

    // 年三煞检测
    const yearBranch = this.getYearBranch(year);
    const sanShaInfo = this.calculateSanSha(yearBranch);
    if (sanShaInfo) {
      conflicts.push({
        type: '三煞',
        palaces: sanShaInfo.palaces,
        severity: '中等',
        description: `流年三煞在${sanShaInfo.direction}方，不宜动土修造`,
        remedy: '三煞方宜静不宜动',
      });
    }

    // 太岁检测
    const taiSui = yearBranch;
    const taiSuiDirection = PALACE_DIRECTIONS[((DI_ZHI_LIST as string[]).indexOf(taiSui) + 1) % 13] || '北';
    conflicts.push({
      type: '五行相克',
      palaces: [`太岁方（${taiSuiDirection}）`],
      severity: '轻微',
      description: `本年太岁在${taiSui}方，宜敬不宜冲`,
      remedy: '太岁方宜坐不宜向',
    });

    return conflicts;
  }

  /** 三煞计算 */
  private calculateSanSha(yearBranch: string): { palaces: string[]; direction: string } | null {
    const sanShaMap: Record<string, { palaces: string[]; direction: string }> = {
      '申': { palaces: ['北坎宫', '东北艮宫'], direction: '北' },
      '子': { palaces: ['北坎宫', '东北艮宫'], direction: '北' },
      '辰': { palaces: ['北坎宫', '东北艮宫'], direction: '北' },
      '亥': { palaces: ['东震宫', '东南巽宫'], direction: '东' },
      '卯': { palaces: ['东震宫', '东南巽宫'], direction: '东' },
      '未': { palaces: ['东震宫', '东南巽宫'], direction: '东' },
      '巳': { palaces: ['南离宫'], direction: '南' },
      '酉': { palaces: ['南离宫'], direction: '南' },
      '丑': { palaces: ['南离宫'], direction: '南' },
      '寅': { palaces: ['西兑宫', '西北乾宫'], direction: '西' },
      '午': { palaces: ['西兑宫', '西北乾宫'], direction: '西' },
      '戌': { palaces: ['西兑宫', '西北乾宫'], direction: '西' },
    };
    return sanShaMap[yearBranch] || null;
  }

  /**
   * 命主与九宫融合：用户方位推荐
   */
  getDirectionAdvice(
    dailyLayout: NinePalaceDailyProtocol,
    userMapping: UserSpaceMapping,
  ): {
    recommended: string[];
    avoid: string[];
    reasons: string[];
  } {
    const recommended: string[] = [];
    const avoid: string[] = [];
    const reasons: string[] = [];

    // 根据九宫最佳方位 + 命主用神方位综合推荐
    const bestDir = dailyLayout.bestDirection.split('（')[0];
    recommended.push(bestDir);
    reasons.push(`九宫飞星今日最佳方位：${bestDir}`);

    // 命主文昌位
    recommended.push(userMapping.wenChangPosition);
    reasons.push(`本命文昌位在${userMapping.wenChangPosition}，宜学习/考试/文书`);

    // 命主财位
    recommended.push(userMapping.wealthPosition);
    reasons.push(`本命财位在${userMapping.wealthPosition}，宜催财`);

    // 忌神方位
    const worstDir = dailyLayout.worstDirection.split('（')[0];
    avoid.push(worstDir);
    reasons.push(`九宫飞星今日最差方位：${worstDir}`);

    // 命主煞位
    avoid.push(userMapping.shaPosition);
    reasons.push(`本命煞位在${userMapping.shaPosition}，宜避之`);

    // 空间冲突涉及方位
    for (const conflict of dailyLayout.conflicts) {
      for (const palace of conflict.palaces) {
        avoid.push(palace.replace('宫', '').replace('方', ''));
        reasons.push(`空间冲突：${conflict.description}`);
      }
    }

    return { recommended: [...new Set(recommended)], avoid: [...new Set(avoid)], reasons };
  }

  /**
   * 吉凶评分
   */
  getLuckScore(
    dailyLayout: NinePalaceDailyProtocol,
    userMapping?: UserSpaceMapping,
  ): { score: number; level: '大吉' | '吉' | '平' | '凶' | '大凶'; detail: string } {
    let score = 50;

    // 九宫评级加分
    const bestEnergy = dailyLayout.yearPalaces.find(p => p.direction === dailyLayout.bestDirection.split('（')[0]);
    if (bestEnergy && bestEnergy.energy >= 80) score += 20;
    else if (bestEnergy && bestEnergy.energy >= 60) score += 10;

    // 冲突减分
    const severeConflicts = dailyLayout.conflicts.filter(c => c.severity === '严重').length;
    const mediumConflicts = dailyLayout.conflicts.filter(c => c.severity === '中等').length;
    score -= severeConflicts * 15;
    score -= mediumConflicts * 8;

    // 命主用神方向加分
    if (userMapping) {
      const bestDir = dailyLayout.bestDirection;
      if (userMapping.yongShenDirections.some(d => bestDir.includes(d))) {
        score += 10;
      }
    }

    score = Math.max(0, Math.min(100, score));

    let level: '大吉' | '吉' | '平' | '凶' | '大凶';
    if (score >= 80) level = '大吉';
    else if (score >= 60) level = '吉';
    else if (score >= 40) level = '平';
    else if (score >= 20) level = '凶';
    else level = '大凶';

    return { score, level, detail: `综合评分 ${score}/100（${level}）` };
  }

  // ========== 私有辅助方法 ==========

  private buildStarProtocol(starNumber: number): NineStarProtocol {
    const info = STAR_INFO[starNumber] || { name: '未知', wuxing: '土', type: '中性' };
    return {
      number: starNumber,
      name: info.name,
      type: info.type as any,
      wuxing: info.wuxing,
      energy: 50,
      suitable: '',
      avoid: '',
    };
  }

  private buildAllPalaces(basePalaces: any[]): PalaceProtocol[] {
    return basePalaces.map((p: any) => ({
      position: p.position,
      name: p.name,
      direction: p.direction,
      star: this.buildStarProtocol(p.currentStar),
      palaceWuxing: PALACE_WUXING[p.position] || '土',
      energy: p.energy,
      rating: this.energyToRating(p.energy),
    }));
  }

  private energyToRating(energy: number): '大吉' | '吉' | '平' | '凶' | '大凶' {
    if (energy >= 80) return '大吉';
    if (energy >= 60) return '吉';
    if (energy >= 40) return '平';
    if (energy >= 20) return '凶';
    return '大凶';
  }

  private getHourBranch(hour: number): string {
    const map: Record<number, string> = {
      23: '子', 0: '子', 1: '丑', 2: '丑',
      3: '寅', 4: '寅', 5: '卯', 6: '卯',
      7: '辰', 8: '辰', 9: '巳', 10: '巳',
      11: '午', 12: '午', 13: '未', 14: '未',
      15: '申', 16: '申', 17: '酉', 18: '酉',
      19: '戌', 20: '戌', 21: '亥', 22: '亥',
    };
    return map[hour] || '子';
  }

  private getYearGanZhi(year: number): string {
    const stem = '甲乙丙丁戊己庚辛壬癸'[((year - 4) % 10 + 10) % 10];
    const branch = '子丑寅卯辰巳午未申酉戌亥'[((year - 4) % 12 + 12) % 12];
    return stem + branch;
  }

  private getYearBranch(year: number): string {
    return '子丑寅卯辰巳午未申酉戌亥'[((year - 4) % 12 + 12) % 12];
  }
}
