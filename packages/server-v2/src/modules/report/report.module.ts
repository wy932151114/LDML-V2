// ============================================================
// DZS-OS V2 — Report Module
// 报告生成、管理模块，集成 BullMQ 队列与 Redis 缓存
// ============================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Report, ReportSchema } from '@/database/mongoose/schemas/report.schema';
import { ReportQueue, ReportQueueSchema } from '@/database/mongoose/schemas/report-queue.schema';
import { ReportQueueModule } from './infrastructure/report-queue.module';
import { ReportService } from './domain/report.service';
import { ReportController } from './interface/report.controller';
import { RendererService } from './renderer/renderer.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: ReportQueue.name, schema: ReportQueueSchema },
    ]),
    ReportQueueModule,
  ],
  controllers: [
    ReportController,
  ],
  providers: [
    ReportService,
    RendererService,
  ],
  exports: [
    ReportService,
    ReportQueueModule,
  ],
})
export class ReportModule {}
