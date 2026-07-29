// ============================================================
// 道之自然核心协议 — 验证协议 (Validation Protocol)
// 
// 定义Validation Center的标准输出
// 所有验证器必须实现此接口
// ============================================================

import type { ValidationResult } from './errors.protocol';

/**
 * 验证器接口
 * 每个域验证器必须实现此接口
 */
export interface DomainValidator<T> {
  /** 验证器名称 */
  readonly name: string;
  /** 验证域 */
  readonly domain: string;
  /** 执行验证 */
  validate(input: T, context?: ValidationContext): ValidationResult;
  /** 获取验证器版本 */
  getVersion(): string;
}

/** 验证上下文（包含关联数据） */
export interface ValidationContext {
  /** 八字协议 */
  bazi?: any;
  /** 五行协议 */
  wuxing?: any;
  /** 节气协议 */
  solar?: any;
  /** 经度 */
  longitude?: number;
  /** 纬度 */
  latitude?: number;
  /** 出生日期 */
  birthDate?: Date;
  /** 用户级别 */
  userLevel?: string;
}

/** 验证结果汇总 */
export interface ValidationSummary {
  /** 所有验证器通过 */
  allPassed: boolean;
  /** 致命错误数 */
  fatalCount: number;
  /** 错误数 */
  errorCount: number;
  /** 警告数 */
  warningCount: number;
  /** 通过检查数 */
  passedCount: number;
  /** 建议数量 */
  suggestionCount: number;
  /** 按域分组的错误 */
  byDomain: Record<string, number>;
}

/** 验证中台配置 */
export interface ValidationCenterConfig {
  /** 严格模式（致命错误直接阻断） */
  strictMode: boolean;
  /** 启用AI输出校验 */
  aiValidation: boolean;
  /** 完整追溯 */
  fullTrace: boolean;
  maxErrors: number;
}
