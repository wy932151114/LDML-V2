// ============================================================
// DZS Core Kernel — Causal Chain Engine（因果链引擎）
// 
// 这是AI可解释性的核心。
// 每一个建议都附带完整的因果追溯链。
// AI层不应当凭空输出建议，而应当基于CausalChain生成。
// ============================================================

import { Injectable } from '@nestjs/common';

/** 触发器类型 */
export type TriggerType = 
  | 'spatial'      // 空间布局（镜子/床位/门）
  | 'bazi'         // 八字命理（五行失衡/用神缺失）
  | 'jiugong'      // 九宫飞星（五黄/三煞/凶星）
  | 'temporal'     // 时间因素（节气/时辰）
  | 'behavior'     // 行为（仪式/动作）
  | 'compound';    // 复合（多个因素共同作用）

/** 因果链节点 */
export interface CausalChain {
  /** 唯一标识 */
  id: string;
  /** 触发器名称 */
  trigger: string;
  /** 触发器类型 */
  triggerType: TriggerType;
  /** 能量偏移描述（如"水增强+1.2"） */
  energyShift: string;
  /** 受影响的宫位 */
  affectedPalace: string;
  /** 受影响的五行 */
  affectedElement: string;
  /** 预期效果 */
  expectedEffect: string;
  /** 见效时间 */
  timeToEffect: string;
  /** 严重程度 */
  severity: '轻微' | '中等' | '严重' | '危急';
  /** 文献引用 */
  source: string;
  /** 关联的EnergyBus修饰器 */
  relatedModifier?: string;
  /** 化解建议 */
  remedy?: string;
}

/** 因果链追踪记录 */
export interface CausalTrace {
  /** 时间戳 */
  timestamp: string;
  /** 触发的事件 */
  event: string;
  /** 生成的因果链 */
  chains: CausalChain[];
  /** 总风险评分 */
  totalRiskScore: number;
  /** 优先级排序后的建议 */
  priorities: string[];
}

@Injectable()
export class CausalChainEngine {
  private chainHistory: CausalTrace[] = [];

  /**
   * 分析空间/命理因素的因果链
   */
  analyze(
    trigger: string,
    triggerType: TriggerType,
    context: {
      /** 当前能量状态 */
      energies?: Record<string, number>;
      /** 九宫布局 */
      palaces?: Array<{ name: string; direction: string; star: any; energy: number }>;
      /** 空间布局 */
      spatialElements?: Array<{ type: string; position: string; wuxing: string }>;
      /** 月令 */
      monthBranch?: string;
      /** 用神 */
      yongShen?: string[];
    },
  ): CausalChain[] {
    const chains: CausalChain[] = [];

    // 1. 空间冲突检测
    if (context.spatialElements) {
      for (const el of context.spatialElements) {
        chains.push({
          id: `causal-${Date.now()}-${chains.length}`,
          trigger: `${el.type}位于${el.position}方`,
          triggerType: 'spatial',
          energyShift: `${el.wuxing}能量+0.8`,
          affectedPalace: this.positionToPalace(el.position),
          affectedElement: el.wuxing,
          expectedEffect: this.getEffectByElement(el.wuxing, el.type),
          timeToEffect: '7-14天',
          severity: '中等',
          source: '《改命纪实录》卷六§5.3',
          remedy: this.getRemedy(el.type, el.wuxing),
        });
      }
    }

    // 2. 五行失衡检测
    if (context.energies && context.yongShen) {
      const total = Object.values(context.energies).reduce((a, b) => a + b, 0);
      if (total > 0) {
        for (const [el, score] of Object.entries(context.energies)) {
          const pct = (score / total) * 100;
          if (pct > 35) {
            chains.push({
              id: `causal-${Date.now()}-${chains.length}`,
              trigger: `${this.enToCn(el)}能量过旺（${Math.round(pct)}%）`,
              triggerType: 'bazi',
              energyShift: `${this.enToCn(el)}+${(pct / 20).toFixed(1)}`,
              affectedPalace: this.elementToPalace(el),
              affectedElement: this.enToCn(el),
              expectedEffect: this.getExcessEffect(el),
              timeToEffect: '持续影响',
              severity: pct > 50 ? '严重' : '中等',
              source: '《改命纪实录》卷三§2.1',
              remedy: `宜补${context.yongShen.join('/')}`,
            });
          }
          if (pct < 8 && pct > 0) {
            chains.push({
              id: `causal-${Date.now()}-${chains.length}`,
              trigger: `${this.enToCn(el)}能量严重不足（${Math.round(pct)}%）`,
              triggerType: 'bazi',
              energyShift: `${this.enToCn(el)}-${(1 / (pct || 1)).toFixed(1)}`,
              affectedPalace: this.elementToPalace(el),
              affectedElement: this.enToCn(el),
              expectedEffect: this.getDeficitEffect(el),
              timeToEffect: '持续影响',
              severity: pct < 5 ? '严重' : '中等',
              source: '《改命纪实录》卷三§2.1',
              remedy: `宜补${this.enToCn(el)}元素`,
            });
          }
        }
      }
    }

    // 3. 九宫凶星检测
    if (context.palaces) {
      for (const p of context.palaces) {
        if (p.star?.type === '大凶' || p.star?.type === '凶') {
          chains.push({
            id: `causal-${Date.now()}-${chains.length}`,
            trigger: `${p.name}宫（${p.direction}方）有${p.star.name}凶星入宫`,
            triggerType: 'jiugong',
            energyShift: `本宫能量-${Math.round(p.energy * 0.5)}%`,
            affectedPalace: p.name,
            affectedElement: '受克',
            expectedEffect: this.getStarEffect(p.star.name),
            timeToEffect: '流月期间',
            severity: '中等',
            source: '《改命纪实录》卷四§2.3',
            remedy: this.getStarRemedy(p.star.name, p.direction),
          });
        }
      }
    }

    return chains;
  }

  // ========== 私有方法 ==========

  private positionToPalace(pos: string): string {
    const map: Record<string, string> = {
      '北': '坎', '西南': '坤', '东': '震', '东南': '巽',
      '中': '中', '西北': '乾', '西': '兑', '东北': '艮', '南': '离',
    };
    return map[pos] || pos;
  }

  private elementToPalace(el: string): string {
    const map: Record<string, string> = {
      '木': '震', '火': '离', '土': '中', '金': '兑',
      'wood': '震', 'fire': '离', 'earth': '中', 'metal': '兑',
      '水': '坎', 'water': '坎',
    };
    return map[el] || '中';
  }

  private enToCn(el: string): string {
    const map: Record<string, string> = { 'wood': '木', 'fire': '火', 'earth': '土', 'metal': '金', 'water': '水' };
    return map[el] || el;
  }

  private getEffectByElement(el: string, type: string): string {
    const effects: Record<string, Record<string, string>> = {
      '镜子': { '水': '睡眠不稳、偏财波动', '火': '情绪焦躁', '金': '是非口舌', '木': '人际关系紧张', '土': '思维混乱' },
      '床位': { '水': '睡眠质量下降', '火': '心火旺盛', '金': '筋骨不适', '木': '肝胆失调', '土': '脾胃不和' },
    };
    return effects[type]?.[el] || '能量场受影响';
  }

  private getExcessEffect(el: string): string {
    const map: Record<string, string> = {
      '木': '肝胆过旺、决策冲动', '火': '心火亢盛、失眠烦躁', '土': '思虑过重、消化阻滞',
      '金': '肺气过旺、决断偏执', '水': '阴寒过盛、肾气泛滥',
    };
    return map[el] || '能量失衡';
  }

  private getDeficitEffect(el: string): string {
    const map: Record<string, string> = {
      '木': '肝胆不足、缺乏行动力', '火': '心气不足、畏缩犹豫', '土': '脾胃虚弱、缺乏安全感',
      '金': '肺气不足、决断力弱', '水': '肾气不足、精力不济',
    };
    return map[el] || '能量不足';
  }

  private getStarEffect(starName: string): string {
    const map: Record<string, string> = {
      '破军': '破财、失盗、小人', '廉贞': '官非、是非、意外', '禄存': '口舌、争吵、冲动',
    };
    return map[starName] || '凶星影响';
  }

  private getStarRemedy(starName: string, direction: string): string {
    const remedies: Record<string, string> = {
      '破军': '宜在此方放铜质物品化解',
      '廉贞': '宜在此方保持安静，不动土',
      '禄存': '宜在此方以红色物品化解',
    };
    return remedies[starName] || '宜避之';
  }

  private getRemedy(type: string, wuxing: string): string {
    const remedy: Record<string, string> = {
      '镜子': `${wuxing === '水' ? '调整镜子角度或遮挡' : '移开镜子至其他方位'}`,
      '床位': `${wuxing === '火' ? '调整床头方向' : '更换床品颜色'}`,
    };
    return remedy[type] || '调整空间布局';
  }
}
