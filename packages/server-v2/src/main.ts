import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('DZS-OS V2');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global prefix
  app.setGlobalPrefix('api');

  // ===================== Swagger / OpenAPI =====================
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DZS-OS V2 API')
    .setDescription('道之自然 DZS Operating System V2 — 商业化命理AI决策系统')
    .setVersion('2.0.0')
    .setContact('DZS Team', 'https://dzs-os.com', 'dev@dzs-os.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:5000', '本地开发')
    .addServer('https://api.dzs-os.com', '生产环境')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '输入 JWT Access Token',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key for external services',
      },
      'API-Key',
    )
    .addTag('Auth', '认证管理 — 登录/注册/Token刷新/密码重置')
    .addTag('Users', '用户管理 — 个人资料/配置/头像')
    .addTag('Health', '健康检查')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      url: '/api/docs-json',
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    customSiteTitle: 'DZS-OS V2 API Docs',
  });

  logger.log(`Swagger UI available at http://localhost:5000/api/docs`);

  // Start server
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 5000);
  const host = config.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);
  logger.log(`DZS-OS V2 running on http://${host}:${port}/api/v2`);
  logger.log(`OpenAPI spec at http://${host}:${port}/api/docs-json`);
}

bootstrap().catch((err) => {
  console.error('Failed to start DZS-OS V2:', err);
  process.exit(1);
});
