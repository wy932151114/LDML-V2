// ============================================================
// 道之自然验证中台 — 太阳时验证器
// ============================================================

import { DaoZhiGuangRules } from '../../protocols/rules.protocol';
import { createDaoError, DaoErrorCode, emptyValidationResult } from '../../protocols/errors.protocol';
import type { DaoError, ValidationResult } from '../../protocols/errors.protocol';
import type { DomainValidator, ValidationContext } from '../../protocols/validation.protocol';

export class SolarTimeValidator implements DomainValidator<{
  hour: number;
  minute: number;
  longitude?: number;
}> {
  readonly name = 'SolarTimeValidator';
  readonly domain = 'solarTime';

  getVersion(): string {
    return '2.3';
  }

  validate(input: { hour: number; minute: number; longitude?: number }, _context?: ValidationContext): ValidationResult {
    const result = emptyValidationResult();
    const errors: DaoError[] = [];
    const warnings: DaoError[] = [];
    const passed: string[] = [];

    // 检查时辰合法性
    if (input.hour < 0 || input.hour > 23) {
      errors.push(createDaoError(
        DaoErrorCode.BIRTH_HOUR_INVALID,
        `时辰 ${input.hour} 无效（有效范围0-23）`,
        '《改命纪实录》卷一§2.1',
        'fatal',
        '请输入0-23之间的时辰',
        'hour',
        input.hour,
        '0-23',
      ));
    } else {
      passed.push(`时辰 ${input.hour} 时在有效范围`);
    }

    if (input.minute < 0 || input.minute > 59) {
      errors.push(createDaoError(
        DaoErrorCode.BIRTH_DATE_INVALID,
        `分钟 ${input.minute} 无效（有效范围0-59）`,
        '《改命纪实录》卷一§2.1',
        'fatal',
        '请输入0-59之间的分钟',
        'minute',
        input.minute,
        '0-59',
      ));
    } else {
      passed.push(`分钟在有效范围`);
    }

    // 子时跨日提醒
    if (input.hour >= 23 || input.hour < 1) {
      warnings.push(createDaoError(
        'ZI_HOUR_CROSS_DAY' as any,
        `出生在${input.hour >= 23 ? '晚' : ''}子时（23:00-1:00），日柱可能受跨日影响`,
        '《改命纪实录》卷一§2.1',
        'warning',
        '子时出生请确认是否已自动处理跨日',
        'hour',
        input.hour,
        '23:00-1:00',
      ));
    } else {
      passed.push('时辰不在子时跨日范围');
    }

    // 经度检查
    if (input.longitude !== undefined) {
      const diff = Math.abs(input.longitude - 120);
      const offsetMinutes = Math.round(diff * 4);
      if (offsetMinutes > 60) {
        warnings.push(createDaoError(
          DaoErrorCode.SOLAR_OFFSET_EXCEEDS_LIMIT,
          `经度 ${input.longitude}° 导致真太阳时修正约 ${offsetMinutes} 分钟`,
          '《改命纪实录》卷一§3.2',
          'warning',
          `修正后可能导致时柱变化，建议启用真太阳时`,
          'longitude',
          input.longitude,
          `偏移 < ${60 / 4}°`,
        ));
      } else {
        passed.push('经度修正在合理范围内');
      }
    }

    result.errors = errors;
    result.warnings = warnings;
    result.passedChecks = passed;
    return result;
  }
}
