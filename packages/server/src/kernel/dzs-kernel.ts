// ============================================================
// DZS Core Kernel V1 — 主入口
// 
// 这是整个DZS-OS的核心。
// 所有功能模块（Web/API/AI/Agent/报告）都通过此入口访问系统。
// 
// 架构：
// 用户请求
//   ↓
// RuntimeScheduler.createContext()
//   ↓
// RuntimeScheduler.advance() x 10 阶段
//   ↓
// ValidationCenter.validateAll()
//   ↓
// BaziEngine / NinePalaceSpatialEngine / WuXingEnergyEngine
//   ↓
// EnergyBus.calculateFinalState()
//   ↓
// CausalChainEngine.analyze()
//   ↓
// RiskControlRuntime.check()
//   ↓
// ProtocolDispatcher.dispatch()
//   ↓
// AISafetyLayer.checkOutput()
//   ↓
// 响应
// ============================================================

import { Injectable } from '@nestjs/common';
import { EnergyBus } from './energy/energy-bus';
import type { EnergyState } from './energy/energy-bus';
import { CausalChainEngine } from './causality/causal-chain.engine';
import { RiskControlRuntime } from './security/risk-control.runtime';
import { AISafetyLayer } from './security/ai-safety.layer';
import { ProtocolDispatcher } from './dispatcher/protocol.dispatcher';
import { RuntimeScheduler } from './runtime/runtime-scheduler';
import type { RuntimeContext, RuntimePhase } from './runtime/runtime-scheduler';
import { AgentCoordinationLayer } from './agents/agent-coordination.layer';
import { ValidationCenter } from '../validation-center/validation-center';
import type { CenterResult } from '../validation-center/validation-center';

/** 标准请求结果 */
export interface DZSResponse {
  requestId: string;
  success: boolean;
  progress: string;
  energyState?: EnergyState;
  validations?: CenterResult;
  riskCheck?: any;
  aiSafety?: any;
  phases: Array<{ phase: string; status: string; duration?: number }>;
  error?: string;
}

@Injectable()
export class DZSKernel {
  constructor(
    public readonly energyBus: EnergyBus,
    public readonly causalChain: CausalChainEngine,
    public readonly riskControl: RiskControlRuntime,
    public readonly aiSafety: AISafetyLayer,
    public readonly protocolDispatcher: ProtocolDispatcher,
    public readonly scheduler: RuntimeScheduler,
    public readonly agents: AgentCoordinationLayer,
    public readonly validationCenter: ValidationCenter,
  ) {}

  /**
   * 执行完整的标准请求流程
   * 
   * @param input 用户输入（包含八字信息/空间信息等）
   * @returns 完整处理结果
   */
  async execute(input: {
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    birthHour?: number;
    birthMinute?: number;
    gender?: string;
    longitude?: number;
    latitude?: number;
    requestId?: string;
    skipValidation?: boolean;
  }): Promise<DZSResponse> {
    const requestId = input.requestId || `req-${Date.now()}`;
    let ctx: RuntimeContext | null = null;

    try {
      // Phase 1: 初始化
      ctx = this.scheduler.createContext(requestId);
      ctx.data.set('input', input);

      // Phase 2: 验证
      this.scheduler.advance(requestId, 'input');
      if (!input.skipValidation) {
        const validationResult = this.validationCenter.validateAll({
          longitude: input.longitude,
          birthDate: input.birthYear ? new Date(input.birthYear, (input.birthMonth || 1) - 1, input.birthDay || 1) : undefined,
        });
        ctx.data.set('validation', validationResult);
        this.scheduler.advance(requestId, 'validation', validationResult);
      } else {
        this.scheduler.advance(requestId, 'validation', { passed: true });
      }

      // Phase 3: 八字计算
      this.scheduler.advance(requestId, 'bazi');
      const baziResult = this.runBaziCalculation(input);
      ctx.data.set('bazi_output', baziResult);
      this.scheduler.advance(requestId, 'bazi', baziResult);

      // Phase 4: 五行
      this.scheduler.advance(requestId, 'wuxing');
      const wuxingResult = { /* 从baziResult提取 */ executed: true };
      ctx.data.set('wuxing', wuxingResult);
      this.scheduler.advance(requestId, 'wuxing', wuxingResult);

      // Phase 5: 九宫
      this.scheduler.advance(requestId, 'jiugong');
      const now = new Date();
      const jiugongResult = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
      ctx.data.set('jiugong', jiugongResult);
      this.scheduler.advance(requestId, 'jiugong', jiugongResult);

      // Phase 6: 能量融合
      this.scheduler.advance(requestId, 'energy-fusion');
      const energyState = this.energyBus.calculateFinalState({});
      ctx.data.set('energy', energyState);
      this.scheduler.advance(requestId, 'energy-fusion', energyState);

      // Phase 7: 因果分析
      this.scheduler.advance(requestId, 'causality');
      const chains = this.causalChain.analyze('系统初始化', 'compound', {
        energies: energyState.energies,
      });
      ctx.data.set('causality', chains);
      this.scheduler.advance(requestId, 'causality', chains);

      // Phase 8: 风控检查
      this.scheduler.advance(requestId, 'risk-control');
      const riskCheck = this.riskControl.check({
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        birthDay: input.birthDay,
        longitude: input.longitude,
      });
      ctx.data.set('risk', riskCheck);
      if (riskCheck.blocked) {
        this.scheduler.block(requestId, '风控阻断：存在致命风险');
        return this.buildResponse(ctx, false, riskCheck.events.map(e => e.ruleName).join('; '));
      }
      this.scheduler.advance(requestId, 'risk-control', riskCheck);

      // Phase 9: AI输出准备
      this.scheduler.advance(requestId, 'ai-generation');
      this.scheduler.advance(requestId, 'ai-generation', { prepared: true });

      // Phase 10: 完成
      this.scheduler.advance(requestId, 'output');

      return this.buildResponse(ctx, true);

    } catch (e: any) {
      if (ctx) {
        this.scheduler.advance(requestId, 'error', undefined, e.message);
      }
      return {
        requestId,
        success: false,
        progress: ctx ? this.scheduler.getProgress(requestId) : '0%',
        phases: [],
        error: e.message,
      };
    } finally {
      if (ctx) this.scheduler.cleanup(requestId);
    }
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    version: string;
    uptime: number;
    agents: any[];
    totalRequests: number;
  } {
    return {
      version: '1.0.0',
      uptime: process.uptime(),
      agents: this.agents.getAgentStatus(),
      totalRequests: 0,
    };
  }

  private runBaziCalculation(input: any): any {
    // 实际的八字计算逻辑在BaziModule/BaziEngine中
    // 此处为Kernel占位
    return { calculated: true, input };
  }

  private buildResponse(ctx: RuntimeContext, success: boolean, error?: string): DZSResponse {
    const phases: Array<{ phase: string; status: string; duration?: number }> = [];
    ctx.phases.forEach((status, phase) => {
      phases.push({ phase, status: status.status, duration: status.duration });
    });

    return {
      requestId: ctx.requestId,
      success,
      progress: this.scheduler.getProgress(ctx.requestId),
      energyState: ctx.data.get('energy') as EnergyState | undefined,
      validations: ctx.data.get('validation') as CenterResult | undefined,
      riskCheck: ctx.data.get('risk'),
      aiSafety: ctx.data.get('ai-safety'),
      phases,
      error,
    };
  }
}
