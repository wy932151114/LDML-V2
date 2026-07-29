// ============================================================
// DZS-OS V2 — ProviderConfigModule
// AI Provider 配置管理模块（独立模块）
// 导出 ProviderConfigService 供 AI Runtime 使用
// ============================================================

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProviderConfig,
  ProviderConfigSchema,
} from '@/database/mongoose/schemas';
import { ProviderConfigController } from './provider-config.controller';
import { ProviderConfigService } from './provider-config.service';
import { ProviderFactory } from '@/modules/ai-runtime/provider/provider.factory';
import { ProviderConnectionTester } from '@/modules/ai-runtime/provider/provider-tester';
import { AIRuntimeModule } from '@/modules/ai-runtime/ai-runtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProviderConfig.name, schema: ProviderConfigSchema },
    ]),
    forwardRef(() => AIRuntimeModule),
  ],
  controllers: [ProviderConfigController],
  providers: [
    ProviderConfigService,
    ProviderConnectionTester,
  ],
  exports: [
    ProviderConfigService,
    ProviderConnectionTester,
  ],
})
export class ProviderConfigModule {}
