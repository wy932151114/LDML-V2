// ============================================================
// DZS-OS V2 — Report BullMQ Queue Service
// 报告生成任务队列：提交、查询、取消
// ============================================================

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents, Job } from 'bullmq';
import { ReportType } from '@/database/mongoose/schemas/report.schema';
import { ReportJobData, ReportJobResult } from '../interface/report.dto';

/** 队列名称 */
export const REPORT_QUEUE_NAME = 'v2-report-generate';

/** 默认任务选项 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600, // 1 小时后自动清理
    count: 100,
  },
  removeOnFail: {
    age: 86400, // 24 小时后清理失败任务
  },
};

@Injectable()
export class ReportQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ReportQueueService.name);
  private readonly queue: Queue<ReportJobData, ReportJobResult>;
  private readonly queueEvents: QueueEvents;
  private readonly redisUri: string;

  constructor(private readonly config: ConfigService) {
    this.redisUri = this.config.get<string>('REDIS_URI', 'redis://localhost:6379');

    const connection = { url: this.redisUri };

    this.queue = new Queue<ReportJobData, ReportJobResult>(REPORT_QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    this.queueEvents = new QueueEvents(REPORT_QUEUE_NAME, { connection });

    this.logger.log(`Report queue initialized: ${REPORT_QUEUE_NAME}`);
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.queueEvents.close();
  }

  // ── 任务提交 ────────────────────────────────────────────────

  /**
   * 提交报告生成任务
   * @param data 任务数据
   * @param delay 延迟时间（毫秒），用于重试或定时生成
   * @returns BullMQ Job 实例
   */
  async addJob(data: ReportJobData, delay?: number): Promise<Job<ReportJobData, ReportJobResult>> {
    const jobId = `report-${data.type}-${data.reportId}-${Date.now()}`;

    const job = await this.queue.add(jobId, data, {
      jobId,
      delay,
      ...DEFAULT_JOB_OPTIONS,
    });

    this.logger.log(`Report job added: ${jobId} (type: ${data.type})`);
    return job;
  }

  /**
   * 批量提交报告生成任务（用于每日/每周定期报告）
   */
  async addBulkJobs(
    jobs: { data: ReportJobData; delay?: number }[],
  ): Promise<Job<ReportJobData, ReportJobResult>[]> {
    const entries = jobs.map(({ data, delay }) => {
      const jobId = `report-${data.type}-${data.reportId}-${Date.now()}`;
      return {
        name: jobId,
        data,
        opts: { jobId, delay, ...DEFAULT_JOB_OPTIONS },
      };
    });

    const added = await this.queue.addBulk(entries);
    this.logger.log(`Bulk ${added.length} report jobs added`);
    return added;
  }

  // ── 任务查询 ────────────────────────────────────────────────

  /** 根据 jobId 获取任务状态 */
  async getJob(jobId: string): Promise<Job<ReportJobData, ReportJobResult> | undefined> {
    return this.queue.getJob(jobId);
  }

  /** 获取用户指定类型的活跃任务 */
  async getActiveJobsByType(type: ReportType): Promise<Job<ReportJobData, ReportJobResult>[]> {
    const [active, waiting, delayed] = await Promise.all([
      this.queue.getActive(),
      this.queue.getWaiting(),
      this.queue.getDelayed(),
    ]);

    const all = [...active, ...waiting, ...delayed];
    return all.filter((job) => job.data.type === type);
  }

  /** 统计各状态任务数量 */
  async getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.queue.getJobCounts() as Promise<{
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }>;
  }

  // ── 任务控制 ────────────────────────────────────────────────

  /** 取消任务 */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) {
      this.logger.warn(`Job not found for cancellation: ${jobId}`);
      return false;
    }
    await job.remove();
    this.logger.log(`Report job cancelled: ${jobId}`);
    return true;
  }

  /** 重试失败任务 */
  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job || !(await job.isFailed())) {
      return false;
    }
    await job.retry();
    this.logger.log(`Report job retry scheduled: ${jobId}`);
    return true;
  }

  // ── 事件监听 ────────────────────────────────────────────────

  /** 注册任务完成回调 */
  onCompleted(callback: (jobId: string, result: ReportJobResult) => void): void {
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      try {
        const result = JSON.parse(returnvalue) as ReportJobResult;
        callback(jobId, result);
      } catch {
        this.logger.warn(`Failed to parse completed job result: ${jobId}`);
      }
    });
  }

  /** 注册任务失败回调 */
  onFailed(callback: (jobId: string, failedReason: string) => void): void {
    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      callback(jobId, failedReason);
    });
  }

  /** 注册任务进度回调 */
  onProgress(callback: (jobId: string, progress: number | object) => void): void {
    this.queueEvents.on('progress', ({ jobId, data }: { jobId: string; data: number | object }) => {
      callback(jobId, data);
    });
  }

  // ── 队列管理 ────────────────────────────────────────────────

  /** 清空队列（谨慎使用） */
  async drain(): Promise<void> {
    await this.queue.drain();
    this.logger.warn('Report queue drained');
  }

  /** 暂停队列 */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.warn('Report queue paused');
  }

  /** 恢复队列 */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.log('Report queue resumed');
  }

  /** 获取队列名称 */
  getQueueName(): string {
    return REPORT_QUEUE_NAME;
  }
}
