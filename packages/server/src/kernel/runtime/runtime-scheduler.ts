// ============================================================
// DZS Core Kernel — Runtime Scheduler（运行时调度器）
// 
// 调度器负责编排完整的处理流程。
// 从用户输入 → 引擎计算 → 验证 → 能量融合 → AI输出
// ============================================================

import { Injectable } from '@nestjs/common';

/** 处理阶段 */
export type RuntimePhase = 
  | 'input' | 'validation' | 'bazi' | 'wuxing' | 'jiugong' 
  | 'energy-fusion' | 'causality' | 'risk-control' 
  | 'ai-generation' | 'output' | 'completed' | 'error';

/** 阶段状态 */
export interface PhaseStatus {
  phase: RuntimePhase;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
}

/** 运行时上下文（贯穿整个请求生命周期） */
export interface RuntimeContext {
  /** 请求ID */
  requestId: string;
  /** 开始时间 */
  startedAt: string;
  /** 当前阶段 */
  currentPhase: RuntimePhase;
  /** 所有阶段状态 */
  phases: Map<RuntimePhase, PhaseStatus>;
  /** 共享数据（各阶段在此存取数据） */
  data: Map<string, any>;
  /** 是否被风控阻断 */
  blocked: boolean;
  /** 阻断原因 */
  blockReason?: string;
}

@Injectable()
export class RuntimeScheduler {
  private activeContexts: Map<string, RuntimeContext> = new Map();

  /**
   * 创建新的运行时上下文
   */
  createContext(requestId: string): RuntimeContext {
    const phases: RuntimePhase[] = [
      'input', 'validation', 'bazi', 'wuxing', 'jiugong',
      'energy-fusion', 'causality', 'risk-control',
      'ai-generation', 'output',
    ];

    const phaseMap = new Map<RuntimePhase, PhaseStatus>();
    for (const phase of phases) {
      phaseMap.set(phase, { phase, status: 'pending' });
    }

    const ctx: RuntimeContext = {
      requestId,
      startedAt: new Date().toISOString(),
      currentPhase: 'input',
      phases: phaseMap,
      data: new Map(),
      blocked: false,
    };

    this.activeContexts.set(requestId, ctx);
    return ctx;
  }

  /**
   * 标记阶段完成并推进到下一阶段
   */
  advance(requestId: string, phase: RuntimePhase, result?: any, error?: string): RuntimeContext | null {
    const ctx = this.activeContexts.get(requestId);
    if (!ctx) return null;

    const status = ctx.phases.get(phase);
    if (status) {
      status.status = error ? 'failed' : 'completed';
      status.completedAt = new Date().toISOString();
      status.error = error;

      if (status.startedAt) {
        status.duration = Date.now() - new Date(status.startedAt).getTime();
      }
    }

    if (result !== undefined) {
      ctx.data.set(phase, result);
    }

    // 查找下一未完成的阶段
    const phaseOrder: RuntimePhase[] = [
      'input', 'validation', 'bazi', 'wuxing', 'jiugong',
      'energy-fusion', 'causality', 'risk-control',
      'ai-generation', 'output',
    ];

    const currentIdx = phaseOrder.indexOf(phase);
    if (currentIdx < phaseOrder.length - 1 && !error) {
      ctx.currentPhase = phaseOrder[currentIdx + 1];
      const next = ctx.phases.get(ctx.currentPhase);
      if (next) {
        next.status = 'running';
        next.startedAt = new Date().toISOString();
      }
    }

    // 如果全部完成
    if (currentIdx === phaseOrder.length - 1 || error) {
      ctx.currentPhase = error ? 'error' : 'completed';
    }

    return ctx;
  }

  /**
   * 风控阻断
   */
  block(requestId: string, reason: string): void {
    const ctx = this.activeContexts.get(requestId);
    if (ctx) {
      ctx.blocked = true;
      ctx.blockReason = reason;
      ctx.currentPhase = 'risk-control';
    }
  }

  /**
   * 获取上下文
   */
  getContext(requestId: string): RuntimeContext | null {
    return this.activeContexts.get(requestId) || null;
  }

  /**
   * 获取上下文中的数据
   */
  getData<T>(requestId: string, key: string): T | undefined {
    const ctx = this.activeContexts.get(requestId);
    return ctx?.data.get(key) as T | undefined;
  }

  /**
   * 清理已完成的上下文
   */
  cleanup(requestId: string): void {
    this.activeContexts.delete(requestId);
  }

  /**
   * 获取进度字符串
   */
  getProgress(requestId: string): string {
    const ctx = this.activeContexts.get(requestId);
    if (!ctx) return '未找到上下文';

    const phases: RuntimePhase[] = [
      'input', 'validation', 'bazi', 'wuxing', 'jiugong',
      'energy-fusion', 'causality', 'risk-control',
      'ai-generation', 'output',
    ];

    let done = 0;
    for (const p of phases) {
      const s = ctx.phases.get(p);
      if (s?.status === 'completed') done++;
    }

    const total = phases.length;
    const pct = Math.round((done / total) * 100);
    return `${pct}% (${done}/${total}) — 当前: ${ctx.currentPhase}`;
  }
}
