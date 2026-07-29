// ============================================================
// 道之自然验证中台 — 仪式验证器
// ============================================================

import { createDaoError, DaoErrorCode, emptyValidationResult } from '../../protocols/errors.protocol';
import type { DaoError, ValidationResult } from '../../protocols/errors.protocol';
import type { DomainValidator, ValidationContext } from '../../protocols/validation.protocol';

/** 吉时范围 */
const AUSPICIOUS_HOURS = [7, 9, 11, 13, 15, 17]; // 辰/巳/午/未/申/酉
const IN_AUSPICIOUS_HOURS = [23, 1, 3, 5, 19, 21]; // 子/丑/寅/卯/戌/亥

export class RitualValidator implements DomainValidator<{
  hour?: number;
  direction?: string;
  baziElement?: string;
}> {
  readonly name = 'RitualValidator';
  readonly domain = 'ritual';

  getVersion(): string {
    return '2.3';
  }

  validate(input: { hour?: number; direction?: string; baziElement?: string }, _context?: ValidationContext): ValidationResult {
    const result = emptyValidationResult();
    const errors: DaoError[] = [];
    const warnings: DaoError[] = [];
    const passed: string[] = [];

    // 时辰检查
    if (input.hour !== undefined) {
      const isAuspicious = AUSPICIOUS_HOURS.some(h => Math.abs(input.hour! - h) <= 1);
      if (isAuspicious) {
        passed.push(`时辰 ${input.hour}时 在吉时范围内`);
      } else {
        warnings.push(createDaoError(
          DaoErrorCode.RITUAL_TIME_INVALID,
          `时辰 ${input.hour}时 不在推荐吉时范围（辰/巳/午/未/申/酉时）`,
          '《改命纪实录》卷五§2.1',
          'warning',
          '建议选择辰（7-9）、巳（9-11）、午（11-13）、未（13-15）、申（15-17）时',
          'hour',
          input.hour,
          '辰/巳/午/未/申时',
        ));
      }
    }

    // 方位检查
    if (input.direction) {
      const validDirections = ['东', '南', '西', '北', '东南', '西南', '东北', '西北'];
      if (validDirections.includes(input.direction)) {
        passed.push(`方位 ${input.direction} 有效`);
      } else {
        warnings.push(createDaoError(
          DaoErrorCode.RITUAL_DIRECTION_CONFLICT,
          `方位 ${input.direction} 不在标准八方中`,
          '《改命纪实录》卷五§3.1',
          'warning',
          '请使用东/南/西/北/东南/西南/东北/西北',
          'direction',
          input.direction,
        ));
      }
    }

    result.errors = errors;
    result.warnings = warnings;
    result.passedChecks = passed;
    return result;
  }
}
