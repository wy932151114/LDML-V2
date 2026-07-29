// ============================================================
// DZS-OS V2 — Report E2E 诊断测试
// 直接打印错误详情以定位 500 原因
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { ReportController } from '../src/modules/report/interface/report.controller';
import { ReportService } from '../src/modules/report/domain/report.service';
import { ReportQueueService } from '../src/modules/report/infrastructure/report-queue.service';
import { ReportCacheService } from '../src/modules/report/infrastructure/report-cache.service';
import { RendererService } from '../src/modules/report/renderer/renderer.service';
import {
  Report,
  ReportSchema,
} from '../src/database/mongoose/schemas/report.schema';
import {
  ReportQueue,
  ReportQueueSchema,
} from '../src/database/mongoose/schemas/report-queue.schema';

const TEST_USER_ID = 'e2e-test-user-000001';

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: TEST_USER_ID, email: 'test@dzs.local', role: 'user' };
    return true;
  }
}

const mockQueueService = {
  addJob: jest.fn().mockImplementation((data: any) => ({
    id: `job-${Date.now()}`,
  })),
  getJob: jest.fn().mockResolvedValue({ id: 'mock-job', finishedOn: Date.now() }),
  getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
  cancelJob: jest.fn().mockResolvedValue(true),
  retryJob: jest.fn().mockResolvedValue(true),
  getActiveJobsByType: jest.fn().mockResolvedValue([]),
  addBulkJobs: jest.fn().mockResolvedValue([]),
  drain: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getQueueName: jest.fn().mockReturnValue('report-queue'),
  onCompleted: jest.fn(),
  onFailed: jest.fn(),
  onProgress: jest.fn(),
};

const mockCacheService = {
  getReportDetail: jest.fn().mockResolvedValue(null),
  setReportDetail: jest.fn(),
  getReportList: jest.fn().mockResolvedValue(null),
  setReportList: jest.fn(),
  invalidateUserLists: jest.fn(),
  invalidateOnUpdate: jest.fn(),
  invalidateOnCreate: jest.fn(),
  invalidateOnDelete: jest.fn(),
  invalidateReportDetail: jest.fn(),
  setJobProgress: jest.fn(),
  getJobProgress: jest.fn(),
  clearJobProgress: jest.fn(),
};

describe('ReportController — 诊断', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();
    (global as any).__MONGOD__ = mongod;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
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
        { provide: RendererService, useValue: { render: jest.fn().mockResolvedValue({ content: '', format: 'json' }) } },
        { provide: 'APP_GUARD', useClass: MockJwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    const mongod = (global as any).__MONGOD__;
    if (mongod) await mongod.stop();
  });

  it('POST /api/v2/report/generate — should print error body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v2/report/generate')
      .send({ type: 'bazi' });

    console.log('STATUS:', res.status);
    console.log('BODY:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(202);
  }, 30000);
});
