/* =========================================================================
 * AiLogService — AI 运行时日志服务
 *
 * Records all AI inference calls and token consumption for monitoring,
 * cost tracking, and analytics.
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AILog,
  AITokenLog,
} from '@/database/mongoose/schemas';
import { AILogDocument } from '@/database/mongoose/schemas/ai-log.schema';
import { AITokenLogDocument } from '@/database/mongoose/schemas/ai-token-log.schema';

@Injectable()
export class AiLogService {
  private readonly logger = new Logger(AiLogService.name);

  constructor(
    @InjectModel(AILog.name) private readonly logModel: Model<AILogDocument>,
    @InjectModel(AITokenLog.name)
    private readonly tokenLogModel: Model<AITokenLogDocument>,
  ) {}

  /* -----------------------------------------------------------------------
   * Logging methods
   * ----------------------------------------------------------------------- */

  /**
   * Log an AI inference call.
   */
  async logAI(params: {
    userId?: string;
    provider: string;
    model: string;
    type: string;
    duration: number;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    cacheHit?: boolean;
    promptId?: string;
    promptVersion?: string;
    error?: string;
    status: string;
    retryCount?: number;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.logModel.create({
        userId: params.userId ?? 'anonymous',
        provider: params.provider,
        model: params.model,
        type: params.type,
        duration: params.duration,
        tokenUsage: params.tokenUsage ?? {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        cacheHit: params.cacheHit ?? false,
        promptId: params.promptId,
        promptVersion: params.promptVersion,
        error: params.error,
        status: params.status,
        retryCount: params.retryCount ?? 0,
        metadata: params.metadata,
      });
    } catch (err: any) {
      this.logger.error(`Failed to log AI call: ${err.message}`);
    }
  }

  /**
   * Log token consumption for billing/analytics.
   */
  async logToken(params: {
    userId?: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    duration: number;
    estimatedCost: number;
    cacheHit?: boolean;
    promptVersion?: string;
    error?: string;
  }): Promise<void> {
    try {
      await this.tokenLogModel.create({
        userId: params.userId ?? 'anonymous',
        provider: params.provider,
        model: params.model,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.totalTokens,
        duration: params.duration,
        estimatedCost: params.estimatedCost,
        cacheHit: params.cacheHit ?? false,
        promptVersion: params.promptVersion,
        error: params.error,
      });
    } catch (err: any) {
      this.logger.error(`Failed to log token usage: ${err.message}`);
    }
  }

  /* -----------------------------------------------------------------------
   * Query methods
   * ----------------------------------------------------------------------- */

  /**
   * Get recent AI logs for a user.
   */
  async getRecentLogs(
    userId: string,
    limit = 50,
  ): Promise<AILogDocument[]> {
    try {
      return await this.logModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
    } catch (err: any) {
      this.logger.error(`Failed to get recent logs: ${err.message}`);
      return [];
    }
  }

  /**
   * Get aggregated token stats for a user.
   */
  async getTokenStats(
    userId: string,
    since?: Date,
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    callCount: number;
    avgDuration: number;
  }> {
    try {
      const match: Record<string, any> = { userId };
      if (since) match.createdAt = { $gte: since };

      const stats = await this.tokenLogModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalTokens: { $sum: '$totalTokens' },
              totalCost: { $sum: '$estimatedCost' },
              callCount: { $sum: 1 },
              avgDuration: { $avg: '$duration' },
            },
          },
        ])
        .exec();

      if (stats.length === 0) {
        return { totalTokens: 0, totalCost: 0, callCount: 0, avgDuration: 0 };
      }

      return {
        totalTokens: stats[0].totalTokens ?? 0,
        totalCost: stats[0].totalCost ?? 0,
        callCount: stats[0].callCount ?? 0,
        avgDuration: stats[0].avgDuration ?? 0,
      };
    } catch (err: any) {
      this.logger.error(`Failed to get token stats: ${err.message}`);
      return { totalTokens: 0, totalCost: 0, callCount: 0, avgDuration: 0 };
    }
  }

  /**
   * Get aggregated stats per provider.
   */
  async getProviderStats(
    since?: Date,
  ): Promise<
    {
      provider: string;
      callCount: number;
      errorCount: number;
      avgDuration: number;
      totalTokens: number;
    }[]
  > {
    try {
      const match: Record<string, any> = {};
      if (since) match.createdAt = { $gte: since };

      const stats = await this.logModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$provider',
              callCount: { $sum: 1 },
              errorCount: {
                $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
              },
              avgDuration: { $avg: '$duration' },
              totalTokens: { $sum: '$tokenUsage.totalTokens' },
            },
          },
          { $sort: { callCount: -1 } },
        ])
        .exec();

      return stats.map((s) => ({
        provider: s._id,
        callCount: s.callCount,
        errorCount: s.errorCount,
        avgDuration: s.avgDuration ?? 0,
        totalTokens: s.totalTokens ?? 0,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to get provider stats: ${err.message}`);
      return [];
    }
  }

  /**
   * Get cache hit/miss statistics.
   */
  async getCacheStats(
    since?: Date,
  ): Promise<{ hitCount: number; missCount: number; hitRate: number }> {
    try {
      const match: Record<string, any> = {};
      if (since) match.createdAt = { $gte: since };

      const stats = await this.logModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              hitCount: {
                $sum: { $cond: [{ $eq: ['$cacheHit', true] }, 1, 0] },
              },
              missCount: {
                $sum: { $cond: [{ $eq: ['$cacheHit', false] }, 1, 0] },
              },
            },
          },
        ])
        .exec();

      if (stats.length === 0) {
        return { hitCount: 0, missCount: 0, hitRate: 0 };
      }

      const { hitCount, missCount } = stats[0];
      const total = hitCount + missCount;
      return {
        hitCount,
        missCount,
        hitRate: total > 0 ? hitCount / total : 0,
      };
    } catch (err: any) {
      this.logger.error(`Failed to get cache stats: ${err.message}`);
      return { hitCount: 0, missCount: 0, hitRate: 0 };
    }
  }

  /**
   * Get total error count.
   */
  async getErrorCount(since?: Date): Promise<number> {
    try {
      const match: Record<string, any> = { status: 'error' };
      if (since) match.createdAt = { $gte: since };

      return await this.logModel.countDocuments(match);
    } catch (err: any) {
      this.logger.error(`Failed to get error count: ${err.message}`);
      return 0;
    }
  }

  /**
   * Get average duration across all calls.
   */
  async getAverageDuration(since?: Date): Promise<number> {
    try {
      const match: Record<string, any> = {};
      if (since) match.createdAt = { $gte: since };

      const stats = await this.logModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              avgDuration: { $avg: '$duration' },
            },
          },
        ])
        .exec();

      return stats.length > 0 ? (stats[0].avgDuration ?? 0) : 0;
    } catch (err: any) {
      this.logger.error(`Failed to get average duration: ${err.message}`);
      return 0;
    }
  }
}
