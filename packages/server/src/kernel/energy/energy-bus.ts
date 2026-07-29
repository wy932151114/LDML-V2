// ============================================================
// DZS Core Kernel — Energy Bus（统一能量总线）
// 
// 这是整个系统的核心中枢。
// 所有能量（八字/九宫/节气/空间/行为）统一进入此总线。
// 后续的AI决策层、改命引擎全部从此读取最终能量态。
// 
// 架构：
// 八字能量 ─┐
// 空间能量 ─┼──→ Energy Bus ──→ AI决策层
// 飞星能量 ─┤                   └→ 改命方案
// 时间能量 ─┘
// ============================================================

import { Injectable } from '@nestjs/common';

/** 能量来源类型 */
export type EnergySource = 'bazi' | 'jiugong' | 'spatial' | 'temporal' | 'behavior' | 'ritual';

/** 能量修饰器（表示能量变化的原因） */
export interface EnergyModifier {
  /** 来源类型 */
  source: EnergySource;
  /** 修饰名称（如"月令加倍"、"五黄入中"） */
  name: string;
  /** 影响的五行 */
  element: string;
  /** 变化值 */
  delta: number;
  /** 持续时间（分钟，0=永久作用于当前状态） */
  duration: number;
  /** 文献引用 */
  sourceRef: string;
}

/** 能量状态快照 */
export interface EnergyState {
  /** 时间戳 */
  timestamp: string;
  /** 当前来源 */
  source: string;
  /** 五行动态能量值 */
  energies: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  /** 能量修饰器列表 */
  modifiers: EnergyModifier[];
  /** 风险等级 0-100 */
  riskLevel: number;
  /** 稳定性 0-100（越高越稳定） */
  stability: number;
  /** 主导五行 */
  dominantElement: string;
  /** 最弱五行 */
  weakestElement: string;
}

/** 能量融合配置 */
export interface EnergyFusionConfig {
  /** 八字能量权重 */
  baziWeight: number;
  /** 九宫飞星权重 */
  jiugongWeight: number;
  /** 空间布局权重 */
  spatialWeight: number;
  /** 时间能量权重 */
  temporalWeight: number;
  /** 行为能量权重 */
  behaviorWeight: number;
}

/** 默认融合权重 */
const DEFAULT_FUSION_CONFIG: EnergyFusionConfig = {
  baziWeight: 0.40,      // 八字是根本，权重最高
  jiugongWeight: 0.25,    // 九宫飞星是时空能量
  spatialWeight: 0.15,    // 空间布局影响
  temporalWeight: 0.10,   // 时间因素
  behaviorWeight: 0.10,   // 行为能量
};

@Injectable()
export class EnergyBus {
  private fusionConfig = DEFAULT_FUSION_CONFIG;
  private modifierHistory: EnergyModifier[] = [];

  /**
   * 配置融合权重
   */
  configure(config: Partial<EnergyFusionConfig>): void {
    this.fusionConfig = { ...this.fusionConfig, ...config };
  }

  /**
   * 核心方法：注入能量
   * 任何模块都可以通过此方法向总线注入能量
   */
  inject(source: EnergySource, energies: Partial<EnergyState['energies']>, modifier?: Omit<EnergyModifier, 'source'>): void {
    const fullModifier: EnergyModifier = {
      source,
      ...modifier,
      element: modifier?.element || '',
      delta: modifier?.delta || 0,
      duration: modifier?.duration || 0,
      sourceRef: modifier?.sourceRef || '',
    };
    this.modifierHistory.push(fullModifier);
  }

  /**
   * 计算最终能量态
   * 融合所有注入的能量，按权重计算最终值
   */
  calculateFinalState(context: {
    /** 八字五行分数 */
    baziScores?: Partial<EnergyState['energies']>;
    /** 九宫能量（按来源方向映射后的五行能量） */
    jiugongScores?: Partial<EnergyState['energies']>;
    /** 空间布局能量 */
    spatialScores?: Partial<EnergyState['energies']>;
    /** 时间能量（季节/节气） */
    temporalScores?: Partial<EnergyState['energies']>;
    /** 行为能量（仪式/动作） */
    behaviorScores?: Partial<EnergyState['energies']>;
  }): EnergyState {
    const allElements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
    const timestamp = new Date().toISOString();

    // 收集所有注入的修饰器总和
    const modifierTotals: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    for (const mod of this.modifierHistory) {
      const el = mod.element.toLowerCase();
      if (el in modifierTotals) {
        modifierTotals[el] += mod.delta;
      }
    }

    // 各来源的能量值（空值默认为0）
    const getScores = (s: any): Record<string, number> => ({
      wood: s?.wood || 0,
      fire: s?.fire || 0,
      earth: s?.earth || 0,
      metal: s?.metal || 0,
      water: s?.water || 0,
    });

    const bazi = getScores(context.baziScores);
    const jiugong = getScores(context.jiugongScores);
    const spatial = getScores(context.spatialScores);
    const temporal = getScores(context.temporalScores);
    const behavior = getScores(context.behaviorScores);

    // 融合计算
    const finalEnergies: Record<string, number> = {};
    for (const el of allElements) {
      finalEnergies[el] = Math.round(
        bazi[el] * this.fusionConfig.baziWeight +
        jiugong[el] * this.fusionConfig.jiugongWeight +
        spatial[el] * this.fusionConfig.spatialWeight +
        temporal[el] * this.fusionConfig.temporalWeight +
        behavior[el] * this.fusionConfig.behaviorWeight +
        modifierTotals[el]
      );
    }

    // 找出主导/最弱五行
    let dominant = 'earth';
    let weakest = 'earth';
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (const el of allElements) {
      if (finalEnergies[el] > maxVal) { maxVal = finalEnergies[el]; dominant = el; }
      if (finalEnergies[el] < minVal) { minVal = finalEnergies[el]; weakest = el; }
    }

    // 风险等级：基于能量极值差
    const range = maxVal - minVal;
    const riskLevel = Math.min(100, Math.round(range / 2));

    // 稳定性：基于能量分布的均匀度
    const avg = Object.values(finalEnergies).reduce((a, b) => a + b, 0) / 5;
    const variance = Object.values(finalEnergies).reduce((sum, v) => sum + (v - avg) ** 2, 0) / 5;
    const stability = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(variance))));

    return {
      timestamp,
      source: 'energy-bus',
      energies: {
        wood: finalEnergies.wood,
        fire: finalEnergies.fire,
        earth: finalEnergies.earth,
        metal: finalEnergies.metal,
        water: finalEnergies.water,
      },
      modifiers: [...this.modifierHistory],
      riskLevel,
      stability,
      dominantElement: dominant,
      weakestElement: weakest,
    };
  }

  /**
   * 重置总线状态
   */
  reset(): void {
    this.modifierHistory = [];
  }

  /**
   * 获取当前所有修饰器（用于因果链回溯）
   */
  getModifiers(): EnergyModifier[] {
    return [...this.modifierHistory];
  }
}
