// ============================================================
// 道之自然验证中台 — 风水/九宫验证器
// ============================================================

import { createDaoError, DaoErrorCode, emptyValidationResult } from '../../protocols/errors.protocol';
import type { DaoError, ValidationResult } from '../../protocols/errors.protocol';
import type { DomainValidator, ValidationContext } from '../../protocols/validation.protocol';

export class FengShuiValidator implements DomainValidator<any> {
  readonly name = 'FengShuiValidator';
  readonly domain = 'fengshui';

  getVersion(): string {
    return '2.3';
  }

  validate(layout: any, _context?: ValidationContext): ValidationResult {
    const result = emptyValidationResult();
    const errors: DaoError[] = [];
    const warnings: DaoError[] = [];
    const passed: string[] = [];

    if (!layout) {
      errors.push(createDaoError(
        DaoErrorCode.DIRECTION_NOT_FOUND,
        '九宫飞星数据为空',
        '《改命纪实录》卷四§1.1',
        'error',
        '请先计算九宫飞星',
      ));
      result.valid = false;
      result.errors = errors;
      return result;
    }

    // 检查九宫完整性
    if (layout.palaces && Array.isArray(layout.palaces)) {
      if (layout.palaces.length === 9) {
        passed.push('九宫盘完整（9宫）');
      } else {
        warnings.push(createDaoError(
          'PALACE_COUNT_MISMATCH' as any,
          `九宫盘只有 ${layout.palaces.length} 宫，期望9宫`,
          '《改命纪实录》卷四§1.3',
          'warning',
        ));
      }
    }

    // 检查最佳/最差方位
    if (layout.summary) {
      if (layout.summary.bestDirection) {
        passed.push(`最佳方位：${layout.summary.bestDirection}`);
      }
      if (layout.summary.worstDirection) {
        passed.push(`最差方位：${layout.summary.worstDirection}`);
      }
    }

    // 九星冲突检测
    if (layout.palaces && Array.isArray(layout.palaces)) {
      const starTypes = layout.palaces.map((p: any) => p.type);
      const badStars = starTypes.filter((t: string) => t === '凶' || t === '大凶');
      if (badStars.length >= 3) {
        warnings.push(createDaoError(
          DaoErrorCode.NINE_STAR_OVERLAP,
          `今日有 ${badStars.length} 个凶星方位`,
          '《改命纪实录》卷四§2.3',
          'warning',
          '建议尽量避免这些方位的重要活动',
        ));
      }
    }

    result.errors = errors;
    result.warnings = warnings;
    result.passedChecks = passed;
    return result;
  }
}
