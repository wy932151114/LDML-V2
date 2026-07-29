// ============================================================
// 道之自然验证中台 — ValidationCenter
// 
// 这是整个系统的安全层。
// 所有数据进入AI层之前必须经过此中台。
// 
// 架构：
// 用户请求 → 引擎计算 → ValidationCenter → ProtoBuilder → AI层
//              ↑               ↑                ↑
//          计算引擎       合规+风险检查    协议化输出
// ============================================================

import { Injectable } from '@nestjs/common';
import { LongitudeValidator } from './validators/longitude.validator';
import { SolarTimeValidator } from './validators/solar-time.validator';
import { WuXingValidator } from './validators/wuxing.validator';
import { BaziValidator } from './validators/bazi.validator';
import { FengShuiValidator } from './validators/fengshui.validator';
import { RitualValidator } from './validators/ritual.validator';
import type { ValidationResult } from '../protocols/errors.protocol';
import type { ValidationContext } from '../protocols/validation.protocol';

export interface CenterResult {
  /** 是否全部通过 */
  passed: boolean;
  /** 各域验证结果 */
  results: Record<string, ValidationResult>;
  /** 汇总统计 */
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalPassed: number;
    fatalCount: number;
  };
}

@Injectable()
export class ValidationCenter {
  private readonly longitudeVal = new LongitudeValidator();
  private readonly solarTimeVal = new SolarTimeValidator();
  private readonly wuxingVal = new WuXingValidator();
  private readonly baziVal = new BaziValidator();
  private readonly fengshuiVal = new FengShuiValidator();
  private readonly ritualVal = new RitualValidator();

  /**
   * 全域验证
   * 执行所有适用的验证器
   */
  validateAll(context: ValidationContext): CenterResult {
    const results: Record<string, ValidationResult> = {};
    let fatalCount = 0;

    // 1. 经度验证
    results.longitude = this.longitudeVal.validate(context.longitude, context);

    // 2. 太阳时验证
    if (context.birthDate) {
      results.solarTime = this.solarTimeVal.validate({
        hour: context.birthDate.getHours(),
        minute: context.birthDate.getMinutes(),
        longitude: context.longitude,
      }, context);
    }

    // 3. 八字验证
    if (context.bazi) {
      results.bazi = this.baziVal.validate(context.bazi, context);
    }

    // 4. 五行验证
    if (context.wuxing) {
      results.wuxing = this.wuxingVal.validate(context.wuxing, context);
    }

    // 统计
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalPassed = 0;

    for (const [_, r] of Object.entries(results)) {
      totalErrors += r.errors.length;
      totalWarnings += r.warnings.length;
      totalPassed += r.passedChecks.length;
      fatalCount += r.errors.filter(e => e.level === 'fatal').length;
    }

    const passed = fatalCount === 0;

    return {
      passed,
      results,
      summary: {
        totalErrors,
        totalWarnings,
        totalPassed,
        fatalCount,
      },
    };
  }

  /**
   * 快速验证：仅检查致命错误
   */
  validateQuick(context: ValidationContext): boolean {
    const result = this.validateAll(context);
    return result.passed;
  }

  /**
   * 获取所有警告
   */
  getWarnings(context: ValidationContext): string[] {
    const result = this.validateAll(context);
    const warnings: string[] = [];
    for (const [domain, r] of Object.entries(result.results)) {
      for (const w of r.warnings) {
        warnings.push(`[${domain}] ${w.message}`);
      }
    }
    return warnings;
  }
}
