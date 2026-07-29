// ============================================================
// DZS-OS V2 — Report BullMQ Job Processor
// 实际处理报告生成任务的 Worker，集成 Prompt Center + AI Runtime
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReportJobData, ReportJobResult } from '../interface/report.dto';
import { Report, ReportDocument, ReportStatus } from '@/database/mongoose/schemas/report.schema';
import { ReportQueue, ReportQueueDocument, JobStatus } from '@/database/mongoose/schemas/report-queue.schema';
import { ReportCacheService } from './report-cache.service';
import { PromptCenterService } from '@/modules/prompt-center/services/prompt-center.service';

@Injectable()
export class ReportJobProcessor {
  private readonly logger = new Logger(ReportJobProcessor.name);

  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    @InjectModel(ReportQueue.name) private readonly reportQueueModel: Model<ReportQueueDocument>,
    private readonly cacheService: ReportCacheService,
    private readonly promptCenterService: PromptCenterService,
  ) {}

  /**
   * 实际处理报告生成任务
   * 该函数由 Worker 在 BullMQ 后台线程调用
   */
  async process(job: Job<ReportJobData>): Promise<ReportJobResult> {
    const {
      reportId, userId, type, baziData, userQuery, context,
      promptId, promptVersion, provider, model,
    } = job.data;
    const startedAt = Date.now();

    this.logger.log(`Processing report job ${job.id} (type: ${type})`);

    try {
      // 1. 更新状态为处理中
      await this.updateReportStatus(reportId, ReportStatus.PROCESSING);
      await this.updateQueueStatus(job.id!, JobStatus.ACTIVE);

      // 2. 报告进度
      await job.updateProgress({ percent: 10, message: '开始生成报告...' });

      // 3. AI 生成：通过 Prompt Center 渲染并调用 AI Runtime
      const { sections, actualPromptId, actualPromptVersion, actualProvider, actualModel, tokenUsage }
        = await this.generateReportContent(
            job, type, baziData, userQuery, context,
            promptId, promptVersion, provider, model,
          );

      await job.updateProgress({ percent: 80, message: '报告内容生成完成' });

      // 4. 构建结果
      const processingTime = Date.now() - startedAt;
      const result: ReportJobResult = {
        reportId,
        sections,
        tokenUsage: {
          promptTokens: tokenUsage?.promptTokens ?? 0,
          completionTokens: tokenUsage?.completionTokens ?? 0,
          totalTokens: tokenUsage?.totalTokens ?? 0,
          modelVersion: actualModel ?? 'gpt-4o',
        },
        processingTime,
        aiModelVersion: actualModel ?? 'gpt-4o',
      };

      // 5. 持久化报告内容到 MongoDB
      const updateFields: any = {
        status: ReportStatus.COMPLETED,
        sections: result.sections,
        tokenUsage: result.tokenUsage,
        processingTime: result.processingTime,
        aiModelVersion: result.aiModelVersion,
      };
      if (actualPromptId) updateFields.promptId = actualPromptId;
      if (actualPromptVersion) updateFields.promptVersion = actualPromptVersion;
      if (actualProvider) updateFields.provider = actualProvider;
      if (actualModel) updateFields.model = actualModel;

      await this.reportModel.findByIdAndUpdate(reportId, { $set: updateFields }).exec();

      await this.updateQueueStatus(job.id!, JobStatus.COMPLETED, JSON.stringify(result));

      // 6. 清除缓存
      await this.cacheService.invalidateOnUpdate(reportId, userId);

      await job.updateProgress({ percent: 100, message: '报告生成完成' });
      this.logger.log(`Report job ${job.id} completed in ${processingTime}ms`);

      return result;
    } catch (error) {
      // 标记失败
      const errorMsg = error.message || 'Unknown error';
      await this.reportModel.findByIdAndUpdate(reportId, {
        $set: {
          status: ReportStatus.FAILED,
          errorMessage: errorMsg,
        },
      }).exec();

      await this.updateQueueStatus(job.id!, JobStatus.FAILED, undefined, errorMsg);
      this.logger.error(`Report job ${job.id} failed: ${errorMsg}`);

      // 重新抛出，BullMQ 会处理重试
      throw error;
    }
  }

  // ── 私有方法 ────────────────────────────────────────────────

  /**
   * AI 报告内容生成
   * - 如果提供了 promptId，走 Prompt Center 渲染 + AI Runtime 调用
   * - 否则走占位逻辑（兼容旧模式）
   */
  private async generateReportContent(
    job: Job<ReportJobData>,
    type: string,
    baziData?: Record<string, any>,
    userQuery?: string,
    context?: Record<string, any>,
    promptId?: string,
    promptVersion?: string,
    provider?: string,
    model?: string,
  ): Promise<{
    sections: { title: string; content: string; order: number; type?: 'text' | 'table' | 'chart' | 'warning' | 'tip' }[];
    actualPromptId?: string;
    actualPromptVersion?: string;
    actualProvider?: string;
    actualModel?: string;
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    // ── Prompt Center 集成路径 ────────────────────────────────
    if (promptId) {
      await job.updateProgress({ percent: 25, message: '正在通过 Prompt Center 渲染提示词...' });

      // 构建变量上下文字典
      const variables: Record<string, string> = {};
      if (baziData) {
        variables.baziData = JSON.stringify(baziData);
        // 从 baziData 中提取用户姓名和出生信息（用于 prompt 模板变量）
        variables.userName = baziData.userName || baziData.name || '用户';
        variables.birthInfo = baziData.birthInfo
          || (baziData.year && baziData.month && baziData.day
            ? `${baziData.year}年${baziData.month}月${baziData.day}日${baziData.hour ? baziData.hour+'时' : ''}`
            : '');
      }
      if (userQuery) variables.userQuery = userQuery;
      if (context) variables.context = JSON.stringify(context);
      // 始终传入 context（包含 reportType 和当前日期）
      variables.context = JSON.stringify({
        reportType: type,
        currentDate: new Date().toISOString().split('T')[0],
        ...(context || {}),
      });
      variables.reportType = type;

      // 通过 Prompt Center 渲染 prompt 并调用 AI Runtime
      const executeResult = await this.promptCenterService.execute({
        promptId,
        version: promptVersion,
        variables,
        overrides: {
          provider,
          model,
          temperature: 0.7,
          maxTokens: 4096,
        },
        userId: job.data.userId,
      });

      await job.updateProgress({ percent: 60, message: 'AI 内容生成完成，正在解析...' });

      // 将 AI 输出包装为标准 sections
      const sections = [
        {
          title: 'AI 分析报告',
          content: executeResult.content,
          order: 1,
          type: 'text' as const,
        },
      ];

      this.logger.log(
        `Prompt Center generated content for prompt=${promptId}@${promptVersion ?? 'latest'}, ` +
        `model=${executeResult.modelUsed ?? model ?? 'default'}`
      );

      return {
        sections,
        actualPromptId: promptId,
        actualPromptVersion: executeResult.tokenUsage?.prompt
          ? await this.getActualVersion(promptId, promptVersion)
          : promptVersion,
        actualProvider: executeResult.providerUsed ?? provider,
        actualModel: executeResult.modelUsed ?? model,
        tokenUsage: executeResult.tokenUsage
          ? {
              promptTokens: executeResult.tokenUsage.prompt,
              completionTokens: executeResult.tokenUsage.completion,
              totalTokens: executeResult.tokenUsage.total,
            }
          : undefined,
      };
    }

    // ── 旧版占位路径（兼容无 Prompt Center 的场景） ────────────
    await job.updateProgress({ percent: 25, message: '正在分析数据...' });
    await this.sleep(500);

    await job.updateProgress({ percent: 40, message: '正在生成命理分析...' });
    await this.sleep(500);

    await job.updateProgress({ percent: 60, message: '正在优化报告内容...' });
    await this.sleep(500);

    return {
      sections: [
        {
          title: '命理概述',
          content: `基于输入的八字数据进行 ${type} 分析...（AI 生成内容）`,
          order: 1,
          type: 'text',
        },
        {
          title: '详细分析',
          content: '各柱详分析内容...（AI 生成内容）',
          order: 2,
          type: 'text',
        },
        {
          title: '综合建议',
          content: '基于分析结果的建议...（AI 生成内容）',
          order: 3,
          type: 'tip',
        },
      ],
    };
  }

  /**
   * 获取实际使用的版本号（用于记录）
   */
  private async getActualVersion(promptId: string, version?: string): Promise<string | undefined> {
    try {
      if (version) return version;
      const latest = await this.promptCenterService.getLatestVersion(promptId);
      return latest?.version;
    } catch {
      return undefined;
    }
  }

  private async updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
    await this.reportModel.findByIdAndUpdate(reportId, { $set: { status } }).exec();
  }

  private async updateQueueStatus(
    jobId: string,
    status: JobStatus,
    result?: string,
    error?: string,
  ): Promise<void> {
    const update: any = { status };
    if (result !== undefined) update.result = result;
    if (error !== undefined) update.error = error;
    if (status === JobStatus.ACTIVE) update.startedAt = new Date();
    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      update.finishedAt = new Date();
      update.duration = Date.now() - (update.startedAt?.getTime() || Date.now());
    }
    await this.reportQueueModel.findOneAndUpdate({ jobId }, { $set: update }).exec();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
