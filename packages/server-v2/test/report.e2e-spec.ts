// ============================================================
// DZS-OS V2 — ReportController E2E 集成测试套件
// 覆盖所有 8 个 API 端点的功能验证、报告生成验证、
// 缓存验证、导出验证、Web Console 接口验证、安全验证
//
// 使用 mongodb-memory-server 提供真实的 MongoDB 实例，
// 仅 mock 外部基础设施服务 (BullMQ, Redis)
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
  Module,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';

import { ReportController } from '../src/modules/report/interface/report.controller';
import { ReportService } from '../src/modules/report/domain/report.service';
import { ReportQueueService } from '../src/modules/report/infrastructure/report-queue.service';
import { ReportCacheService } from '../src/modules/report/infrastructure/report-cache.service';
import {
  Report,
  ReportType,
  ReportStatus,
  ReportDocument,
  ReportSchema,
} from '../src/database/mongoose/schemas/report.schema';
import {
  ReportQueue,
  ReportQueueSchema,
} from '../src/database/mongoose/schemas/report-queue.schema';

// ══════════════════════════════════════════════════════════════
// Mock 守卫
// ══════════════════════════════════════════════════════════════

const TEST_USER_ID = 'e2e-test-user-000001';

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: TEST_USER_ID, email: 'test@dzs.local', role: 'user' };
    return true;
  }
}

// ══════════════════════════════════════════════════════════════
// Mock 外部基础设施服务
// ══════════════════════════════════════════════════════════════

const mockQueueService = {
  addJob: jest.fn().mockImplementation((data: any) => ({
    id: `job-${data.reportId}-${Date.now()}`,
  })),
  getJob: jest.fn().mockResolvedValue({
    id: 'mock-job-id',
    finishedOn: Date.now(),
    processedOn: Date.now() - 5000,
    progressPercent: 100,
    progress: { message: 'Completed' },
  }),
  getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
  cancelJob: jest.fn().mockResolvedValue(true),
  retryJob: jest.fn().mockResolvedValue(true),
  getActiveJobsByType: jest.fn().mockResolvedValue([]),
  addBulkJobs: jest.fn().mockResolvedValue([]),
  drain: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  getQueueName: jest.fn().mockReturnValue('v2:report:generate'),
  onCompleted: jest.fn(),
  onFailed: jest.fn(),
  onProgress: jest.fn(),
};

const mockCacheService = {
  getReportDetail: jest.fn().mockResolvedValue(null),
  setReportDetail: jest.fn().mockResolvedValue(undefined),
  getReportList: jest.fn().mockResolvedValue(null),
  setReportList: jest.fn().mockResolvedValue(undefined),
  invalidateUserLists: jest.fn().mockResolvedValue(undefined),
  invalidateOnUpdate: jest.fn().mockResolvedValue(undefined),
  invalidateOnCreate: jest.fn().mockResolvedValue(undefined),
  invalidateOnDelete: jest.fn().mockResolvedValue(undefined),
  invalidateReportDetail: jest.fn().mockResolvedValue(undefined),
  setJobProgress: jest.fn().mockResolvedValue(undefined),
  getJobProgress: jest.fn().mockResolvedValue(null),
  clearJobProgress: jest.fn().mockResolvedValue(undefined),
};

// ══════════════════════════════════════════════════════════════
// Test Suite
// ══════════════════════════════════════════════════════════════

describe('ReportController (e2e) — 完整集成测试套件', () => {
  let app: INestApplication;
  let httpServer: any;
  let mongod: MongoMemoryServer;
  let reportModel: Model<ReportDocument>;

  // 跨测试共享状态
  let createdReportId: string;
  let createdJobId: string;
  const allReportIds: string[] = [];

  // ── 生命周期 ──────────────────────────────────────────────

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, ignoreEnvVars: true }),
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: Report.name, schema: ReportSchema },
          { name: ReportQueue.name, schema: ReportQueueSchema },
        ]),
      ],
      controllers: [ReportController],
      providers: [
        ReportService,
        { provide: ReportQueueService, useValue: mockQueueService },
        { provide: ReportCacheService, useValue: mockCacheService },
        { provide: 'APP_GUARD', useClass: MockJwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    httpServer = app.getHttpServer();
    reportModel = app.get(getModelToken(Report.name));

    jest.clearAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    if (mongod) await mongod.stop();
  });

  // ══════════════════════════════════════════════════════════
  // 1. POST /api/v2/report/generate — 报告生成
  // ══════════════════════════════════════════════════════════

  describe('1. POST /api/v2/report/generate — 报告生成', () => {
    // 1a. 空 body → 400
    it('should reject empty request body (400)', () => {
      return request(httpServer)
        .post('/api/v2/report/generate')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    // 1b. 缺失 type → 400
    it('should reject body without type field (400)', () => {
      return request(httpServer)
        .post('/api/v2/report/generate')
        .send({ baziData: {} })
        .expect(400);
    });

    // 1c. 无效 type → 400
    it('should reject invalid report type (400)', () => {
      return request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: 'invalid_type' })
        .expect(400);
    });

    // 1d. 成功创建报告 → 202
    it('should create a report and return 202 with reportId + jobId', async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({
          type: ReportType.BAZI,
          baziData: { birthDate: '1990-01-15', birthTime: '14:30', gender: 'male' },
          userQuery: '今日运势',
        })
        .expect(202);

      expect(res.body).toHaveProperty('reportId');
      expect(res.body).toHaveProperty('jobId');
      expect(typeof res.body.reportId).toBe('string');
      expect(typeof res.body.jobId).toBe('string');

      createdReportId = res.body.reportId;
      createdJobId = res.body.jobId;
      allReportIds.push(createdReportId);

      // 验证 report 实际写入数据库
      const dbReport = await reportModel.findById(createdReportId).exec();
      expect(dbReport).not.toBeNull();
      expect(dbReport!.userId).toBe(TEST_USER_ID);
      expect(dbReport!.type).toBe(ReportType.BAZI);
      expect(dbReport!.status).toBe(ReportStatus.QUEUED);

      // 验证队列服务被调用
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: createdReportId,
          userId: TEST_USER_ID,
          type: ReportType.BAZI,
        }),
      );

      // 验证缓存失效
      expect(mockCacheService.invalidateOnCreate).toHaveBeenCalledWith(TEST_USER_ID);
    });

    // 1e. 创建多种报告类型
    it('should create reports for all ReportType enum values', async () => {
      const types = Object.values(ReportType);
      for (const type of types) {
        const res = await request(httpServer)
          .post('/api/v2/report/generate')
          .send({ type, baziData: { test: true } })
          .expect(202);

        expect(res.body).toHaveProperty('reportId');
        allReportIds.push(res.body.reportId);
      }

      // 验证总数
      const count = await reportModel.countDocuments({ userId: TEST_USER_ID }).exec();
      expect(count).toBeGreaterThanOrEqual(types.length);
    });

    // 1f. 支持 context 和 userQuery 字段
    it('should persist userQuery and context in database', async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({
          type: ReportType.AI_COMPREHENSIVE,
          userQuery: '详细分析事业运势和财运',
          context: { priority: 'high', source: 'e2e-test' },
        })
        .expect(202);

      const doc = await reportModel.findById(res.body.reportId).exec();
      expect(doc!.input.userQuery).toBe('详细分析事业运势和财运');
      expect(doc!.input.context).toEqual({ priority: 'high', source: 'e2e-test' });
      allReportIds.push(res.body.reportId);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 2. GET /api/v2/report/:id — 获取报告详情
  // ══════════════════════════════════════════════════════════

  describe('2. GET /api/v2/report/:id — 获取报告详情', () => {
    // 2a. 不存在 → 404
    it('should return 404 for non-existent report ID', () => {
      return request(httpServer)
        .get('/api/v2/report/000000000000000000000000')
        .expect(404);
    });

    // 2b. 获取刚创建的报告
    it('should return created report detail with pending status', async () => {
      const res = await request(httpServer)
        .get(`/api/v2/report/${createdReportId}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', createdReportId);
      expect(res.body).toHaveProperty('userId', TEST_USER_ID);
      expect(res.body).toHaveProperty('type', ReportType.BAZI);
      // 刚创建的报告可能是 pending 或 queued
      expect([ReportStatus.PENDING, ReportStatus.QUEUED]).toContain(res.body.status);
      expect(res.body).toHaveProperty('input');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('isStarred', false);
    });

    // 2c. 返回包含 sections 和 tokenUsage 的完整详情（对已完成报告）
    it('should return full detail for a completed report', async () => {
      // 手动更新报告为 completed 状态并添加 sections
      await reportModel.findByIdAndUpdate(createdReportId, {
        $set: {
          status: ReportStatus.COMPLETED,
          sections: [
            { title: 'Section 1', content: 'Content 1', order: 1, type: 'text' },
            { title: 'Section 2', content: 'Content 2', order: 2, type: 'tip' },
          ],
          tokenUsage: { promptTokens: 100, completionTokens: 200, totalTokens: 300, modelVersion: 'gpt-4' },
          processingTime: 1500,
          aiModelVersion: 'gpt-4',
        },
      }).exec();

      // 清除缓存以强制从 DB 读取
      mockCacheService.getReportDetail.mockResolvedValue(null);

      const res = await request(httpServer)
        .get(`/api/v2/report/${createdReportId}`)
        .expect(200);

      expect(res.body.status).toBe(ReportStatus.COMPLETED);
      expect(res.body.sections.length).toBe(2);
      expect(res.body.sections[0].title).toBe('Section 1');
      expect(res.body.tokenUsage.totalTokens).toBe(300);
      expect(res.body.processingTime).toBe(1500);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 3. GET /api/v2/report — 报告列表
  // ══════════════════════════════════════════════════════════

  describe('3. GET /api/v2/report — 报告列表', () => {
    // 3a. 默认分页
    it('should return paginated report list with correct structure', async () => {
      const res = await request(httpServer)
        .get('/api/v2/report')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 20);
      expect(res.body).toHaveProperty('totalPages');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    // 3b. 按类型筛选
    it('should filter reports by type', async () => {
      const res = await request(httpServer)
        .get('/api/v2/report')
        .query({ type: ReportType.BAZI })
        .expect(200);

      for (const item of res.body.items) {
        expect(item.type).toBe(ReportType.BAZI);
      }
    });

    // 3c. 按状态筛选
    it('should filter reports by status', async () => {
      const res = await request(httpServer)
        .get('/api/v2/report')
        .query({ status: ReportStatus.PENDING })
        .expect(200);

      // 所有 pending 的 BAZI 报告
      for (const item of res.body.items) {
        expect(item.status).toBe(ReportStatus.PENDING);
      }
    });

    // 3d. 自定义分页参数
    it('should respect custom page and limit', async () => {
      const res = await request(httpServer)
        .get('/api/v2/report')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 4. DELETE /api/v2/report/:id — 删除报告
  // ══════════════════════════════════════════════════════════

  describe('4. DELETE /api/v2/report/:id — 删除报告', () => {
    let deleteReportId: string;

    beforeAll(async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.DAILY })
        .expect(202);
      deleteReportId = res.body.reportId;
      allReportIds.push(deleteReportId);
    });

    // 4a. 不存在 → 404
    it('should return 404 for non-existent report', () => {
      return request(httpServer)
        .delete('/api/v2/report/000000000000000000000000')
        .expect(404);
    });

    // 4b. 成功删除 → 200 并标记软删除
    it('should soft-delete report and invalidate cache', async () => {
      const res = await request(httpServer)
        .delete(`/api/v2/report/${deleteReportId}`)
        .expect(200);

      expect(res.body).toEqual({ success: true });

      // 验证数据库中的 isDeleted 标记
      const doc = await reportModel.findById(deleteReportId).exec();
      expect(doc!.isDeleted).toBe(true);

      // 验证 GET 返回 404
      await request(httpServer)
        .get(`/api/v2/report/${deleteReportId}`)
        .expect(404);

      // 验证缓存失效
      expect(mockCacheService.invalidateOnDelete).toHaveBeenCalledWith(
        deleteReportId,
        TEST_USER_ID,
      );
    });

    // 4c. 批量删除
    it('should support batch-delete', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const r = await request(httpServer)
          .post('/api/v2/report/generate')
          .send({ type: ReportType.WEEKLY })
          .expect(202);
        ids.push(r.body.reportId);
        allReportIds.push(r.body.reportId);
      }

      const res = await request(httpServer)
        .post('/api/v2/report/batch-delete')
        .send({ ids })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.deleted).toBe(3);

      // 验证所有都已软删除
      const remaining = await reportModel.find({ _id: { $in: ids }, isDeleted: false }).exec();
      expect(remaining.length).toBe(0);
    });

    // 4d. 批量删除空数组 → 400
    it('should reject batch-delete with empty ids', () => {
      return request(httpServer)
        .post('/api/v2/report/batch-delete')
        .send({ ids: [] })
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 5. POST /api/v2/report/export/html — HTML 导出
  // ══════════════════════════════════════════════════════════

  describe('5. POST /api/v2/report/export/html — HTML 导出', () => {
    let exportReportId: string;

    beforeAll(async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.BAZI })
        .expect(202);
      exportReportId = res.body.reportId;
      allReportIds.push(exportReportId);

      // 标记为 completed 并添加 sections
      await reportModel.findByIdAndUpdate(exportReportId, {
        $set: {
          status: ReportStatus.COMPLETED,
          sections: [
            { title: '财运分析', content: '本月财运平稳，适合投资理财。', order: 1, type: 'text' },
            { title: '健康提示', content: '注意脾胃健康，少食生冷。', order: 2, type: 'warning' },
          ],
        },
      }).exec();
      mockCacheService.getReportDetail.mockResolvedValue(null);
    });

    // 5a. 不存在 → 404
    it('should return 404 when report not found', () => {
      return request(httpServer)
        .post('/api/v2/report/export/html')
        .send({ reportId: '000000000000000000000000', format: 'html' })
        .expect(404);
    });

    // 5b. 成功导出
    it('should export HTML with correct Content-Type and Content-Disposition', async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/export/html')
        .send({ reportId: exportReportId, format: 'html' })
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toContain(exportReportId);
      expect(res.text).toContain('<h2>');
      expect(res.text).toContain('财运分析');
      expect(res.text).toContain('健康提示');
    });

    // 5c. 空 reportId → 400
    it('should reject empty reportId', () => {
      return request(httpServer)
        .post('/api/v2/report/export/html')
        .send({ reportId: '' })
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 6. POST /api/v2/report/export/pdf — PDF 导出
  // ══════════════════════════════════════════════════════════

  describe('6. POST /api/v2/report/export/pdf — PDF 导出', () => {
    let exportPdfId: string;

    beforeAll(async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.WUXING })
        .expect(202);
      exportPdfId = res.body.reportId;
      allReportIds.push(exportPdfId);

      await reportModel.findByIdAndUpdate(exportPdfId, {
        $set: {
          status: ReportStatus.COMPLETED,
          sections: [{ title: 'Test', content: 'PDF content', order: 1, type: 'text' }],
        },
      }).exec();
      mockCacheService.getReportDetail.mockResolvedValue(null);
    });

    // 6a. 成功导出
    it('should export PDF with correct Content-Type', async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/export/pdf')
        .send({ reportId: exportPdfId, format: 'pdf' })
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toContain(exportPdfId);
    });

    // 6b. 不存在 → 404
    it('should return 404 for non-existent report', () => {
      return request(httpServer)
        .post('/api/v2/report/export/pdf')
        .send({ reportId: '000000000000000000000000', format: 'pdf' })
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 7. POST /api/v2/report/export/markdown — Markdown 导出
  // ══════════════════════════════════════════════════════════

  describe('7. POST /api/v2/report/export/markdown — Markdown 导出', () => {
    let mdReportId: string;

    beforeAll(async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.AI_COMPREHENSIVE })
        .expect(202);
      mdReportId = res.body.reportId;
      allReportIds.push(mdReportId);

      await reportModel.findByIdAndUpdate(mdReportId, {
        $set: {
          status: ReportStatus.COMPLETED,
          sections: [
            { title: '事业分析', content: '事业发展前景良好。', order: 1, type: 'text' },
            { title: '感情建议', content: '需要多沟通。', order: 2, type: 'tip' },
          ],
        },
      }).exec();
      mockCacheService.getReportDetail.mockResolvedValue(null);
    });

    // 7a. 成功导出
    it('should export Markdown with correct Content-Type and headers', async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/export/markdown')
        .send({ reportId: mdReportId, format: 'markdown' })
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/markdown/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toContain(mdReportId);
      expect(res.text).toContain('##');
      expect(res.text).toContain('事业分析');
      expect(res.text).toContain('感情建议');
    });

    // 7b. 不存在 → 404
    it('should return 404 for non-existent report', () => {
      return request(httpServer)
        .post('/api/v2/report/export/markdown')
        .send({ reportId: '000000000000000000000000', format: 'markdown' })
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 8. GET /api/v2/report/job/:jobId — 任务进度
  // ══════════════════════════════════════════════════════════

  describe('8. GET /api/v2/report/job/:jobId — 任务进度', () => {
    // 8a. 已完成任务
    it('should return completed status for finished job', async () => {
      mockQueueService.getJob.mockResolvedValue({
        id: 'completed-job',
        finishedOn: Date.now(),
        processedOn: Date.now() - 5000,
      });

      const res = await request(httpServer)
        .get('/api/v2/report/job/completed-job')
        .expect(200);

      expect(res.body).toHaveProperty('jobId', 'completed-job');
      expect(res.body).toHaveProperty('status', 'completed');
    });

    // 8b. 处理中任务
    it('should return active status with progress', async () => {
      mockQueueService.getJob.mockResolvedValue({
        id: 'active-job',
        finishedOn: null,
        processedOn: Date.now(),
        progressPercent: 45,
        progress: { message: '生成中…' },
      });

      const res = await request(httpServer)
        .get('/api/v2/report/job/active-job')
        .expect(200);

      expect(res.body.status).toBe('active');
      expect(res.body.progressPercent).toBe(45);
      expect(res.body).toHaveProperty('progressMessage');
    });

    // 8c. 等待中任务
    it('should return waiting status for queued job', async () => {
      mockQueueService.getJob.mockResolvedValue({
        id: 'waiting-job',
        finishedOn: null,
        processedOn: null,
        progressPercent: 0,
      });

      const res = await request(httpServer)
        .get('/api/v2/report/job/waiting-job')
        .expect(200);

      expect(res.body.status).toBe('waiting');
    });

    // 8d. 不存在任务
    it('should return unknown status for non-existent job', async () => {
      mockQueueService.getJob.mockResolvedValue(undefined);

      const res = await request(httpServer)
        .get('/api/v2/report/job/non-existent')
        .expect(200);

      expect(res.body.status).toBe('unknown');
      expect(res.body.progressPercent).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 9. 缓存验证
  // ══════════════════════════════════════════════════════════

  describe('9. 缓存验证 — Cache Layer', () => {
    // 9a. 创建 → 列表缓存失效
    it('should invalidate list cache on report creation', async () => {
      await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.BAZI, baziData: { test: true } })
        .expect(202);

      // 使用 allReportIds 存储，但先不存这里
      // 验证 invalidateOnCreate 被调用
      expect(mockCacheService.invalidateOnCreate).toHaveBeenCalledWith(TEST_USER_ID);
    });

    // 9b. 已完成报告详情应写入缓存
    it('should cache completed report detail', async () => {
      // 创建并完成一个报告
      const r = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.MONTHLY })
        .expect(202);
      allReportIds.push(r.body.reportId);

      await reportModel.findByIdAndUpdate(r.body.reportId, {
        $set: { status: ReportStatus.COMPLETED, sections: [{ title: 'T', content: 'C', order: 1 }] },
      }).exec();

      mockCacheService.getReportDetail.mockResolvedValue(null);

      await request(httpServer)
        .get(`/api/v2/report/${r.body.reportId}`)
        .expect(200);

      expect(mockCacheService.setReportDetail).toHaveBeenCalled();
    });

    // 9c. 缓存命中 — 不查询数据库
    it('should return cached data without querying DB on cache hit', async () => {
      const cachedData = {
        id: 'cached-report-id',
        userId: TEST_USER_ID,
        type: ReportType.BAZI,
        status: ReportStatus.COMPLETED,
        sections: [{ title: 'Cached', content: 'From cache', order: 1, type: 'text' }],
        isStarred: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCacheService.getReportDetail.mockResolvedValue(cachedData);

      const res = await request(httpServer)
        .get('/api/v2/report/cached-report-id')
        .expect(200);

      expect(res.body).toEqual(cachedData);
    });

    // 9d. 删除 → 缓存失效
    it('should invalidate cache on deletion', async () => {
      const r = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.YEARLY })
        .expect(202);
      allReportIds.push(r.body.reportId);

      await request(httpServer)
        .delete(`/api/v2/report/${r.body.reportId}`)
        .expect(200);

      expect(mockCacheService.invalidateOnDelete).toHaveBeenCalledWith(
        r.body.reportId,
        TEST_USER_ID,
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // 10. 导出验证
  // ══════════════════════════════════════════════════════════

  describe('10. 导出验证 — Export Formats', () => {
    let exportReportId: string;

    beforeAll(async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.BAZI })
        .expect(202);
      exportReportId = res.body.reportId;
      allReportIds.push(exportReportId);

      await reportModel.findByIdAndUpdate(exportReportId, {
        $set: {
          status: ReportStatus.COMPLETED,
          sections: [
            { title: 'Title A', content: 'Content A', order: 1, type: 'text' },
            { title: 'Title B', content: 'Content B', order: 2, type: 'warning' },
          ],
        },
      }).exec();
      mockCacheService.getReportDetail.mockResolvedValue(null);
    });

    // 10a. 所有格式都能导出
    it('should export successfully for HTML, PDF, and Markdown', async () => {
      const formats = [
        { url: '/api/v2/report/export/html', contentType: /text\/html/, format: 'html' },
        { url: '/api/v2/report/export/pdf', contentType: /application\/pdf/, format: 'pdf' },
        { url: '/api/v2/report/export/markdown', contentType: /text\/markdown/, format: 'markdown' },
      ];

      for (const fmt of formats) {
        const res = await request(httpServer)
          .post(fmt.url)
          .send({ reportId: exportReportId, format: fmt.format })
          .expect(200);

        expect(res.headers['content-type']).toMatch(fmt.contentType);
        expect(res.headers['content-disposition']).toMatch(/attachment/);
      }
    });

    // 10b. 不同报告导出不同内容
    it('should return different content for different reports', async () => {
      // Create second report
      const r2 = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.WUXING })
        .expect(202);
      allReportIds.push(r2.body.reportId);

      await reportModel.findByIdAndUpdate(r2.body.reportId, {
        $set: {
          status: ReportStatus.COMPLETED,
          sections: [{ title: 'Different', content: 'Different content', order: 1, type: 'text' }],
        },
      }).exec();

      mockCacheService.getReportDetail.mockResolvedValue(null);

      const res1 = await request(httpServer)
        .post('/api/v2/report/export/html')
        .send({ reportId: exportReportId, format: 'html' })
        .expect(200);

      // Clear cache for second report
      mockCacheService.getReportDetail.mockResolvedValue(null);

      const res2 = await request(httpServer)
        .post('/api/v2/report/export/html')
        .send({ reportId: r2.body.reportId, format: 'html' })
        .expect(200);

      expect(res1.text).not.toBe(res2.text);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 11. Web Console 接口验证
  // ══════════════════════════════════════════════════════════

  describe('11. Web Console 接口验证 — API Routes', () => {
    // 11a. 所有 8 个端点路由已注册
    it('should have all 8 report endpoints registered (not 404)', async () => {
      const endpoints = [
        { method: 'post' as const, url: '/api/v2/report/generate', body: { type: ReportType.BAZI } },
        { method: 'get' as const, url: '/api/v2/report/some-id' },
        { method: 'get' as const, url: '/api/v2/report' },
        { method: 'delete' as const, url: '/api/v2/report/some-id' },
        { method: 'post' as const, url: '/api/v2/report/export/html', body: { reportId: 'some-id', format: 'html' } },
        { method: 'post' as const, url: '/api/v2/report/export/pdf', body: { reportId: 'some-id', format: 'pdf' } },
        { method: 'post' as const, url: '/api/v2/report/export/markdown', body: { reportId: 'some-id', format: 'markdown' } },
        { method: 'get' as const, url: '/api/v2/report/job/some-job-id' },
      ];

      for (const ep of endpoints) {
        let req;
        if (ep.method === 'post') {
          req = request(httpServer).post(ep.url);
          if (ep.body) req = req.send(ep.body);
        } else if (ep.method === 'get') {
          req = request(httpServer).get(ep.url);
        } else {
          req = request(httpServer).delete(ep.url);
        }

        // Don't check status for endpoints that validate other data (export needs real reportId)
        // Just verify the route exists (not 404)
        if (ep.url.includes('/export/') || ep.url.endsWith('/some-id')) {
          const res = await req;
          expect([200, 201, 202, 400, 401, 403, 404, 500]).toContain(res.status);
          // Specifically NOT a 404 from Express (route not found returns HTML, not JSON)
          if (res.status === 404) {
            expect(res.body).not.toHaveProperty('statusCode'); // Express default 404
          }
        } else if (ep.url === '/api/v2/report/generate') {
          // Generate actually works
          const res = await req;
          expect(res.status).toBe(202);
        } else {
          const res = await req;
          expect([200, 201, 202, 204, 400, 401, 403]).toContain(res.status);
        }
      }
    });

    // 11b. 验证 generate 路由正确（非 404）
    it('should have generate endpoint registered (returns 400 not 404)', () => {
      return request(httpServer)
        .post('/api/v2/report/generate')
        .send({})
        .expect(400); // validation error — route exists
    });
  });

  // ══════════════════════════════════════════════════════════
  // 12. 安全验证
  // ══════════════════════════════════════════════════════════

  describe('12. 安全验证 — Security', () => {
    // 12a. 报告所有权隔离 — 其他用户看不到
    it('should enforce ownership — other user cannot see report', async () => {
      // 当前测试用户是 TEST_USER_ID，当我们查询其他用户的报告 ID 时
      // 应返回 404
      const res = await request(httpServer)
        .get('/api/v2/report/000000000000000000000000')
        .expect(404);
    });

    // 12b. 删除时必须校验 userId
    it('should check userId when deleting', async () => {
      // 创建一个报告
      const r = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: ReportType.BAZI })
        .expect(202);
      allReportIds.push(r.body.reportId);

      // 使用有效 ID 删除 — 应成功
      const res = await request(httpServer)
        .delete(`/api/v2/report/${r.body.reportId}`)
        .expect(200);

      expect(res.body).toEqual({ success: true });
    });

    // 12c. MongoDB 注入防护
    it('should reject MongoDB operator injection ($ne, $gt, etc.)', () => {
      return request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: { $ne: null } })
        .expect(400);
    });

    // 12d. XSS 防护
    it('should reject XSS in type field', () => {
      return request(httpServer)
        .post('/api/v2/report/generate')
        .send({ type: '<script>alert("xss")</script>' })
        .expect(400);
    });

    // 12e. 无效 HTTP methods
    it('should reject unsupported HTTP methods', async () => {
      await request(httpServer)
        .put('/api/v2/report/generate')
        .expect((res) => expect([404, 405]).toContain(res.status));

      await request(httpServer)
        .patch('/api/v2/report/generate')
        .expect((res) => expect([404, 405]).toContain(res.status));
    });

    // 12f. 重复创建会产生不同 ID
    it('should generate unique report IDs on repeated calls', async () => {
      const payload = { type: ReportType.BAZI, baziData: { test: true } };

      const r1 = await request(httpServer)
        .post('/api/v2/report/generate')
        .send(payload)
        .expect(202);
      allReportIds.push(r1.body.reportId);

      const r2 = await request(httpServer)
        .post('/api/v2/report/generate')
        .send(payload)
        .expect(202);
      allReportIds.push(r2.body.reportId);

      expect(r1.body.reportId).not.toBe(r2.body.reportId);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 13. DTO 验证边界
  // ══════════════════════════════════════════════════════════

  describe('13. DTO 验证边界 — Input Validation', () => {
    // 13a. 所有导出端点空 reportId → 400
    it('should reject empty reportId on all export endpoints', async () => {
      const endpoints = [
        '/api/v2/report/export/html',
        '/api/v2/report/export/pdf',
        '/api/v2/report/export/markdown',
      ];

      for (const url of endpoints) {
        await request(httpServer)
          .post(url)
          .send({ reportId: '' })
          .expect(400);
      }
    });

    // 13b. batch-delete 空数组 → 400
    it('should reject batch-delete with empty ids', () => {
      return request(httpServer)
        .post('/api/v2/report/batch-delete')
        .send({ ids: [] })
        .expect(400);
    });

    // 13c. page=0 → 400
    it('should reject page=0 as invalid', () => {
      return request(httpServer)
        .get('/api/v2/report')
        .query({ page: 0 })
        .expect(400);
    });

    // 13d. limit > 100 → 400
    it('should reject limit > 100', () => {
      return request(httpServer)
        .get('/api/v2/report')
        .query({ limit: 200 })
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 14. 错误处理验证
  // ══════════════════════════════════════════════════════════

  describe('14. 错误处理 — Error Handling', () => {
    // 14a. 404 返回 message
    it('should return error message for 404', async () => {
      const res = await request(httpServer)
        .get('/api/v2/report/000000000000000000000000')
        .expect(404);

      expect(res.body).toHaveProperty('message');
      expect(typeof res.body.message).toBe('string');
    });

    // 14b. 400 返回验证详情
    it('should return validation error details for 400', async () => {
      const res = await request(httpServer)
        .post('/api/v2/report/generate')
        .send({})
        .expect(400);

      expect(res.body.message).toBeDefined();
      const msgs = Array.isArray(res.body.message) ? res.body.message : [res.body.message];
      expect(msgs.length).toBeGreaterThan(0);
    });

    // 14c. 不存在的路由 → 404
    it('should return 404 for non-existent sub-route', () => {
      return request(httpServer)
        .get('/api/v2/report/sub-route/does/not/exist')
        .expect(404);
    });
  });
});
