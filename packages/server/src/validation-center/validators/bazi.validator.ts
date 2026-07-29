// ============================================================
// 道之自然验证中台 — 八字验证器
// ============================================================

import { createDaoError, DaoErrorCode, emptyValidationResult } from '../../protocols/errors.protocol';
import type { DaoError, ValidationResult } from '../../protocols/errors.protocol';
import type { DomainValidator, ValidationContext } from '../../protocols/validation.protocol';

export class BaziValidator implements DomainValidator<any> {
  readonly name = 'BaziValidator';
  readonly domain = 'bazi';

  getVersion(): string {
    return '2.3';
  }

  validate(baziResult: any, _context?: ValidationContext): ValidationResult {
    const result = emptyValidationResult();
    const errors: DaoError[] = [];
    const warnings: DaoError[] = [];
    const passed: string[] = [];

    if (!baziResult) {
      errors.push(createDaoError(
        DaoErrorCode.FOUR_PILLARS_INCOMPLETE,
        '八字排盘结果为空',
        '《改命纪实录》卷二§1.1',
        'fatal',
        '请先进行八字排盘',
      ));
      result.valid = false;
      result.errors = errors;
      return result;
    }

    const p = baziResult.pillars;
    if (!p) {
      errors.push(createDaoError(
        DaoErrorCode.FOUR_PILLARS_INCOMPLETE,
        '八字四柱数据缺失',
        '《改命纪实录》卷二§1.1',
        'fatal',
      ));
      result.valid = false;
      result.errors = errors;
      return result;
    }

    // 检查四柱完整性
    const required = ['year', 'month', 'day', 'hour'];
    for (const pillar of required) {
      const col = p[pillar];
      if (!col || !col.full || col.full.length !== 2) {
        errors.push(createDaoError(
          DaoErrorCode.FOUR_PILLARS_INCOMPLETE,
          `${pillar}柱数据不完整`,
          '《改命纪实录》卷二§1.1',
          'fatal',
          `请检查${pillar}柱计算`,
          pillar,
          col?.full,
          '2字符干支',
        ));
      }
    }

    if (errors.length === 0) {
      passed.push('四柱数据完整');
    }

    // 检查日主
    if (!baziResult.dayMaster) {
      errors.push(createDaoError(
        DaoErrorCode.DAY_MASTER_UNDEFINED,
        '日主未定义',
        '《改命纪实录》卷二§1.3',
        'fatal',
        '请检查日柱计算',
      ));
    } else {
      passed.push(`日主 ${baziResult.dayMaster} 已定义`);
    }

    // 检查纳音
    for (const pillar of required) {
      const col = p[pillar];
      if (col && col.nayin === '未知') {
        warnings.push(createDaoError(
          'NAYIN_NOT_FOUND' as any,
          `${pillar}柱 ${col.full} 的纳音未识别`,
          '《改命纪实录》卷二§2.3',
          'warning',
          '请确认干支组合是否在六十甲子中',
          pillar,
          col.full,
        ));
      }
    }

    // 检查空亡
    for (const pillar of required) {
      const col = p[pillar];
      if (col && (!col.kongWang || col.kongWang.length !== 2)) {
        warnings.push(createDaoError(
          'KONG_WANG_EMPTY' as any,
          `${pillar}柱空亡计算为空`,
          '《改命纪实录》卷二§2.5',
          'warning',
        ));
      }
    }

    result.errors = errors;
    result.warnings = warnings;
    result.passedChecks = passed;
    if (errors.length > 0) result.valid = false;
    return result;
  }
}
