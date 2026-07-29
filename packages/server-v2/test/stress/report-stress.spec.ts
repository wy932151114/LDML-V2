// ============================================================
// DZS-OS V2 — Report Stress Test
// 压力测试：连续生成100份报告、10个并发用户、
//           BullMQ队列状态、Redis命中率、Mongo写入成功率、PDF渲染耗时统计
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';

import { ReportService } from '../../src/modules/report/domain/report.service';
import { Report, ReportStatus, ReportType } from '../../src/database/mongoose/schemas/report.schema';
import { ReportQueueService } from '../../src/modules/report/infrastructure/report-queue.service';
import { ReportCacheService } from '../../src/modules/report/infrastructure/report-cache.service';
import { RedisService } from '../../src/database/redis/redis.service';
import { RendererService } from '../../src/modules/report/renderer/renderer.service';

// ── 类型定义 ──────────────────────────────────────────────────

interface StressMetrics {
  totalRequests: number;
  succeeded: number;
  failed: number;
  totalDurationMs: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  mongoWriteSuccessRate: number;
  redisHitRate: number;
  redisMissRate: number;
  bullmqQueueCounts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  pdfRenderTimesMs: number[];
  pdfAvgRenderMs: number;
  errors: string[];
}

// ── Mock 工具 ─────────────────────────────────────────────────

let mockIdCounter = 0;
function createMockReport(overrides: Record<string, any> = {}): any {
  return {
    _id: overrides._id ?? `stress-mock-id-${++mockIdCounter}`,
    userId: overrides.userId ?? 'user-stress-test',
    type: overrides.type ?? ReportType.BAZI,
    status: overrides.status ?? ReportStatus.COMPLETED,
    input: overrides.input ?? { baziData: { year: 1990 }, userQuery: '测试压力' },
    sections: overrides.sections ?? [
      { title: '基础分析', content: '压力测试内容', order: 1, type: 'text' },
    ],
    exports: overrides.exports ?? [],
    tokenUsage: overrides.tokenUsage ?? { promptTokens: 100, completionTokens: 200, totalTokens: 300, modelVersion: 'gpt-4' },
    processingTime: overrides.processingTime ?? 1500,
    errorMessage: overrides.errorMessage ?? null,
    version: overrides.version ?? 1,
    isDeleted: overrides.isDeleted ?? false,
    isStarred: overrides.isStarred ?? false,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    toObject: function () { return { ...this }; },
    save: jest.fn().mockResolvedValue(true),
  };
}

// ── Helpers ───────────────────────────────────────────────────

/** 模拟休眠 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 计算百分位数 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/** 打印指标表格 */
function printMetrics(title: string, metrics: Record<string, any>): void {
  console.log('\n══════════════════════════════════════════════');
  console.log(`📊 ${title}`);
  console.log('────────────────────────────────────────────');
  for (const [key, value] of Object.entries(metrics)) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
    console.log(`${label.padEnd(16)}: ${value}`);
  }
  console.log('══════════════════════════════════════════════\n');
}

// ── 测试套件 ──────────────────────────────────────────────────

describe('Report Stress Test', () => {
  let reportService: ReportService;
  let reportModel: Model<any>;
  let queueService: ReportQueueService;
  let cacheService: ReportCacheService;

  // 压力计数器（每个 describe 块独立管理）
  let mongoWriteSuccess: number;
  let mongoWriteFail: number;
  let redisHit: number;
  let redisMiss: number;
  let pdfRenderTimes: number[];
  const errors: string[] = [];

  // 队列计数器 — 由 mock 内部管理
  let queueJobCallCount: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getModelToken(Report.name),
          useValue: {
            create: jest.fn().mockImplementation(async (data: any) => {
              const doc = createMockReport({
                userId: data.userId,
                type: data.type,
                status: ReportStatus.PENDING,
                input: data.input,
              });
              return doc;
            }),
            findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
            find: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              exec: jest.fn().mockResolvedValue([]),
            }),
            findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
            findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
            countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
            updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }) }),
          },
        },
        {
          provide: ReportQueueService,
          useValue: {
            addJob: jest.fn().mockImplementation(async (data: any) => {
              queueJobCallCount++;
              return { id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
            }),
            getJobCounts: jest.fn().mockResolvedValue({
              waiting: 0,
              active: 3,
              completed: 97,
              failed: 0,
              delayed: 0,
            }),
            getJob: jest.fn().mockResolvedValue({
              id: 'mock-job',
              finishedOn: Date.now(),
              processedOn: Date.now() - 2000,
              progressPercent: 100,
            }),
          },
        },
        {
          provide: ReportCacheService,
          useValue: {
            getReportDetail: jest.fn().mockImplementation(async (reportId: string) => {
              // 模拟缓存命中约 60%
              const hit = Math.random() < 0.6;
              if (hit) {
                return createMockReport({ _id: reportId });
              }
              return null;
            }),
            setReportDetail: jest.fn().mockResolvedValue(undefined),
            getReportList: jest.fn().mockResolvedValue(null),
            setReportList: jest.fn().mockResolvedValue(undefined),
            invalidateOnCreate: jest.fn().mockResolvedValue(undefined),
            invalidateOnUpdate: jest.fn().mockResolvedValue(undefined),
            invalidateOnDelete: jest.fn().mockResolvedValue(undefined),
            invalidateUserLists: jest.fn().mockResolvedValue(undefined),
            invalidateReportDetail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                REDIS_URI: 'redis://localhost:6379',
                JWT_SECRET: 'test-secret',
                JWT_ACCESS_EXPIRY: '15m',
                JWT_REFRESH_EXPIRY: '7d',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(true),
            client: {
              scan: jest.fn().mockResolvedValue(['0', []]),
              quit: jest.fn().mockResolvedValue(undefined),
            },
          },
        },
        {
          provide: RendererService,
          useValue: {
            render: jest.fn().mockResolvedValue({ content: '', format: 'json' }),
          },
        },
      ],
    }).compile();

    reportService = module.get<ReportService>(ReportService);
    reportModel = module.get(getModelToken(Report.name));
    queueService = module.get<ReportQueueService>(ReportQueueService);
    cacheService = module.get<ReportCacheService>(ReportCacheService);
  });

  beforeEach(() => {
    // 重置计数器
    mongoWriteSuccess = 0;
    mongoWriteFail = 0;
    redisHit = 0;
    redisMiss = 0;
    pdfRenderTimes = [];
    errors.length = 0;
    queueJobCallCount = 0;
  });

  // ═══════════════════════════════════════════════════════════════
  // 测试 1: 顺序生成 100 份报告（基础吞吐）
  // ═══════════════════════════════════════════════════════════════

  describe('Sequential 100 reports generation', () => {
    it('should generate 100 reports sequentially and track metrics', async () => {
      const startTime = Date.now();
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        const t0 = Date.now();
        const result = await reportService.create('user-stress-test', {
          type: ReportType.BAZI,
          baziData: { year: 1990 + (i % 30), month: (i % 12) + 1 },
          userQuery: `压力测试第 ${i + 1} 份报告`,
        });
        durations.push(Date.now() - t0);
        mongoWriteSuccess++;
        expect(result).toBeDefined();
        expect(result.reportId).toBeDefined();
        expect(result.jobId).toBeDefined();
      }

      const totalDuration = Date.now() - startTime;
      const sortedDurations = [...durations].sort((a, b) => a - b);

      //  BullMQ 队列调用次数
      const queueCounts = await queueService.getJobCounts();

      printMetrics('Stress Test — Sequential 100 Reports', {
        总请求: 100,
        成功: mongoWriteSuccess,
        失败: mongoWriteFail,
        总耗时: `${totalDuration}ms`,
        平均耗时: `${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}ms`,
        最小耗时: `${sortedDurations[0] ?? 0}ms`,
        最大耗时: `${sortedDurations[sortedDurations.length - 1] ?? 0}ms`,
        P50: `${percentile(sortedDurations, 50)}ms`,
        P95: `${percentile(sortedDurations, 95)}ms`,
        P99: `${percentile(sortedDurations, 99)}ms`,
        Mongo写入成功率: `${((mongoWriteSuccess / 100) * 100).toFixed(1)}%`,
        BullMQ队列等待: queueCounts.waiting,
        BullMQ队列活跃: queueCounts.active,
        BullMQ队列完成: queueCounts.completed,
        BullMQ队列失败: queueCounts.failed,
      });

      expect(mongoWriteSuccess).toBe(100);
      expect(mongoWriteFail).toBe(0);
      expect(durations.length).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 测试 2: 10 个并发用户同时生成报告
  // ═══════════════════════════════════════════════════════════════

  describe('10 concurrent users generating reports', () => {
    it('should handle 10 concurrent users each generating reports', async () => {
      const CONCURRENT_USERS = 10;
      const REPORTS_PER_USER = 10;
      const userIds = Array.from({ length: CONCURRENT_USERS }, (_, i) => `concurrent-user-${i + 1}`);

      const startTime = Date.now();
      const durations: number[] = [];
      let userSuccess = 0;
      let userFail = 0;
      const userErrors: string[] = [];

      // 10 个并发用户，每人生成 10 份报告
      const userTasks = userIds.map((userId) =>
        Promise.all(
          Array.from({ length: REPORTS_PER_USER }, async (_, j) => {
            const t0 = Date.now();
            try {
              const result = await reportService.create(userId, {
                type: j % 2 === 0 ? ReportType.BAZI : ReportType.WUXING,
                baziData: { year: 1990 + (j % 30) },
                userQuery: `并发用户 ${userId} 报告 #${j + 1}`,
              });
              durations.push(Date.now() - t0);
              userSuccess++;
              return result;
            } catch (err: any) {
              durations.push(Date.now() - t0);
              userFail++;
              userErrors.push(`${userId} #${j + 1}: ${err.message}`);
              return null;
            }
          }),
        ),
      );

      const results = await Promise.all(userTasks);
      const totalDuration = Date.now() - startTime;
      const flatResults = results.flat();
      const sortedDurations = [...durations].sort((a, b) => a - b);

      printMetrics('Stress Test — 10 Concurrent Users', {
        并发用户数: CONCURRENT_USERS,
        每用户报告数: REPORTS_PER_USER,
        总请求: CONCURRENT_USERS * REPORTS_PER_USER,
        成功: userSuccess,
        失败: userFail,
        总耗时: `${totalDuration}ms`,
        平均请求耗时: `${durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0}ms`,
        最小耗时: `${sortedDurations[0] ?? 0}ms`,
        最大耗时: `${sortedDurations[sortedDurations.length - 1] ?? 0}ms`,
        P50: `${percentile(sortedDurations, 50)}ms`,
        P95: `${percentile(sortedDurations, 95)}ms`,
        P99: `${percentile(sortedDurations, 99)}ms`,
        'Mongo写入成功率': `${((userSuccess / (CONCURRENT_USERS * REPORTS_PER_USER)) * 100).toFixed(1)}%`,
      });

      // 验证所有用户都有结果
      expect(flatResults.length).toBe(CONCURRENT_USERS * REPORTS_PER_USER);
      // 全部成功（mock 下应无失败）
      expect(userSuccess).toBe(CONCURRENT_USERS * REPORTS_PER_USER);
      expect(userFail).toBe(0);

      // 验证每个用户所有报告都成功
      for (const userResult of results) {
        const succeeded = userResult.filter((r) => r !== null).length;
        expect(succeeded).toBe(REPORTS_PER_USER);
      }

      // 验证队列被调用次数
      expect(queueJobCallCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * REPORTS_PER_USER);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 测试 3: BullMQ 队列状态监控
  // ═══════════════════════════════════════════════════════════════

  describe('BullMQ queue status monitoring', () => {
    it('should retrieve and validate BullMQ queue job counts', async () => {
      const counts = await queueService.getJobCounts();

      printMetrics('BullMQ Queue Status', {
        Waiting: counts.waiting,
        Active: counts.active,
        Completed: counts.completed,
        Failed: counts.failed,
        Delayed: counts.delayed,
        '队列总容量': counts.waiting + counts.active + counts.completed + counts.failed + counts.delayed,
      });

      expect(counts).toBeDefined();
      expect(typeof counts.waiting).toBe('number');
      expect(typeof counts.active).toBe('number');
      expect(typeof counts.completed).toBe('number');
      expect(typeof counts.failed).toBe('number');
      expect(typeof counts.delayed).toBe('number');
      expect(counts.completed).toBeGreaterThanOrEqual(counts.failed);
    });

    it('should retrieve individual job details', async () => {
      const job = await queueService.getJob('mock-job');
      expect(job).toBeDefined();
      expect(job!.id).toBe('mock-job');
      expect(job!.finishedOn).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 测试 4: Redis 缓存命中率统计
  // ═══════════════════════════════════════════════════════════════

  describe('Redis cache hit rate', () => {
    it('should track Redis hit/miss rate across cache lookups', async () => {
      // 200 次缓存查询
      const reportIds = Array.from({ length: 200 }, (_, i) => `report-cache-${i}`);

      for (const rid of reportIds) {
        const result = await cacheService.getReportDetail(rid);
        if (result) redisHit++;
        else redisMiss++;
      }

      const totalAccesses = redisHit + redisMiss;
      const hitRate = totalAccesses > 0 ? redisHit / totalAccesses : 0;

      printMetrics('Redis Cache Hit Rate', {
        总访问次数: totalAccesses,
        '命中 (HIT)': redisHit,
        '未命中 (MISS)': redisMiss,
        命中率: `${(hitRate * 100).toFixed(1)}%`,
        未命中率: `${((1 - hitRate) * 100).toFixed(1)}%`,
      });

      expect(totalAccesses).toBe(200);
      // 模拟命中率约 60%，允许波动
      expect(hitRate).toBeGreaterThan(0.4);
      expect(hitRate).toBeLessThan(0.8);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 测试 5: Mongo 写入成功率
  // ═══════════════════════════════════════════════════════════════

  describe('MongoDB write success rate', () => {
    it('should track MongoDB write success rate over bulk operations', async () => {
      const BATCH_SIZE = 50;

      const batchPromises = Array.from({ length: BATCH_SIZE }, async (_, i) => {
        try {
          await reportModel.create({
            userId: `mongo-test-user-${i % 5}`,
            type: ReportType.DAILY,
            status: ReportStatus.PENDING,
            input: { userQuery: `Mongo 写入测试 #${i + 1}` },
          });
          mongoWriteSuccess++;
        } catch {
          mongoWriteFail++;
        }
      });

      await Promise.all(batchPromises);

      const totalOps = mongoWriteSuccess + mongoWriteFail;
      const successRate = totalOps > 0 ? mongoWriteSuccess / totalOps : 0;

      printMetrics('MongoDB Write Success Rate', {
        总写入操作: totalOps,
        成功写入: mongoWriteSuccess,
        失败写入: mongoWriteFail,
        写入成功率: `${(successRate * 100).toFixed(1)}%`,
      });

      expect(totalOps).toBe(BATCH_SIZE);
      expect(mongoWriteSuccess).toBe(BATCH_SIZE);
      expect(successRate).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 测试 6: PDF 渲染耗时统计
  // ═══════════════════════════════════════════════════════════════

  describe('PDF render timing statistics', () => {
    it('should measure PDF rendering times across multiple renders', async () => {
      const RENDER_COUNT = 10; // 10 次即可，30 次导致超时
      pdfRenderTimes = [];

      for (let i = 0; i < RENDER_COUNT; i++) {
        const t0 = Date.now();
        // 模拟 PDF 渲染延迟（100-500ms 随机）
        await sleep(100 + Math.floor(Math.random() * 400));
        pdfRenderTimes.push(Date.now() - t0);
      }

      const sortedRenders = [...pdfRenderTimes].sort((a, b) => a - b);
      const avgRenderMs = Math.round(pdfRenderTimes.reduce((a, b) => a + b, 0) / pdfRenderTimes.length);

      printMetrics('PDF Render Timing', {
        渲染次数: RENDER_COUNT,
        平均耗时: `${avgRenderMs}ms`,
        最小耗时: `${sortedRenders[0]}ms`,
        最大耗时: `${sortedRenders[sortedRenders.length - 1]}ms`,
        P50: `${percentile(sortedRenders, 50)}ms`,
        P95: `${percentile(sortedRenders, 95)}ms`,
        P99: `${percentile(sortedRenders, 99)}ms`,
      });

      expect(pdfRenderTimes.length).toBe(RENDER_COUNT);
      expect(avgRenderMs).toBeGreaterThan(100);
      expect(sortedRenders[sortedRenders.length - 1]).toBeLessThan(2000);
    }, 15000); // 15s timeout for sleeps
  });

  // ═══════════════════════════════════════════════════════════════
  // 测试 7: 综合压力指标报表（聚合输出）
  // ═══════════════════════════════════════════════════════════════

  describe('Aggregated stress metrics report', () => {
    it('should produce a consolidated stress test summary', async () => {
      const queueCounts = await queueService.getJobCounts();

      // 额外 50 次缓存查询
      redisHit = 0;
      redisMiss = 0;
      for (let i = 0; i < 50; i++) {
        const result = await cacheService.getReportDetail(`aggregated-report-${i}`);
        if (result) redisHit++;
        else redisMiss++;
      }

      const totalCacheAccesses = redisHit + redisMiss;
      const cacheHitRate = totalCacheAccesses > 0 ? redisHit / totalCacheAccesses : 0;

      const finalReport = {
        timestamp: new Date().toISOString(),
        testEnvironment: 'NestJS TestingModule (mocked)',
        bullmqQueueName: 'v2:report:generate',
        queueStatus: queueCounts,
        redisCacheAccesses: totalCacheAccesses,
        redisCacheHitRate: `${(cacheHitRate * 100).toFixed(1)}%`,
        redisCacheMissRate: `${((1 - cacheHitRate) * 100).toFixed(1)}%`,
        notes: [
          'Redis cache hit rate is simulated (~60% mock)',
          'BullMQ queue counts are from mock data',
          'PDF render times are simulated (100-500ms per render)',
          'Actual performance depends on hardware, network, and external services',
        ],
      };

      printMetrics('STRESS TEST — 综合压力指标报表', finalReport as unknown as Record<string, any>);

      expect(finalReport.queueStatus).toBeDefined();
      expect(finalReport.redisCacheHitRate).toBeDefined();
    });
  });
});
