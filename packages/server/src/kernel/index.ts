// ============================================================
// DZS Core Kernel V1 — 统一导出
// ============================================================

// === 能源总线 ===
export { EnergyBus } from './energy/energy-bus';
export type { EnergyState, EnergyModifier, EnergySource, EnergyFusionConfig } from './energy/energy-bus';

// === 因果链 ===
export { CausalChainEngine } from './causality/causal-chain.engine';
export type { CausalChain, CausalTrace, TriggerType } from './causality/causal-chain.engine';

// === 安全 ===
export { RiskControlRuntime } from './security/risk-control.runtime';
export type { RiskRule, RiskEvent, RiskCheckResult, RiskLevel } from './security/risk-control.runtime';
export { AISafetyLayer } from './security/ai-safety.layer';
export type { AISafetyResult } from './security/ai-safety.layer';

// === 分发器 ===
export { ProtocolDispatcher } from './dispatcher/protocol.dispatcher';
export type { ProtocolType, ProtocolConsumer } from './dispatcher/protocol.dispatcher';

// === 运行时 ===
export { RuntimeScheduler } from './runtime/runtime-scheduler';
export type { RuntimeContext, RuntimePhase, PhaseStatus } from './runtime/runtime-scheduler';

// === Agent ===
export { AgentCoordinationLayer } from './agents/agent-coordination.layer';
export type { AgentType, AgentTask, AgentOutput, AgentStatus } from './agents/agent-coordination.layer';

// === 主入口 ===
export { DZSKernel } from './dzs-kernel';
export type { DZSResponse } from './dzs-kernel';

/** 系统常量 */
export const DZS_VERSION = '1.0.0';
export const DZS_NAME = '道之自然·东方命理AI操作系统';
export const DZS_KERNEL_SOURCE = '《道之自然·改命纪实录》';
