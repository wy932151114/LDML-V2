// ============================================================
// DZS-OS V2 — Report Domain Service
// 报告生成、查询、管理的核心业务逻辑
// ============================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Report, ReportDocument, ReportStatus, ExportFormat } from '@/database/mongoose/schemas/report.schema';
import { ReportQueueService } from '../infrastructure/report-queue.service';
import { ReportCacheService } from '../infrastructure/report-cache.service';
import { RendererService } from '../renderer/renderer.service';
import {
  CreateReportDto,
  QueryReportDto,
  UpdateReportDto,
  ReportDetailDto,
  ReportSummaryDto,
  PaginatedReportResponseDto,
  ReportJobData,
} from '../interface/report.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    private readonly queueService: ReportQueueService,
    private readonly cacheService: ReportCacheService,
    private readonly rendererService: RendererService,
  ) {}

  // ── 报告类型 → Prompt ID 映射 ────────────────────────────────

  private readonly TYPE_TO_PROMPT: Record<string, string> = {
    bazi: 'bazi-analysis',
    wuxing: 'wuxing-analysis',
    jiugong: 'jiugong-analysis',
    fengshui: 'fengshui-analysis',
    ai_comprehensive: 'comprehensive-analysis',
    enterprise: 'comprehensive-analysis',
    daily: 'daily-fortune',
    weekly: 'daily-fortune',
    monthly: 'comprehensive-analysis',
    yearly: 'comprehensive-analysis',
    dayun: 'comprehensive-analysis',
  };

  // ── 默认 AI Provider/Model ─────────────────────────────────

  private readonly DEFAULT_PROVIDER = 'deepseek';
  private readonly DEFAULT_MODEL = 'deepseek-v4-flash';

  // ── 报告创建 ────────────────────────────────────────────────

  /**
   * 创建报告并提交到 BullMQ 队列
   */
  async create(userId: string, dto: CreateReportDto): Promise<{ reportId: string; jobId: string }> {
    // 自动映射 type → promptId
    const promptId = dto.promptId || this.TYPE_TO_PROMPT[dto.type];
    const provider = dto.provider || this.DEFAULT_PROVIDER;
    const model = dto.model || this.DEFAULT_MODEL;

    // 1. 创建报告记录（状态：pending）
    const report = await this.reportModel.create({
      userId,
      type: dto.type,
      status: ReportStatus.PENDING,
      input: {
        baziData: dto.baziData,
        userQuery: dto.userQuery,
        context: dto.context,
      },
      promptId,
      promptVersion: dto.promptVersion,
      provider,
      model,
    });

    // 2. 提交到 BullMQ 队列
    const jobData: ReportJobData = {
      reportId: report._id.toString(),
      userId,
      type: dto.type,
      baziData: dto.baziData,
      userQuery: dto.userQuery,
      context: dto.context,
      promptId,
      promptVersion: dto.promptVersion,
      provider,
      model,
    };

    const job = await this.queueService.addJob(jobData);

    // 3. 更新报告的 jobId
    await this.reportModel.findByIdAndUpdate(report._id, {
      $set: { status: ReportStatus.QUEUED },
    }).exec();

    // 4. 清除列表缓存
    await this.cacheService.invalidateOnCreate(userId);

    this.logger.log(`Report created: ${report._id}, job: ${job.id}`);

    return {
      reportId: report._id.toString(),
      jobId: job.id!,
    };
  }

  // ── 报告查询 ────────────────────────────────────────────────

  /**
   * 获取报告详情
   */
  async findById(reportId: string, userId: string): Promise<ReportDetailDto> {
    // 尝试从缓存读取
    const cached = await this.cacheService.getReportDetail<ReportDetailDto>(reportId);
    if (cached) return cached;

    const report = await this.reportModel.findOne({
      _id: reportId,
      userId,
      isDeleted: false,
    }).exec();

    if (!report) {
      throw new NotFoundException('报告不存在');
    }

    const dto = this.toDetailDto(report);

    // 写入缓存（仅已完成的内容可缓存）
    if (report.status === ReportStatus.COMPLETED) {
      await this.cacheService.setReportDetail(reportId, dto);
    }

    return dto;
  }

  /**
   * 获取用户报告列表（分页）
   */
  async findUserReports(userId: string, query: QueryReportDto): Promise<PaginatedReportResponseDto> {
    const { type, status, page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = query;

    // 构建查询条件
    const filter: any = { userId, isDeleted: false };
    if (type) filter.type = type;
    if (status) filter.status = status;

    // 生成查询 hash 用于缓存
    const queryHash = this.hashQuery(filter, page, limit, sort, order);

    // 尝试读取缓存
    const cached = await this.cacheService.getReportList<PaginatedReportResponseDto>(userId, queryHash);
    if (cached) return cached;

    // 查询数据库
    const skip = (page - 1) * limit;
    const sortObj: any = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.reportModel.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('type status createdAt updatedAt processingTime errorMessage isStarred')
        .exec(),
      this.reportModel.countDocuments(filter).exec(),
    ]);

    const result: PaginatedReportResponseDto = {
      items: items.map((r) => this.toSummaryDto(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // 写入缓存
    await this.cacheService.setReportList(userId, queryHash, result);

    return result;
  }

  // ── 报告更新 ────────────────────────────────────────────────

  /**
   * 更新报告（用户侧修改）
   */
  async update(reportId: string, userId: string, dto: UpdateReportDto): Promise<ReportDetailDto> {
    const update: any = {};
    if (dto.userQuery !== undefined) update['input.userQuery'] = dto.userQuery;
    if (dto.context !== undefined) update['input.context'] = dto.context;
    if (dto.isStarred !== undefined) update.isStarred = dto.isStarred;

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('没有可更新的字段');
    }

    const report = await this.reportModel.findOneAndUpdate(
      { _id: reportId, userId, isDeleted: false },
      { $set: update },
      { new: true },
    ).exec();

    if (!report) {
      throw new NotFoundException('报告不存在');
    }

    // 清除缓存
    await this.cacheService.invalidateOnUpdate(reportId, userId);

    return this.toDetailDto(report);
  }

  // ── 报告删除 ────────────────────────────────────────────────

  /**
   * 软删除报告
   */
  async softDelete(reportId: string, userId: string): Promise<void> {
    const report = await this.reportModel.findOneAndUpdate(
      { _id: reportId, userId, isDeleted: false },
      { $set: { isDeleted: true } },
    ).exec();

    if (!report) {
      throw new NotFoundException('报告不存在');
    }

    await this.cacheService.invalidateOnDelete(reportId, userId);
  }

  /**
   * 批量软删除
   */
  async batchSoftDelete(userId: string, ids: string[]): Promise<number> {
    const result = await this.reportModel.updateMany(
      { _id: { $in: ids }, userId, isDeleted: false },
      { $set: { isDeleted: true } },
    ).exec();

    if (result.modifiedCount > 0) {
      await this.cacheService.invalidateUserLists(userId);
    }

    return result.modifiedCount;
  }

  // ── 导出报告 ──────────────────────────────────────────────

  /**
   * 导出报告为指定格式
   */
  async exportReport(userId: string, reportId: string, format: string): Promise<string> {
    const report = await this.findById(reportId, userId);
    const sections = (report as any).sections || [];
    const renderContext = {
      title: (report as any).title || '命理报告',
      sections,
      reportType: (report as any).type || 'unknown',
      userName: (report as any).input?.baziData?.userName,
      generatedAt: new Date(),
      aiModelVersion: (report as any).aiModelVersion,
      tokenUsage: (report as any).tokenUsage,
    };
    const result = await this.rendererService.render(format as ExportFormat, renderContext);
    return result.content;
  }

  // ── 任务进度查询 ──────────────────────────────────────────

  /**
   * 获取任务进度
   */
  async getJobProgress(userId: string, jobId: string) {
    const job = await this.queueService.getJob(jobId);
    return {
      jobId,
      status: !job ? 'unknown' : (job.finishedOn ? 'completed' : job.processedOn ? 'active' : 'waiting'),
      progressPercent: (job as any)?.progressPercent || 0,
      progressMessage: (job as any)?.progress?.message,
    };
  }

  // ── 任务状态查询 ────────────────────────────────────────────

  /**
   * 获取报告队列统计
   */
  async getQueueStats() {
    return this.queueService.getJobCounts();
  }

  // ── 工具方法 ────────────────────────────────────────────────

  private toSummaryDto(report: ReportDocument): ReportSummaryDto {
    return {
      id: report._id.toString(),
      type: report.type,
      status: report.status,
      title: report.sections?.[0]?.title,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      processingTime: report.processingTime,
      errorMessage: report.errorMessage,
      isStarred: report.isStarred,
    };
  }

  private toDetailDto(report: ReportDocument): ReportDetailDto {
    return {
      id: report._id.toString(),
      userId: report.userId,
      type: report.type,
      status: report.status,
      input: report.input,
      sections: (report.sections || []).map((s) => ({
        title: s.title,
        content: s.content,
        order: s.order,
        type: s.type as any,
      })),
      tokenUsage: report.tokenUsage
        ? {
            promptTokens: report.tokenUsage.promptTokens,
            completionTokens: report.tokenUsage.completionTokens,
            totalTokens: report.tokenUsage.totalTokens,
            modelVersion: report.tokenUsage.modelVersion,
          }
        : undefined,
      processingTime: report.processingTime,
      errorMessage: report.errorMessage,
      version: report.version,
      aiModelVersion: report.aiModelVersion,
      isStarred: report.isStarred,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  /** 生成查询的 hash 用于缓存键 */
  private hashQuery(filter: any, page: number, limit: number, sort: string, order: string): string {
    const str = JSON.stringify({ filter, page, limit, sort, order });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
