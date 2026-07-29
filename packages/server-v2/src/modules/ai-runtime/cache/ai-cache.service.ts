/* =========================================================================
 * AiCacheService — AI 运行时缓存服务
 *
 * Provides Redis-backed caching for AI responses with graceful degradation
 * when Redis is unavailable. Tracks hit/miss rates in memory.
 * ========================================================================= */

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/database/redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour

  private hits = 0;
  private misses = 0;

  constructor(private readonly redis: RedisService) {}

  /* -----------------------------------------------------------------------
   * Cache key generation
   * ----------------------------------------------------------------------- */

  /**
   * Generate a deterministic cache key from prompt + model + temperature.
   */
  generateCacheKey(prompt: string, model: string, temperature: number): string {
    const hash = crypto
      .createHash('md5')
      .update(`${prompt}|${temperature}`)
      .digest('hex');
    return `ai:cache:${hash}:${model}`;
  }

  /* -----------------------------------------------------------------------
   * Basic operations
   * ----------------------------------------------------------------------- */

  /**
   * Get a cached value by key. Returns null on miss or Redis error.
   */
  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redis.get(key);
      if (value !== null) {
        this.hits++;
        return value;
      }
      this.misses++;
      return null;
    } catch (err: any) {
      this.misses++;
      this.logger.warn(`Cache get error: ${err.message}`);
      return null;
    }
  }

  /**
   * Set a value in the cache with optional TTL.
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await this.redis.set(key, value, ttl ?? this.DEFAULT_TTL);
    } catch (err: any) {
      this.logger.warn(`Cache set error: ${err.message}`);
    }
  }

  /**
   * Get a value from cache or generate it if not present.
   * Returns the content and whether it was from cache.
   */
  async getOrGenerate(
    key: string,
    generator: () => Promise<string>,
    ttl?: number,
  ): Promise<{ content: string; cached: boolean }> {
    const cached = await this.get(key);
    if (cached !== null) {
      return { content: cached, cached: true };
    }

    const content = await generator();
    await this.set(key, content, ttl);
    return { content, cached: false };
  }

  /**
   * Invalidate cache entries matching a pattern.
   * Note: ioredis doesn't support SCAN in the simple API, so we use scanStream.
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const stream = this.redis.client.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];
      for await (const resultKeys of stream) {
        if (resultKeys.length > 0) {
          keys.push(...resultKeys);
        }
      }

      if (keys.length > 0) {
        await this.redis.client.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache keys matching "${pattern}"`);
      }
    } catch (err: any) {
      this.logger.warn(`Cache invalidate error for pattern "${pattern}": ${err.message}`);
    }
  }

  /* -----------------------------------------------------------------------
   * Health & stats
   * ----------------------------------------------------------------------- */

  /**
   * Get cache health and statistics.
   */
  async health(): Promise<{ enabled: boolean; hitRate: number; keys: number }> {
    let enabled = false;
    let keys = 0;

    try {
      // Try to ping Redis to check availability
      const pong = await this.redis.client.ping();
      enabled = pong === 'PONG';

      if (enabled) {
        // Count keys with the ai:cache: prefix using SCAN
        const stream = this.redis.client.scanStream({
          match: 'ai:cache:*',
          count: 500,
        });

        for await (const resultKeys of stream) {
          keys += resultKeys.length;
        }
      }
    } catch {
      // Redis not available — graceful degradation
      enabled = false;
    }

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return { enabled, hitRate, keys };
  }
}
