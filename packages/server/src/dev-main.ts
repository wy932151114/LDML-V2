// ============================================================
// DZS-OS 快速启动入口（开发调试用，无需MongoDB）
// ============================================================

import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { WebConsoleModule } from './modules/web-console/web-console.module';

@Module({
  imports: [WebConsoleModule],
})
class DevAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(DevAppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3333', 'http://172.31.138.38:3333'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  await app.listen(port);
  console.log(`🪷 DZS-OS API Server :${port}/api/v1`);
  console.log(`  验证: http://localhost:${port}/api/v1/validation/status`);
}

bootstrap();
