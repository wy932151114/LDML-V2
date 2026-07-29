import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(private config: ConfigService) {
    const uri = config.get<string>('REDIS_URI', 'redis://localhost:6379');
    this.client = new Redis(uri, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error (non-fatal): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Cache helpers
  async get(key: string): Promise<string | null> {
    try { return await this.client.get(key); } catch { return null; }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) await this.client.setex(key, ttl, value);
      else await this.client.set(key, value);
    } catch { /* silent fail */ }
  }

  async del(key: string): Promise<void> {
    try { await this.client.del(key); } catch { /* silent fail */ }
  }

  // Rate limiting
  async incr(key: string): Promise<number> {
    try { return await this.client.incr(key); } catch { return 0; }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try { await this.client.expire(key, seconds); } catch { /* silent fail */ }
  }
}
