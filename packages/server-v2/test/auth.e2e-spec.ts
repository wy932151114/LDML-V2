// ============================================================
// DZS-OS V2 — E2E 集成测试
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v2/auth/register', () => {
    it('should reject empty request body', () => {
      return request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);
    });

    it('should reject short password', () => {
      return request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send({ email: 'test@example.com', password: '123' })
        .expect(400);
    });
  });

  describe('POST /api/v2/auth/login', () => {
    it('should reject empty login request', () => {
      return request(app.getHttpServer())
        .post('/api/v2/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v2/auth/health', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v2/auth/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('dzs-os-v2');
          expect(res.body.version).toBe('2.0.0');
        });
    });
  });
});
