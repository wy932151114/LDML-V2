// ============================================================
// 道之自然五行动态能量引擎 (WuXingEnergyEngine)
// 
// 不再是传统静态五行评分。
// 而是包含：
//   - 基础八字五行
//   - 月令季节加持/衰减（道之自然月令×2.0特色）
//   - 节气衰减因子
//   - 九宫方位影响
//   - 流年天干影响
//   = 最终 = 动态能量场
// ============================================================

import { Injectable } from '@nestjs/common';
import { ALL_ELEMENTS, ELEMENT_CN, ELEMENT_DIRECTIONS, GENERATE, CONTROL } from '../bazi-engine/core/fiveElements';
import type { Element5 } from '../bazi-engine/core/heavenlyStems';
import type { WuXingEnergyField, WuXingEnergy, WuXingProtocol } from '../../protocols/wuxing.protocol';
import type { BaziProtocol } from '../../protocols/bazi.protocol';

export interface EnergyContext {
  /** 基础五行评分 */
  baseScores: Record<Element5, number>;
  /** 月令地支 */
  monthBranch: string;
  /** 日主五行 */
  dayMasterElement: Element5;
  /** 当前年份 */
  currentYear?: number;
  /** 九宫当前宫位飞星权值 */
  palaceWuxingWeights?: Record<Element5, number>;
}

@Injectable()
export class WuXingEnergyEngine {
  /**
   * 计算五行动态能量场
   * 
   * @param context 包含所有影响因子的上下文
   * @returns 动态五行能量场
   */
  calculateEnergyField(context: EnergyContext): WuXingEnergyField {
    const { baseScores, monthBranch, dayMasterElement, currentYear, palaceWuxingWeights } = context;
    
    // 月令五行映射
    const branchElement: Record<string, Element5> = {
      '寅': 'wood', '卯': 'wood',
      '巳': 'fire', '午': 'fire',
      '辰': 'earth', '未': 'earth', '戌': 'earth', '丑': 'earth',
      '申': 'metal', '酉': 'metal',
      '亥': 'water', '子': 'water',
    };
    const monthElement = branchElement[monthBranch] || 'earth';

    // 流年天干影响
    const yearStemElement = currentYear ? this.getYearStemElement(currentYear) : null;

    const totalBase = Object.values(baseScores).reduce((a, b) => a + b, 0) || 1;
    const energyMap: Record<Element5, WuXingEnergy> = {} as any;

    for (const el of ALL_ELEMENTS) {
      const base = baseScores[el] || 0;
      const basePct = base / totalBase;

      // 月令季节加持（道之自然特色：月令加倍）
      let seasonalBoost = 0;
      if (el === monthElement) {
        seasonalBoost = base * 1.0; // 月令同五行，加倍
      } else if (GENERATE[monthElement] === el) {
        seasonalBoost = base * 0.5; // 月令生我，加50%
      } else if (GENERATE[el] === monthElement) {
        seasonalBoost = -base * 0.3; // 我生月令，泄30%
      } else if (CONTROL[monthElement] === el) {
        seasonalBoost = -base * 0.4; // 月令克我，减40%
      }

      // 节气衰减（简单近似：以立春为周期基准）
      const solarDecay = 0; // 预留

      // 九宫方位影响
      const palaceInfluence = (palaceWuxingWeights && palaceWuxingWeights[el]) || 0;

      // 流年天干影响
      let annualInfluence = 0;
      if (yearStemElement) {
        if (yearStemElement === el) annualInfluence = base * 0.3;
        else if (GENERATE[yearStemElement] === el) annualInfluence = base * 0.15;
        else if (CONTROL[yearStemElement] === el) annualInfluence = -base * 0.2;
      }

      const finalScore = Math.round(base + seasonalBoost + solarDecay + palaceInfluence + annualInfluence);
      const finalPercent = Math.round((finalScore / (totalBase + Object.values(baseScores).reduce((a, b) => a + b, 0) * 0.5)) * 100);

      energyMap[el] = {
        base,
        seasonalBoost: Math.round(seasonalBoost),
        solarDecay,
        palaceInfluence: Math.round(palaceInfluence),
        annualInfluence: Math.round(annualInfluence),
        finalScore: Math.max(0, finalScore),
        finalPercent: Math.max(0, Math.min(100, finalPercent)),
      };
    }

    const totalEnergy = Object.values(energyMap).reduce((a, e) => a + e.finalScore, 0);
    const dominant = this.findMax(energyMap);
    const weakest = this.findMin(energyMap);

    return {
      wood: energyMap.wood,
      fire: energyMap.fire,
      earth: energyMap.earth,
      metal: energyMap.metal,
      water: energyMap.water,
      totalEnergy,
      dominantElement: dominant,
      weakestElement: weakest,
      balanceState: this.determineState(energyMap, dayMasterElement),
    };
  }

  /**
   * 从八字协议构建WuXing协议
   */
  buildWuXingProtocol(bazi: BaziProtocol): WuXingProtocol {
    // 这应该与./bazi.service.ts中逻辑整合
    // 当前为占位，实际调用BaziService获取计算数据
    throw new Error('请通过BaziService获取计算数据后构建');
  }

  private getYearStemElement(year: number): Element5 | null {
    const yearStemIndex = ((year - 4) % 10 + 10) % 10;
    const stemElementMap: Element5[] = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
    return stemElementMap[yearStemIndex];
  }

  private findMax(map: Record<Element5, WuXingEnergy>): Element5 {
    let max = -Infinity;
    let maxEl: Element5 = 'earth';
    for (const el of ALL_ELEMENTS) {
      if (map[el].finalScore > max) {
        max = map[el].finalScore;
        maxEl = el;
      }
    }
    return maxEl;
  }

  private findMin(map: Record<Element5, WuXingEnergy>): Element5 {
    let min = Infinity;
    let minEl: Element5 = 'earth';
    for (const el of ALL_ELEMENTS) {
      if (map[el].finalScore < min) {
        min = map[el].finalScore;
        minEl = el;
      }
    }
    return minEl;
  }

  private determineState(map: Record<Element5, WuXingEnergy>, dmEl: Element5): '平衡' | '偏旺' | '偏弱' | '过旺' | '过弱' {
    const dmScore = map[dmEl].finalScore;
    const avg = Object.values(map).reduce((a, e) => a + e.finalScore, 0) / 5;
    if (avg === 0) return '平衡';
    const ratio = dmScore / avg;
    if (ratio > 1.8) return '过旺';
    if (ratio > 1.3) return '偏旺';
    if (ratio < 0.5) return '过弱';
    if (ratio < 0.7) return '偏弱';
    return '平衡';
  }
}
