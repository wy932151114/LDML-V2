// ============================================================
// 道之自然·命理AI系统 — 单一入口点（Full Mode Only）
// 无数据库依赖 · 纯引擎 · 所有API来自WebConsoleController
// ============================================================

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn'],
    abortOnError: false,
  });

  // 全局路由前缀
  app.setGlobalPrefix('api/v1');

  // CORS — 允许局域网访问
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port, '0.0.0.0');

  console.log(`
  ┌─────────────────────────────────────────────┐
  │  🚀 龙道命理计算游戏 (Full Mode) 已启动!      │
  │  ═══════════════════════════════════════════ │
  │  📡 API: http://localhost:${port}/api/v1       │
  │  🌐 CORS: 已启用（局域网可访问）               │
  │  💾 数据库: 无（纯引擎模式）                    │
  │  ───────────────────────────────────────── │
  │  📋 可用API端点:                              │
  │     POST /bazi/calculate    八字排盘          │
  │     POST /energy/analyze    五行能量          │
  │     POST /nine-palace/cal   九宫飞星          │
  │     POST /ai/generate       AI生成            │
  │     POST /cv/analyze        CV扫描            │
  │     GET  /validation/status 验证状态          │
  └─────────────────────────────────────────────┘`);
}

bootstrap().catch((e: any) => {
  console.error('❌ 启动失败:', e.message);
  process.exit(1);
});
