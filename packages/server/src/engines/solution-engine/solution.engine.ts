// ============================================================
// 道之自然·命理规则引擎 — 改命策略引擎
// 核心职责：根据五行分析+九宫飞星+大运流年，生成可执行的改命方案
// 这是整个系统"改命"而非"算命"的体现
// ============================================================

import { Injectable } from '@nestjs/common';

export interface RemedialSuggestion {
  type: '方位调整' | '时间选择' | '物品摆放' | '颜色搭配' | '职业方向' | '人际策略' | '修行方法' | '饮食调理' | '居住调整';
  title: string;
  description: string;
  action: string;
  bestTime?: string;
  bestDirection?: string;
  items?: string[];
  effectCycle: '即时' | '3天' | '7天' | '15天' | '1个月' | '3个月' | '半年' | '1年';
  priority: 1 | 2 | 3 | 4 | 5;
  principle: string;
}

export interface SolutionInput {
  bodyStrength: '身强' | '身弱' | '中和';
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  missing: string[];
  excess: string[];
  dayMasterWx: string;
  balanceState: string;
  // 九宫飞星
  bestDirection?: string;
  worstDirection?: string;
  bestStarName?: string;
  // 大运
  currentDayunGanZhi?: string;
  // 流年
  currentLiuNianGanZhi?: string;
  liuNianLuck?: string;
}

@Injectable()
export class SolutionEngine {
  /**
   * 生成改命策略
   * 规则驱动的策略生成，不做空泛建议
   */
  generate(input: SolutionInput): {
    strategies: RemedialSuggestion[];
    daily: RemedialSuggestion;
    tips: string[];
  } {
    const strategies: RemedialSuggestion[] = [];
    const tips: string[] = [];

    // 1. 用神补益策略（最高优先级）
    const yongShenStrategy = this.buildYongShenStrategy(input);
    if (yongShenStrategy) strategies.push(yongShenStrategy);

    // 2. 缺失五行补益
    for (const missing of input.missing) {
      strategies.push(this.buildMissingElementStrategy(missing, input));
    }

    // 3. 方位策略（结合九宫）
    if (input.bestDirection) {
      strategies.push(this.buildDirectionStrategy(input));
    }

    // 4. 居住/环境调整
    const envStrategy = this.buildEnvironmentStrategy(input);
    if (envStrategy) strategies.push(envStrategy);

    // 5. 五行过旺的泄耗策略
    if (input.excess.length > 0) {
      strategies.push(this.buildExcessStrategy(input));
    }

    // 6. 根据大运/流年的特别建议
    const yearStrategy = this.buildYearStrategy(input);
    if (yearStrategy) strategies.push(yearStrategy);

    // 今日可执行的小行动
    const daily = this.buildDailyAction(input);

    // 通用提示
    tips.push(...this.getGeneralTips(input));

    // 按优先级排序
    strategies.sort((a, b) => a.priority - b.priority);

    return {
      strategies: strategies.slice(0, 5), // 最多5条
      daily,
      tips: tips.slice(0, 3),
    };
  }

  /** 用神补益策略 */
  private buildYongShenStrategy(input: SolutionInput): RemedialSuggestion | null {
    if (input.yongShen.length === 0) return null;

    const yongShenStr = input.yongShen.join('、');
    const isWeak = input.bodyStrength === '身弱';

    return {
      type: isWeak ? '修行方法' : '居住调整',
      title: isWeak ? `补益【${yongShenStr}】扶身` : `疏通【${yongShenStr}】泄旺`,
      description: isWeak
        ? `身弱需补，以${yongShenStr}为用神，日常多接触对应元素`
        : `身强需泄，以${yongShenStr}为用神，平衡能量`,
      action: isWeak
        ? `增加${yongShenStr}五行元素在生活和工作环境中的比例：${this.getRemedyAction(input.yongShen[0])}`
        : `减少${input.dayMasterWx}的堆积，增加${yongShenStr}的疏导：${this.getRemedyAction(input.yongShen[0])}`,
      bestTime: this.getBestTimeForElement(input.yongShen[0]),
      bestDirection: this.getDirectionForElement(input.yongShen[0]),
      items: this.getItemsForElement(input.yongShen[0]),
      effectCycle: '15天',
      priority: 1,
      principle: isWeak
        ? `命主身弱，如树苗需土培、需水浇。${yongShenStr}为用神，可补日主不足，使五行趋向平衡。道之自然曰：弱的不是命，是势。势可以借，可以补。`
        : `命主身强，如烈火需木疏、需水济。${yongShenStr}为用神，可泄旺气，使五行流通。道之自然曰：强不是问题，堵才是问题。通了，运就转了。`,
    };
  }

  /** 缺失五行补益 */
  private buildMissingElementStrategy(missing: string, input: SolutionInput): RemedialSuggestion {
    const actionMap: Record<string, string> = {
      '木': '在办公桌/床头摆放绿植（富贵竹、绿萝），穿绿色衣物，朝东方工作',
      '火': '增加红色/紫色元素，使用台灯加强照明，朝南方办公',
      '土': '使用陶瓷/玉石摆件，增加黄色系装饰，多到公园/山上活动',
      '金': '佩戴金属饰品（银饰、金饰），使用白色/金色装饰，朝西方办公',
      '水': '在空间放置水景/鱼缸，穿黑色/蓝色衣物，朝北方活动',
    };

    return {
      type: '物品摆放',
      title: `补【${missing}】元素`,
      description: `命局中${missing}元素较弱，需主动补充`,
      action: actionMap[missing] || `增加${missing}相关元素`,
      bestTime: this.getBestTimeForElement(missing),
      bestDirection: this.getDirectionForElement(missing),
      items: this.getItemsForElement(missing),
      effectCycle: '1个月',
      priority: 2,
      principle: `天地之间，五行流转。缺则补，偏则调。${missing}虽未显于命局，却可以通过后天环境补益。道之自然曰：命有缺，不是坏事——正是这份缺失，给了你主动改变的空间。`,
    };
  }

  /** 方位策略（结合九宫） */
  private buildDirectionStrategy(input: SolutionInput): RemedialSuggestion {
    const yongShenDir = this.getDirectionForElement(input.yongShen[0] || '土');
    const primaryDir = input.bestDirection || yongShenDir;

    return {
      type: '方位调整',
      title: `坐向宜【${primaryDir}】`,
      description: `今日/近期吉方在${primaryDir}，办公和居住宜朝向此方位`,
      action: `办公桌/床位朝向${primaryDir}方，重要会议和决策在此方位进行。每日在${primaryDir}方位静坐5-10分钟`,
      bestDirection: primaryDir,
      effectCycle: '即时',
      priority: 3,
      principle: `方位之气，与天命相呼应。${input.bestDirection ? '九宫飞星显示' : '用神所需'}${primaryDir}方能量最强。道之自然曰：坐在对的方向，做事就顺了一半。不是玄，是势。`,
    };
  }

  /** 五行过旺泄耗策略 */
  private buildExcessStrategy(input: SolutionInput): RemedialSuggestion {
    const excess = input.excess[0];
    return {
      type: '饮食调理',
      title: `疏泄【${excess}】旺气`,
      description: `${excess}元素过旺，需泄耗平衡`,
      action: this.getExcessAction(excess),
      items: this.getExcessItems(excess),
      effectCycle: '1个月',
      priority: 3,
      principle: `过犹不及。${excess}旺不是不好，但要流通。好比水满则溢，需开渠疏导。道之自然曰：旺气不是用来堵的，是用来用的。找到疏泄的方向，旺就变成了势。`,
    };
  }

  /** 居住/环境调整策略 */
  private buildEnvironmentStrategy(input: SolutionInput): RemedialSuggestion | null {
    if (input.missing.length === 0 && input.excess.length === 0) return null;

    return {
      type: '居住调整',
      title: '居家五行调衡',
      description: '根据命局五行调整居住环境',
      action: this.getHouseAdjustment(input),
      effectCycle: '3个月',
      priority: 4,
      principle: '家宅是人在世间最大的能量场。五行平衡的家居环境，能让居住者自然而然地趋吉避凶。道之自然曰：改命，从改家开始。',
    };
  }

  /** 年份运势策略 */
  private buildYearStrategy(input: SolutionInput): RemedialSuggestion | null {
    if (!input.liuNianLuck) return null;

    const isBadLuck = input.liuNianLuck === '凶' || input.liuNianLuck === '大凶';
    const isGoodLuck = input.liuNianLuck === '吉' || input.liuNianLuck === '大吉';

    if (!isBadLuck && !isGoodLuck) return null;

    return {
      type: '时间选择',
      title: isBadLuck ? '流年趋吉避凶' : '流年顺势而为',
      description: isBadLuck
        ? `${input.currentLiuNianGanZhi}年运势偏弱，建议稳守为主`
        : `${input.currentLiuNianGanZhi}年运势向好，建议主动把握`,
      action: isBadLuck
        ? `本年度以稳为主：不宜大额投资、不宜换工作、不宜重大决策。多在内修上下功夫，少在外部争锋。`
        : `本年度运势较佳：适合推进重要项目、拓展人脉、学习新技能、考虑投资。顺势而为，事半功倍。`,
      effectCycle: '1年',
      priority: isBadLuck ? 2 : 3,
      principle: isBadLuck
        ? '流年不利，非天命难违，而是时机未到。退一步不是认输，是蓄力。道之自然曰：所谓凶年，不过是老天让你歇一歇，把旧账还完。'
        : '流年大吉，天地能量与命局相合。此时顺势而为，往往事半功倍。道之自然曰：好运来了，不是躺着等，是要跑起来接。',
    };
  }

  /** 今日小行动（每天一条可执行的小事） */
  private buildDailyAction(input: SolutionInput): RemedialSuggestion {
    const yongShen = input.yongShen[0] || '土';
    return {
      type: '修行方法',
      title: '今日改命小行动',
      description: '每天做一件小事，累积改变命运的力量',
      action: this.getDailyAction(yongShen),
      bestTime: '早上7-9点（辰时）',
      bestDirection: this.getDirectionForElement(yongShen),
      items: this.getItemsForElement(yongShen),
      effectCycle: '即时',
      priority: 1,
      principle: '千里之行，始于足下。命运的改变不是靠一次大动作，而是靠每天的一小步。道之自然曰：改命不难，难在每天改一点点。',
    };
  }

  /** 通用提示 */
  private getGeneralTips(input: SolutionInput): string[] {
    const tips: string[] = [];

    if (input.bodyStrength === '身弱') {
      tips.push('身弱之人，先做减法。少社交、少内耗、多休息，能量攒够了再做事。');
    }
    if (input.balanceState === '过旺' || input.balanceState === '偏旺') {
      tips.push('偏旺之人，要学会"散"。把多余的能量转化为创作、运动、助人，而不是憋着内耗。');
    }
    if (input.missing.includes('水')) {
      tips.push('缺水的人，每天喝足八杯水不是养生，是改命。');
    }
    if (input.missing.includes('木')) {
      tips.push('缺木的人，多去公园走走，亲近绿色植物。每周至少一次。');
    }

    tips.push('记住：命理是地图，不是判决书。路要自己走，方向已经给你了。');

    return tips;
  }

  // ============================================================
  // 辅助映射表
  // ============================================================

  private getDirectionForElement(element: string): string {
    const map: Record<string, string> = { '木': '东', '火': '南', '土': '中', '金': '西', '水': '北' };
    return map[element] || '中';
  }

  private getBestTimeForElement(element: string): string {
    const map: Record<string, string> = {
      '木': '寅时/卯时（3-7点）',
      '火': '巳时/午时（9-13点）',
      '土': '辰时/戌时/丑时/未时',
      '金': '申时/酉时（15-19点）',
      '水': '亥时/子时（21-1点）',
    };
    return map[element] || '辰时（7-9点）';
  }

  private getItemsForElement(element: string): string[] {
    const map: Record<string, string[]> = {
      '木': ['绿植（富贵竹/绿萝）', '木质手串', '绿色衣物'],
      '火': ['红色饰品', '台灯/蜡烛', '红色衣物'],
      '土': ['陶瓷摆件', '黄水晶', '玉石'],
      '金': ['银饰', '铜钱/五帝钱', '白色衣物'],
      '水': ['黑曜石', '小水景/鱼缸', '黑色衣物'],
    };
    return map[element] || [];
  }

  private getRemedyAction(element: string): string {
    const map: Record<string, string> = {
      '木': '摆放绿植于东方，办公桌面朝东',
      '火': '增加红色元素于南方，多晒太阳',
      '土': '使用陶瓷饰品，多接触大地（赤脚走路、园艺）',
      '金': '佩戴金属饰品，白色着装',
      '水': '放置水景于北方，穿戴黑色/蓝色',
    };
    return map[element] || '与环境中的五行元素互动';
  }

  private getExcessAction(element: string): string {
    const map: Record<string, string> = {
      '木': '减少绿色/植物，增加金元素（金属饰品）来克制，增加火元素来泄耗',
      '火': '减少红色/高温，增加水元素来克制，增加土元素来泄耗',
      '土': '减少黄色/陶瓷，增加木元素来克制，增加金元素来泄耗',
      '金': '减少白色/金属，增加火元素来克制，增加水元素来泄耗',
      '水': '减少黑色/蓝色，增加土元素来克制，增加木元素来泄耗',
    };
    return map[element] || '通过相克相泄的五行来平衡';
  }

  private getExcessItems(element: string): string[] {
    const map: Record<string, string[]> = {
      '木': ['金属饰品', '红色蜡烛'],
      '火': ['黑色水杯', '鱼缸'],
      '土': ['绿植', '金属摆件'],
      '金': ['红色饰品', '蜡烛'],
      '水': ['陶瓷摆件', '黄水晶'],
    };
    return map[element] || [];
  }

  private getDailyAction(element: string): string {
    const map: Record<string, string> = {
      '木': '今天去附近公园散步15分钟，触摸一棵树的树皮，感受它的生命力。',
      '火': '今天特意晒10分钟太阳（或开一盏暖光灯），闭眼深呼吸。',
      '土': '今天赤脚站在土地上/草地上5分钟（或在阳台放一盆栽泥土，用手触摸）。',
      '金': '今天佩戴一件金属饰品（戒指/手链/项链都行），默念"我值得拥有丰盛"。',
      '水': '今天喝一杯温水时，双手捧杯，专注地喝完，感受水的流动。',
    };
    return map[element] || '今天找一个安静角落，静坐5分钟，感受自己的呼吸。';
  }

  private getHouseAdjustment(input: SolutionInput): string {
    const parts: string[] = [];
    if (input.missing.includes('木')) parts.push('东南/东方放绿植');
    if (input.missing.includes('火')) parts.push('南方增加灯光/红色');
    if (input.missing.includes('土')) parts.push('客厅/中心区域放陶瓷');
    if (input.missing.includes('金')) parts.push('西北/西方放金属装饰');
    if (input.missing.includes('水')) parts.push('北方放黑色摆件/水景');
    if (input.excess.length > 0) parts.push(`${input.excess[0]}过旺的区域减少对应元素`);
    return parts.length > 0 ? parts.join('；') : '保持现有布局，重点在用神方位活动';
  }
}
