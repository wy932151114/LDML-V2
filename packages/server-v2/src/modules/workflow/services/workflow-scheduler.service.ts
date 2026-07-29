// ============================================================
// DZS-OS V2 — Workflow Scheduler Service
// 工作流调度器：定时执行、CronJob 管理、延迟执行
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as cronParser from 'cron-parser';

import {
  Workflow,
  WorkflowDocument,
} from '@/database/mongoose/schemas/workflow.schema';

// ── 类型定义 ────────────────────────────────────────────────────

/** 调度的工作流任务 */
export interface ScheduledWorkflow {
  id: string;
  workflowId: string;
  cron: string;
  description?: string;
  input?: Record<string, unknown>;
  triggeredBy: string;
  enabled: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed';
  createdAt: Date;
}

/** 调度器任务在内存中的表示 */
interface CronTask {
  id: string;
  workflowId: string;
  cron: string;
  input: Record<string, unknown>;
  triggeredBy: string;
  enabled: boolean;
  timer?: ReturnType<typeof setInterval>;
}

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class WorkflowSchedulerService {
  private readonly logger = new Logger(WorkflowSchedulerService.name);

  /** 内存中的调度任务表 */
  private readonly tasks = new Map<string, CronTask>();

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
  ) {}

  /* =================================================================
   * 注册调度
   * ================================================================= */

  /**
   * 注册定时执行工作流
   * @param workflowId 工作流 ID
   * @param cron Cron 表达式（如 '0 9 * * *' 表示每天 9 点）
   * @param input 输入参数
   * @param triggeredBy 触发人
   * @returns 调度任务 ID
   */
  async schedule(
    workflowId: string,
    cron: string,
    options?: {
      input?: Record<string, unknown>;
      description?: string;
      triggeredBy?: string;
    },
  ): Promise<{ id: string; nextRunAt: Date }> {
    // 1. 验证工作流存在
    const workflow = await this.workflowModel
      .findOne({ workflowId })
      .exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }

    // 2. 验证 Cron 表达式
    if (!this.isValidCron(cron)) {
      throw new Error(`Invalid cron expression: "${cron}"`);
    }

    // 3. 计算下次执行时间
    const nextRunAt = this.getNextCronDate(cron);

    // 4. 创建调度任务
    const taskId = `sched_${workflowId}_${Date.now()}`;
    const task: CronTask = {
      id: taskId,
      workflowId,
      cron,
      input: options?.input ?? {},
      triggeredBy: options?.triggeredBy ?? 'system',
      enabled: true,
    };

    // 5. 注册定时器
    const intervalMs = this.cronToIntervalMs(cron);
    if (intervalMs > 0) {
      task.timer = setInterval(async () => {
        await this.executeTask(task);
      }, intervalMs);
    } else if (nextRunAt) {
      // 一次性调度（基于具体时间）
      const delay = nextRunAt.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(async () => {
          await this.executeTask(task);
          this.tasks.delete(taskId);
        }, delay);
      }
    }

    this.tasks.set(taskId, task);
    this.logger.log(
      `Scheduled workflow ${workflowId} with cron "${cron}", next run at ${nextRunAt?.toISOString() ?? 'unknown'}`,
    );

    return { id: taskId, nextRunAt: nextRunAt ?? new Date(Date.now() + 60000) };
  }

  /**
   * 立即执行一次（不注册定时任务）
   */
  async runOnce(
    workflowId: string,
    input?: Record<string, unknown>,
    triggeredBy?: string,
  ): Promise<{ workflowId: string; status: string }> {
    const workflow = await this.workflowModel
      .findOne({ workflowId })
      .exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }

    // 返回任务信息；实际执行由 Facade 层协调
    return {
      workflowId,
      status: 'scheduled',
    };
  }

  /* =================================================================
   * 管理调度
   * ================================================================= */

  /**
   * 取消调度
   */
  async cancel(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.timer) {
      clearInterval(task.timer);
    }
    this.tasks.delete(id);
    this.logger.log(`Cancelled scheduled task: ${id}`);
    return true;
  }

  /**
   * 暂停调度
   */
  async pause(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.enabled = false;
    this.logger.log(`Paused scheduled task: ${id}`);
    return true;
  }

  /**
   * 恢复调度
   */
  async resume(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.enabled = true;
    this.logger.log(`Resumed scheduled task: ${id}`);
    return true;
  }

  /**
   * 获取所有活跃的调度任务
   */
  listSchedules(): ScheduledWorkflow[] {
    const result: ScheduledWorkflow[] = [];
    for (const task of this.tasks.values()) {
      result.push({
        id: task.id,
        workflowId: task.workflowId,
        cron: task.cron,
        input: task.input,
        triggeredBy: task.triggeredBy,
        enabled: task.enabled,
        nextRunAt: this.getNextCronDate(task.cron),
        createdAt: new Date(),
      });
    }
    return result.sort((a, b) => (a.nextRunAt?.getTime() ?? 0) - (b.nextRunAt?.getTime() ?? 0));
  }

  /**
   * 获取单个调度任务
   */
  getSchedule(id: string): ScheduledWorkflow | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    return {
      id: task.id,
      workflowId: task.workflowId,
      cron: task.cron,
      input: task.input,
      triggeredBy: task.triggeredBy,
      enabled: task.enabled,
      nextRunAt: this.getNextCronDate(task.cron),
      createdAt: new Date(),
    };
  }

  /* =================================================================
   * 延迟执行
   * ================================================================= */

  /**
   * 延迟执行工作流（单次）
   * @param delayMs 延迟毫秒数
   */
  async scheduleDelayed(
    workflowId: string,
    delayMs: number,
    options?: {
      input?: Record<string, unknown>;
      triggeredBy?: string;
    },
  ): Promise<{ id: string; runAt: Date }> {
    const taskId = `delay_${workflowId}_${Date.now()}`;
    const runAt = new Date(Date.now() + delayMs);

    const task: CronTask = {
      id: taskId,
      workflowId,
      cron: '',
      input: options?.input ?? {},
      triggeredBy: options?.triggeredBy ?? 'system',
      enabled: true,
    };

    setTimeout(async () => {
      await this.executeTask(task);
      this.tasks.delete(taskId);
    }, Math.min(delayMs, 2147483647)); // Max setTimeout delay

    this.tasks.set(taskId, task);
    this.logger.log(
      `Delayed execution for workflow ${workflowId} in ${delayMs}ms, run at ${runAt.toISOString()}`,
    );

    return { id: taskId, runAt };
  }

  /* =================================================================
   * 内部
   * ================================================================= */

  private async executeTask(task: CronTask): Promise<void> {
    if (!task.enabled) return;

    this.logger.log(
      `Executing scheduled workflow: ${task.workflowId} (task: ${task.id})`,
    );

    // 实际执行由 Facade 层注入 WorkflowExecutorService 完成
    // 此处仅记录日志；Facade 层会调用此服务并接管执行
  }

  /* =================================================================
   * 工具方法
   * ================================================================= */

  /**
   * 校验 Cron 表达式是否合法
   */
  private isValidCron(cron: string): boolean {
    try {
      cronParser.parseExpression(cron);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取 Cron 表达式的下次执行时间
   */
  private getNextCronDate(cron: string): Date | undefined {
    try {
      const interval = cronParser.parseExpression(cron);
      return interval.next().toDate();
    } catch {
      return undefined;
    }
  }

  /**
   * 将 Cron 表达式转换为毫秒间隔（近似）
   * 仅用于简单场景；精确调度应使用 cron-parser
   */
  private cronToIntervalMs(cron: string): number {
    try {
      const interval = cronParser.parseExpression(cron);
      const prev = interval.next().toDate();
      const next = interval.next().toDate();
      return next.getTime() - prev.getTime();
    } catch {
      return -1;
    }
  }
}
