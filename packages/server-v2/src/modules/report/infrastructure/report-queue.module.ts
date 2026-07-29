// ============================================================
// DZS-OS V2 — Report Queue Module
// BullMQ 队列基础设施模块（Worker + Queue）
// ============================================================

import { Module, OnModuleInit, Logger, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';

import { ReportQueueService, REPORT_QUEUE_NAME } from './report-queue.service';
import { ReportJobProcessor } from './report-queue.processor';
import { ReportCacheService } from './report-cache.service';
import { Report, ReportSchema } from '@/database/mongoose/schemas/report.schema';
import { ReportQueue, ReportQueueSchema } from '@/database/mongoose/schemas/report-queue.schema';
import { PromptCenterModule } from '@/modules/prompt-center/prompt-center.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: ReportQueue.name, schema: ReportQueueSchema },
    ]),
    forwardRef(() => PromptCenterModule),
  ],
  providers: [
    ReportQueueService,
    ReportJobProcessor,
    ReportCacheService,
  ],
  exports: [
    ReportQueueService,
    ReportCacheService,
  ],
})
export class ReportQueueModule implements OnModuleInit {
  private readonly logger = new Logger(ReportQueueModule.name);
  private worker: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: ReportJobProcessor,
  ) {}

  onModuleInit() {
    this.startWorker();
  }

  /**
   * 启动 BullMQ Worker，监听队列并处理任务
   */
  private startWorker(): void {
    const redisUri = this.config.get<string>('REDIS_URI', 'redis://localhost:6379');

    this.worker = new Worker(
      REPORT_QUEUE_NAME,
      async (job) => this.processor.process(job),
      {
        connection: { url: redisUri },
        concurrency: 3, // 并行处理 3 个任务
        limiter: {
          max: 10,      // 每秒最多处理 10 个
          duration: 1000,
        },
        autorun: true,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Worker completed job ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Worker failed job ${job?.id}: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err.message}`);
    });

    this.logger.log('BullMQ report worker started');
  }
}
