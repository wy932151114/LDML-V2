// ============================================================
// 道之自然验证中台 — 五行验证器
// ============================================================

import { DaoZhiGuangRules } from '../../protocols/rules.protocol';
import { createDaoError, DaoErrorCode, emptyValidationResult } from '../../protocols/errors.protocol';
import type { DaoError, ValidationResult } from '../../protocols/errors.protocol';
import type { DomainValidator, ValidationContext } from '../../protocols/validation.protocol';

export class WuXingValidator implements DomainValidator<any> {
  readonly name = 'WuXingValidator';
  readonly domain = 'wuxing';

  getVersion(): string {
    return '2.3';
  }

  validate(balanceData: any, _context?: ValidationContext): ValidationResult {
    const result = emptyValidationResult();
    const errors: DaoError[] = [];
    const warnings: DaoError[] = [];
    const passed: string[] = [];

    if (!balanceData || !balanceData.scores) {
      errors.push(createDaoError(
        DaoErrorCode.WUXING_SCORE_IMBALANCE,
        '五行评分数据缺失',
        '《改命纪实录》卷三§1.1',
        'error',
        '请重新计算八字排盘',
      ));
      result.valid = false;
      result.errors = errors;
      return result;
    }

    const scores = balanceData.scores;
    const allElements = ['wood', 'fire', 'earth', 'metal', 'water'];
    let allPositive = true;

    for (const el of allElements) {
      if (typeof scores[el] !== 'number' || scores[el] < 0) {
        allPositive = false;
        break;
      }
    }

    if (!allPositive) {
      errors.push(createDaoError(
        DaoErrorCode.WUXING_SCORE_IMBALANCE,
        '五行评分存在负值或无效值',
        '《改命纪实录》卷三§1.1',
        'fatal',
        '请检查八字排盘数据完整性',
      ));
      result.valid = false;
    } else {
      passed.push('五行评分均为正数');
    }

    // 检查是否极度不平衡
    const vals = Object.values(scores) as number[];
    if (vals.length === 5) {
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const total = vals.reduce((a: number, b: number) => a + b, 0);
      const avg = total / 5;

      // 单行过旺检测
      if (max > avg * 2.5) {
        warnings.push(createDaoError(
          DaoErrorCode.WUXING_THRESHOLD_EXCEEDED,
          `五行${findKeyByValue(scores, max)}能量严重过旺（${Math.round(max)}），约为平均的${(max / avg).toFixed(1)}倍`,
          '《改命纪实录》卷三§2.1',
          'warning',
          '建议结合大运流年分析过旺的影响',
        ));
      } else {
        passed.push('五行能量分布合理');
      }

      // 单行过弱检测
      if (min < avg * 0.3) {
        warnings.push(createDaoError(
          DaoErrorCode.WUXING_THRESHOLD_EXCEEDED,
          `五行${findKeyByValue(scores, min)}能量严重不足（${Math.round(min)}），约为平均的${(min / avg).toFixed(1)}倍`,
          '《改命纪实录》卷三§2.1',
          'warning',
          '建议在改命策略中重点补充此五行',
        ));
      } else {
        passed.push('无五行极度不足');
      }

      // 百分比验证
      if (balanceData.percentage) {
        const totalPct: number = (Object.values(balanceData.percentage) as number[]).reduce((a: number, b: number) => a + b, 0);
        if (Math.abs(totalPct - 100) > 2) {
          warnings.push(createDaoError(
            'WUXING_PERCENTAGE_DEVIATION' as any,
            `五行百分比总和为 ${totalPct}%，偏离100%`,
            '《改命纪实录》卷三§1.2',
            'warning',
            '四舍五入导致的正常误差',
          ));
        } else {
          passed.push('百分比总和接近100%');
        }
      }
    }

    result.errors = errors;
    result.warnings = warnings;
    result.passedChecks = passed;
    return result;
  }
}

function findKeyByValue(obj: Record<string, number>, val: number): string {
  for (const [k, v] of Object.entries(obj)) {
    if (v === val) return k;
  }
  return '未知';
}
