// ============================================================
// DZS Core Kernel — Risk Control Runtime（风控运行时）
// 
// 在所有输出进入AI层之前进行风险拦截。
// 这是系统的安全阀。
// ============================================================

import { Injectable } from '@nestjs/common';

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** 风险规则 */
export interface RiskRule {
  code: string;
  name: string;
  description: string;
  level: RiskLevel;
  check: (context: any) => boolean;
  action: 'block' | 'warn' | 'log';
  message: string;
}

/** 风险事件 */
export interface RiskEvent {
  ruleCode: string;
  ruleName: string;
  timestamp: string;
  level: RiskLevel;
  context: string;
  action: string;
}

/** 风控检查结果 */
export interface RiskCheckResult {
  passed: boolean;
  blocked: boolean;
  warnings: string[];
  events: RiskEvent[];
}

@Injectable()
export class RiskControlRuntime {
  private rules: RiskRule[] = [];
  private eventLog: RiskEvent[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * 注册自定义风险规则
   */
  registerRule(rule: RiskRule): void {
    this.rules.push(rule);
  }

  /**
   * 执行全部风控检查
   */
  check(context: any, domains: string[] = ['all']): RiskCheckResult {
    const warnings: string[] = [];
    const events: RiskEvent[] = [];
    let blocked = false;

    const rulesToCheck = domains.includes('all') 
      ? this.rules 
      : this.rules.filter(r => domains.some(d => r.code.startsWith(d)));

    for (const rule of rulesToCheck) {
      try {
        const triggered = rule.check(context);
        if (triggered) {
          const event: RiskEvent = {
            ruleCode: rule.code,
            ruleName: rule.name,
            timestamp: new Date().toISOString(),
            level: rule.level,
            context: rule.description,
            action: rule.action,
          };
          events.push(event);
          this.eventLog.push(event);

          if (rule.action === 'block') {
            blocked = true;
          }
          warnings.push(rule.message);
        }
      } catch (e: any) {
        // 规则执行失败时，安全策略：发出警告但不阻断
        warnings.push(`风控规则 ${rule.code} 执行异常: ${e.message}`);
      }
    }

    return {
      passed: !blocked && events.length === 0,
      blocked,
      warnings: [...new Set(warnings)],
      events,
    };
  }

  /**
   * 获取风险评分 0-100
   */
  getRiskScore(events?: RiskEvent[]): number {
    const evts = events || this.eventLog.slice(-50);
    if (evts.length === 0) return 0;

    let score = 0;
    for (const e of evts) {
      switch (e.level) {
        case 'critical': score += 25; break;
        case 'high': score += 15; break;
        case 'medium': score += 8; break;
        case 'low': score += 3; break;
      }
    }
    return Math.min(100, score);
  }

  /**
   * 获取事件日志
   */
  getEventLog(): RiskEvent[] {
    return [...this.eventLog];
  }

  /**
   * 清空日志
   */
  clearLog(): void {
    this.eventLog = [];
  }

  /**
   * 注册默认风控规则
   */
  private registerDefaultRules(): void {
    // ===== 经度安全 =====
    this.registerRule({
      code: 'LON-001',
      name: '经度范围检查',
      description: '经度必须在73°E-135°E（中国境内）',
      level: 'high',
      check: (ctx: any) => ctx.longitude !== undefined && (ctx.longitude < 73 || ctx.longitude > 135),
      action: 'block',
      message: '⚠️ 经度超出中国境内范围，请检查输入',
    });

    // ===== 太阳时偏移上限 =====
    this.registerRule({
      code: 'TST-001',
      name: '真太阳时偏移上限',
      description: '真太阳时修正不应超过180分钟',
      level: 'medium',
      check: (ctx: any) => ctx.solarOffset !== undefined && Math.abs(ctx.solarOffset) > 180,
      action: 'warn',
      message: '⚠️ 真太阳时修正较大（>180分钟），请确认经度',
    });

    // ===== AI输出检查 =====
    this.registerRule({
      code: 'AI-001',
      name: 'AI输出校验',
      description: 'AI输出不允许包含未经协议层验证的命理结论',
      level: 'critical',
      check: (ctx: any) => ctx.aiOutput && ctx.aiOutput.includes('此命中') && !ctx.validated,
      action: 'warn',
      message: '⚠️ AI输出可能包含未经校验的命理结论',
    });

    // ===== 五黄煞阻断 =====
    this.registerRule({
      code: 'FWS-001',
      name: '五黄煞高危操作',
      description: '五黄煞方位不宜动土修造',
      level: 'high',
      check: (ctx: any) => ctx.wuHuangDirection && ctx.targetDirection === ctx.wuHuangDirection && ctx.action === 'renovate',
      action: 'block',
      message: '⚠️ 五黄煞方位不宜动土修造，建议择日或择方',
    });

    // ===== 流年三煞 =====
    this.registerRule({
      code: 'FWS-002',
      name: '三煞方位检查',
      description: '流年三煞方不宜动土',
      level: 'medium',
      check: (ctx: any) => ctx.sanShaDirection && ctx.targetDirection === ctx.sanShaDirection && ctx.action === 'renovate',
      action: 'warn',
      message: '⚠️ 流年三煞方，虽非绝对禁忌，但建议谨慎',
    });

    // ===== 时辰禁忌 =====
    this.registerRule({
      code: 'TIM-001',
      name: '时辰禁忌',
      description: '23:00-1:00为子时跨日，日柱可能受影响',
      level: 'low',
      check: (ctx: any) => ctx.hour !== undefined && (ctx.hour >= 23 || ctx.hour < 1),
      action: 'warn',
      message: '💡 子时出生已自动处理跨日问题',
    });

    // ===== 数据完整性 =====
    this.registerRule({
      code: 'DAT-001',
      name: '基础数据完整性',
      description: '排盘必须有出生年月日',
      level: 'critical',
      check: (ctx: any) => !ctx.birthYear || !ctx.birthMonth || !ctx.birthDay,
      action: 'block',
      message: '⚠️ 缺少必要出生信息（年/月/日）',
    });
  }
}
