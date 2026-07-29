// ============================================================
// 道之自然验证中台 — 经度验证器
// ============================================================

import { DaoZhiGuangRules } from '../../protocols/rules.protocol';
import { createDaoError, DaoErrorCode, emptyValidationResult } from '../../protocols/errors.protocol';
import type { DaoError, ValidationResult } from '../../protocols/errors.protocol';
import type { DomainValidator, ValidationContext } from '../../protocols/validation.protocol';

export class LongitudeValidator implements DomainValidator<number> {
  readonly name = 'LongitudeValidator';
  readonly domain = 'longitude';

  getVersion(): string {
    return '2.3';
  }

  validate(longitude: number | undefined, context?: ValidationContext): ValidationResult {
    const result = emptyValidationResult();
    const errors: DaoError[] = [];
    const warnings: DaoError[] = [];
    const passed: string[] = [];
    const rules = DaoZhiGuangRules.longitude;

    if (longitude === undefined || longitude === null) {
      errors.push(createDaoError(
        DaoErrorCode.LONGITUDE_NOT_PROVIDED,
        '未提供经度，无法进行真太阳时修正',
        rules.source,
        'warning',
        '请提供出生地经度以启用真太阳时修正',
        'longitude',
      ));
      result.valid = false;
      result.errors = errors;
      return result;
    }

    if (longitude < rules.min || longitude > rules.max) {
      errors.push(createDaoError(
        DaoErrorCode.LONGITUDE_OUT_OF_RANGE,
        `经度 ${longitude}° 超出中国境内范围（${rules.min}°E-${rules.max}°E）`,
        rules.source,
        'fatal',
        `请输入中国境内经度（${rules.min}°E-${rules.max}°E）`,
        'longitude',
        longitude,
        `${rules.min}°E-${rules.max}°E`,
      ));
      result.valid = false;
    } else {
      passed.push('经度在中国境内范围内');
    }

    // 建议使用真太阳时的经度差判断
    const diffFromBeijing = Math.abs(longitude - rules.beijingStandard);
    if (diffFromBeijing > 3) {
      warnings.push(createDaoError(
        'SOLAR_CORRECTION_SUGGESTED' as any,
        `经度距东八区标准 ${diffFromBeijing.toFixed(1)}°，建议启用真太阳时修正`,
        rules.source,
        'warning',
        `修正后时间偏差约 ${Math.round(diffFromBeijing * 4)} 分钟`,
        'longitude',
        longitude,
        `差异 > 3°`,
      ));
    } else {
      passed.push('经度接近东八区标准，真太阳时影响较小');
    }

    result.errors = errors;
    result.warnings = warnings;
    result.passedChecks = passed;
    return result;
  }
}
