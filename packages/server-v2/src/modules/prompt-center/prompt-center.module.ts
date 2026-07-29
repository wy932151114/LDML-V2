/* =========================================================================
 * PromptCenterModule — Prompt Center 模块
 *
 * 注册所有 Prompt Center 服务、Controller 以及所需的 Mongoose 模型。
 * ========================================================================= */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Prompt,
  PromptSchema,
  PromptVersion,
  PromptVersionSchema,
} from '@/database/mongoose/schemas';

import { PromptCenterController } from './prompt-center.controller';
import { PromptCenterService } from './services/prompt-center.service';
import { PromptRegistryService } from './services/prompt-registry.service';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptVariableService } from './services/prompt-variable.service';
import { PromptPlaygroundService } from './prompt-playground.service';
import { AIRuntimeModule } from '@/modules/ai-runtime/ai-runtime.module';

@Module({
  imports: [
    // Mongoose feature models
    MongooseModule.forFeature([
      { name: Prompt.name, schema: PromptSchema },
      { name: PromptVersion.name, schema: PromptVersionSchema },
    ]),
    AIRuntimeModule,
  ],
  controllers: [PromptCenterController],
  providers: [
    PromptCenterService,
    PromptRegistryService,
    PromptVersionService,
    PromptVariableService,
    PromptPlaygroundService,
  ],
  exports: [
    PromptCenterService,
    PromptRegistryService,
    PromptVersionService,
    PromptVariableService,
    PromptPlaygroundService,
  ],
})
export class PromptCenterModule {}
