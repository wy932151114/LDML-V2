// ============================================================
// 道之自然·命理AI系统 — 根模块（Full Mode）
// 无数据库依赖，纯引擎计算 + API路由
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

// 核心引擎模块（无数据库依赖）
import { BaziModule } from './modules/bazi/bazi.module';
import { WuxingModule } from './modules/wuxing/wuxing.module';
import { JiugongModule } from './modules/jiugong/jiugong.module';
import { DayunModule } from './modules/dayun/dayun.module';
import { ShenshaModule } from './modules/shensha/shensha.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';

// Web Console API（统一路由出口）
import { WebConsoleModule } from './modules/web-console/web-console.module';

@Module({
  imports: [
    // 配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/daozhiguang_v2'),
      }),
    }),

    // 限流保护
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    // 核心引擎模块
    BaziModule,
    WuxingModule,
    JiugongModule,
    DayunModule,
    ShenshaModule,
    AiModule,

    // 认证模块（邮箱/手机注册登录、JWT）
    AuthModule,

    // Web Console API（所有6个端点由此提供）
    WebConsoleModule,
  ],
})
export class AppModule {}
