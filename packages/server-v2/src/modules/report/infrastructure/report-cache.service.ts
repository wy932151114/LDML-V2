// ============================================================
// DZS-OS V2 — Report Cache Layer
// 基于 Redis 的报告缓存服务，降低重复查询和 AI 调用
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/database/redis/redis.service';

/** 缓存键前缀 */
const CACHE_PREFIX = 'v2:report:';

/** 默认 TTL（秒） */
const DEFAULT_TTL = 300; // 5 分钟
const REPORT_DETAIL_TTL = 600; // 10 分钟
const REPORT_LIST_TTL = 120; // 2 分钟

@Injectable()
export class ReportCacheService {
  private readonly logger = new Logger(ReportCacheService.name);

  constructor(private readonly redis: RedisService) {}

  // ── 缓存键构建 ──────────────────────────────────────────────

  private detailKey(reportId: string): string {
    return `${CACHE_PREFIX}detail:${reportId}`;
  }

  private listKey(userId: string, queryHash: string): string {
    return `${CACHE_PREFIX}list:${userId}:${queryHash}`;
  }

  private summaryKey(reportId: string): string {
    return `${CACHE_PREFIX}summary:${reportId}`;
  }

  private progressKey(jobId: string): string {
    return `${CACHE_PREFIX}progress:${jobId}`;
  }

  private userReportIdsKey(userId: string): string {
    return `${CACHE_PREFIX}user:${userId}:ids`;
  }

  // ── 报告详情缓存 ────────────────────────────────────────────

  /** 获取缓存的报告详情 */
  async getReportDetail<T>(reportId: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(this.detailKey(reportId));
      if (cached) {
        this.logger.debug(`Cache hit: report detail ${reportId}`);
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Cache get error for report ${reportId}: ${error.message}`);
      return null;
    }
  }

  /** 设置报告详情缓存 */
  async setReportDetail(reportId: string, data: any): Promise<void> {
    try {
      await this.redis.set(
        this.detailKey(reportId),
        JSON.stringify(data),
        REPORT_DETAIL_TTL,
      );
    } catch (error) {
      this.logger.warn(`Cache set error for report ${reportId}: ${error.message}`);
    }
  }

  /** 清除报告详情缓存 */
  async invalidateReportDetail(reportId: string): Promise<void> {
    try {
      await this.redis.del(this.detailKey(reportId));
      await this.redis.del(this.summaryKey(reportId));
    } catch (error) {
      this.logger.warn(`Cache invalidation error for report ${reportId}: ${error.message}`);
    }
  }

  // ── 报告列表缓存 ────────────────────────────────────────────

  /** 获取缓存的报告列表 */
  async getReportList<T>(userId: string, queryHash: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(this.listKey(userId, queryHash));
      if (cached) {
        this.logger.debug(`Cache hit: report list for user ${userId}`);
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Cache get error for report list: ${error.message}`);
      return null;
    }
  }

  /** 设置报告列表缓存 */
  async setReportList(userId: string, queryHash: string, data: any): Promise<void> {
    try {
      await this.redis.set(
        this.listKey(userId, queryHash),
        JSON.stringify(data),
        REPORT_LIST_TTL,
      );
    } catch (error) {
      this.logger.warn(`Cache set error for report list: ${error.message}`);
    }
  }

  /** 清除用户报告列表缓存 */
  async invalidateUserLists(userId: string): Promise<void> {
    try {
      // 使用 scan 模式清除该用户的所有列表缓存
      const pattern = `${CACHE_PREFIX}list:${userId}:*`;
      // Note: RedisService.client is public, use scan for pattern match
      let cursor = '0';
      do {
        const result = await this.redis.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          50,
        );
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await Promise.all(keys.map(k => this.redis.del(k)));
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`Cache invalidation error for user ${userId}: ${error.message}`);
    }
  }

  // ── 任务进度缓存 ────────────────────────────────────────────

  /** 缓存任务进度（实时更新用） */
  async setJobProgress(jobId: string, progress: { percent: number; message: string }): Promise<void> {
    try {
      await this.redis.set(
        this.progressKey(jobId),
        JSON.stringify(progress),
        DEFAULT_TTL,
      );
    } catch (error) {
      this.logger.warn(`Cache set progress error: ${error.message}`);
    }
  }

  /** 获取任务进度 */
  async getJobProgress(jobId: string): Promise<{ percent: number; message: string } | null> {
    try {
      const cached = await this.redis.get(this.progressKey(jobId));
      if (cached) return JSON.parse(cached);
      return null;
    } catch (error) {
      this.logger.warn(`Cache get progress error: ${error.message}`);
      return null;
    }
  }

  /** 清除任务进度缓存 */
  async clearJobProgress(jobId: string): Promise<void> {
    try {
      await this.redis.del(this.progressKey(jobId));
    } catch (error) {
      this.logger.warn(`Cache clear progress error: ${error.message}`);
    }
  }

  // ── 批量失效 ────────────────────────────────────────────────

  /** 当报告更新时，失效所有相关缓存 */
  async invalidateOnUpdate(reportId: string, userId: string): Promise<void> {
    await Promise.all([
      this.invalidateReportDetail(reportId),
      this.invalidateUserLists(userId),
    ]);
  }

  /** 当报告创建时，失效用户列表缓存 */
  async invalidateOnCreate(userId: string): Promise<void> {
    await this.invalidateUserLists(userId);
  }

  /** 当报告删除时，失效相关所有缓存 */
  async invalidateOnDelete(reportId: string, userId: string): Promise<void> {
    await this.invalidateOnUpdate(reportId, userId);
  }
}
