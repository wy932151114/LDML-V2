// ============================================================
// DZS Core Kernel — Agent Coordination Layer（Agent协调层）
// 
// 协调四大专业Agent的协作：
// 1. 命理Agent（八字/五行）
// 2. 风水Agent（九宫/空间）
// 3. 仪式Agent（时辰/物品/行为）
// 4. 安全Agent（风控/违规拦截）
// ============================================================

import { Injectable } from '@nestjs/common';

/** Agent类型 */
export type AgentType = 'bazi' | 'fengshui' | 'ritual' | 'safety' | 'ai-interpreter';

/** Agent状态 */
export interface AgentStatus {
  type: AgentType;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastActive?: string;
  error?: string;
}

/** Agent任务 */
export interface AgentTask {
  id: string;
  type: AgentType;
  input: any;
  priority: number;
  assignedAt?: string;
}

/** Agent输出 */
export interface AgentOutput {
  type: AgentType;
  taskId: string;
  result: any;
  completedAt: string;
  confidence: number;
}

@Injectable()
export class AgentCoordinationLayer {
  private agents: Map<AgentType, AgentStatus> = new Map();
  private taskQueue: AgentTask[] = [];
  private completedTasks: AgentOutput[] = [];

  constructor() {
    this.initializeAgents();
  }

  /**
   * 初始化Agent注册表
   */
  private initializeAgents(): void {
    const agentList: Array<{ type: AgentType; name: string }> = [
      { type: 'bazi', name: '命理Agent' },
      { type: 'fengshui', name: '风水Agent' },
      { type: 'ritual', name: '仪式Agent' },
      { type: 'safety', name: '安全Agent' },
      { type: 'ai-interpreter', name: 'AI解释Agent' },
    ];

    for (const a of agentList) {
      this.agents.set(a.type, { type: a.type, name: a.name, status: 'idle' });
    }
  }

  /**
   * 提交任务给Agent
   */
  submitTask(task: AgentTask): void {
    task.assignedAt = new Date().toISOString();
    this.taskQueue.push(task);
    this.updateAgentStatus(task.type, 'running');
  }

  /**
   * 完成任务
   */
  completeTask(output: AgentOutput): void {
    this.completedTasks.push(output);
    this.updateAgentStatus(output.type, 'completed');

    // 从队列移除
    this.taskQueue = this.taskQueue.filter(t => t.id !== output.taskId);
  }

  /**
   * Agent失败
   */
  failTask(taskId: string, error: string): void {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task) {
      this.updateAgentStatus(task.type, 'error', error);
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
    }
  }

  /**
   * 获取所有Agent状态
   */
  getAgentStatus(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取特定Agent的最后一个输出
   */
  getLastOutput(type: AgentType): AgentOutput | undefined {
    return this.completedTasks.filter(t => t.type === type).pop();
  }

  /**
   * 获取所有已完成的任务输出
   */
  getAllOutputs(): AgentOutput[] {
    return [...this.completedTasks];
  }

  /**
   * 按顺序执行标准请求流程：
   * 输入 → 命理 → 风水 → 仪式 → 安全 → AI解释
   */
  async executeStandardFlow(input: any): Promise<{
    baziOutput: AgentOutput | null;
    fengshuiOutput: AgentOutput | null;
    ritualOutput: AgentOutput | null;
    safetyOutput: AgentOutput | null;
    finalOutput: AgentOutput | null;
  }> {
    // 注意：这里只是编排逻辑的框架
    // 实际执行由DZSKernel调用各引擎完成
    return {
      baziOutput: null,
      fengshuiOutput: null,
      ritualOutput: null,
      safetyOutput: null,
      finalOutput: null,
    };
  }

  private updateAgentStatus(type: AgentType, status: 'idle' | 'running' | 'completed' | 'error', error?: string): void {
    const agent = this.agents.get(type);
    if (agent) {
      agent.status = status;
      agent.lastActive = new Date().toISOString();
      if (error) agent.error = error;
    }
  }
}
