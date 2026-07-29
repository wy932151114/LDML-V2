// ============================================================
// DZS Core Kernel — AI Safety Layer（AI安全层）
// 
// 所有AI输出必须经过此层：
// 1. 检查AI是否越权计算命理数据
// 2. 验证输出格式是否符合协议
// 3. 拦截幻觉/胡编
// 4. 添加安全前缀
// ============================================================

import { Injectable } from '@nestjs/common';

/** AI输出检查结果 */
export interface AISafetyResult {
  /** 是否通过安全检查 */
  passed: boolean;
  /** 安全评分 0-100 */
  safetyScore: number;
  /** 违规项列表 */
  violations: string[];
  /** 修正后的输出 */
  sanitizedOutput: string;
  /** 安全标记 */
  flags: string[];
}

/** 禁止模式（AI绝对不能做的） */
const FORBIDDEN_PATTERNS = [
  { pattern: /根据[^。]*计算[^。]*八字/i, level: 'high', message: 'AI不可自行计算命理数据' },
  { pattern: /我认为[^。]*五行[^。]*为/i, level: 'high', message: 'AI不可自行判断五行' },
  { pattern: /此命中[^。]*注定/i, level: 'critical', message: '禁止宿命论表述' },
  { pattern: /无法改变/i, level: 'critical', message: '禁止宿命论表述——道之自然原则：命可改' },
  { pattern: /八字[^。]*不好/i, level: 'high', message: '禁止负面命理标签' },
  { pattern: /你[将会|会][^。]*倒[霉|运]/i, level: 'critical', message: '禁止负面预示' },
  { pattern: /祭[祀|拜][^。]*神/i, level: 'medium', message: '避免宗教性表述，使用"祈福"替代' },
  { pattern: /鬼[神|怪]/i, level: 'medium', message: '避免渲染超自然力量' },
  { pattern: /绝对的/i, level: 'medium', message: '避免绝对化表述' },
  { pattern: /100%|百分之百/i, level: 'medium', message: '避免确定性承诺' },
];

@Injectable()
export class AISafetyLayer {
  /**
   * 检查AI输出
   */
  checkOutput(content: string, context?: { dayMaster?: string; yongShen?: string[] }): AISafetyResult {
    const violations: string[] = [];
    const flags: string[] = [];
    let sanitized = content;

    // 1. 模式匹配检查
    for (const f of FORBIDDEN_PATTERNS) {
      if (f.pattern.test(content)) {
        violations.push(`[${f.level}] ${f.message}`);
        if (f.level === 'critical' || f.level === 'high') {
          // 移除违规内容
          sanitized = sanitized.replace(f.pattern, '【已过滤】');
        }
      }
    }

    // 2. 计算安全检查：AI不得输出数字型命理数据
    const calcPattern = /八字[：:]\s*[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g;
    if (calcPattern.test(content)) {
      violations.push('[high] AI输出了完整的八字干支——应引用协议数据而非自行输出');
      flags.push('AI尝试输出原始命理数据');
    }

    // 3. 用神一致性检查
    if (context?.yongShen && context.yongShen.length > 0) {
      for (const ys of context.yongShen) {
        const antiPattern = new RegExp(`忌[^。]*${ys}`, 'i');
        if (antiPattern.test(content)) {
          violations.push(`[high] AI输出与用神${ys}矛盾——用神为喜，不应说"忌"`);
          sanitized = sanitized.replace(antiPattern, '【用神一致性修正】');
        }
      }
    }

    // 4. 改命导向检查
    const fatalismPattern = /没办法|改不了|就这样了|认命吧/i;
    if (fatalismPattern.test(content)) {
      violations.push('[critical] 禁止宿命论——道之自然核心原则：命可改');
      sanitized = sanitized.replace(fatalismPattern, '可调整改善');
      flags.push('宿命论内容被拦截');
    }

    // 安全评分
    const safetyScore = Math.max(0, 100 - violations.length * 15);

    return {
      passed: violations.filter(v => v.startsWith('[critical]')).length === 0,
      safetyScore,
      violations,
      sanitizedOutput: sanitized,
      flags,
    };
  }

  /**
   * 为AI输出添加安全前缀
   */
  addDisclaimer(content: string): string {
    const disclaimer = '\n\n——\n⚖️ 以上内容基于《道之自然·改命纪实录》体系生成，仅供决策参考。命运的根本在于自身的努力与选择。';
    if (content.includes('——')) return content; // 已有免责声明
    return content + disclaimer;
  }

  /**
   * 批量检查
   */
  batchCheck(contents: string[]): AISafetyResult[] {
    return contents.map(c => this.checkOutput(c));
  }
}
