// ============================================================
// DZS-OS V2 — Workflow Module
// 工作流引擎模块：注册所有服务、Controller 及所需的 Mongoose 模型
// ============================================================

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Workflow,
  WorkflowSchema,
  WorkflowExecution,
  WorkflowExecutionSchema,
  WorkflowTemplate,
  WorkflowTemplateSchema,
} from '@/database/mongoose/schemas';

import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './services/workflow.service';
import { WorkflowRegistryService } from './services/workflow-registry.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { WorkflowValidatorService } from './services/workflow-validator.service';
import { WorkflowSchedulerService } from './services/workflow-scheduler.service';

import { AIRuntimeModule } from '@/modules/ai-runtime/ai-runtime.module';
import { PromptCenterModule } from '@/modules/prompt-center/prompt-center.module';
import { ReportModule } from '@/modules/report/report.module';

@Module({
  imports: [
    // Mongoose feature models for Workflow Engine
    MongooseModule.forFeature([
      { name: Workflow.name, schema: WorkflowSchema },
      { name: WorkflowExecution.name, schema: WorkflowExecutionSchema },
      { name: WorkflowTemplate.name, schema: WorkflowTemplateSchema },
    ]),
    forwardRef(() => AIRuntimeModule),
    forwardRef(() => PromptCenterModule),
    ReportModule,
  ],
  controllers: [
    WorkflowController,
  ],
  providers: [
    WorkflowService,
    WorkflowRegistryService,
    WorkflowExecutorService,
    WorkflowValidatorService,
    WorkflowSchedulerService,
  ],
  exports: [
    WorkflowService,
    WorkflowRegistryService,
    WorkflowExecutorService,
    WorkflowValidatorService,
    WorkflowSchedulerService,
  ],
})
export class WorkflowModule {}
