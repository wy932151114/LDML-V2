// ============================================================
// DZS-OS V2 — Workflow Main Facade Service
// 工作流引擎主服务：组合所有子服务的统一入口
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import {
  Workflow,
  WorkflowDocument,
} from '@/database/mongoose/schemas/workflow.schema';
import {
  WorkflowExecution,
  WorkflowExecutionDocument,
} from '@/database/mongoose/schemas/workflow-execution.schema';

import { WorkflowRegistryService } from './workflow-registry.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowValidatorService } from './workflow-validator.service';
import { WorkflowSchedulerService } from './workflow-scheduler.service';

import type {
  WorkflowData,
  WorkflowTemplateData,
  WorkflowExecutionData,
  WorkflowNode,
  WorkflowEdge,
  WorkflowStatus,
  ExecutionStatus,
  WorkflowStats,
  ImportExportData,
} from '../interface/workflow.interface';

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly registryService: WorkflowRegistryService,

    @Inject(forwardRef(() => WorkflowExecutorService))
    private readonly executorService: WorkflowExecutorService,

    private readonly validatorService: WorkflowValidatorService,

    private readonly schedulerService: WorkflowSchedulerService,

    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,

    @InjectModel(WorkflowExecution.name)
    private readonly executionModel: Model<WorkflowExecutionDocument>,
  ) {}

  /* =================================================================
   * 工作流 CRUD
   * ================================================================= */

  /**
   * 创建新工作流
   */
  async create(
    data: Omit<WorkflowData, 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<WorkflowData> {
    const workflowData = {
      ...data,
      workflowId: data.workflowId ?? uuidv4(),
    };

    // 验证（如果提供了节点和边）
    if (workflowData.nodes && workflowData.nodes.length > 0 && workflowData.edges) {
      const validation = await this.validatorService.validate(
        workflowData.nodes as any,
        workflowData.edges as any,
      );
      if (!validation.valid) {
        throw new BadRequestException(
          `Workflow validation failed: ${validation.errors.map((e) => e.message).join('; ')}`,
        );
      }
    }

    return this.registryService.register(workflowData);
  }

  /**
   * 获取工作流
   */
  async get(workflowId: string): Promise<WorkflowData | null> {
    return this.registryService.get(workflowId);
  }

  /**
   * 获取所有工作流（支持分页筛选）
   */
  async list(filter?: {
    status?: WorkflowStatus;
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: WorkflowData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, keyword, page = 1, limit = 20 } = filter ?? {};

    if (keyword) {
      return this.registryService.search(keyword, { status, page, limit });
    }

    return this.registryService.getAll({ status, page, limit });
  }

  /**
   * 更新工作流
   */
  async update(
    workflowId: string,
    data: Partial<WorkflowData>,
  ): Promise<WorkflowData> {
    if (data.nodes || data.edges) {
      const existing = await this.registryService.get(workflowId);
      if (!existing) {
        throw new NotFoundException(`Workflow "${workflowId}" not found`);
      }

      const validation = await this.validatorService.validate(
        (data.nodes ?? existing.nodes) as any,
        (data.edges ?? existing.edges) as any,
      );
      if (!validation.valid) {
        throw new BadRequestException(
          `Workflow validation failed: ${validation.errors.map((e) => e.message).join('; ')}`,
        );
      }
    }

    const updated = await this.registryService.update(workflowId, data);
    if (!updated) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }
    return updated;
  }

  /**
   * 删除工作流
   */
  async delete(workflowId: string): Promise<void> {
    const deleted = await this.registryService.remove(workflowId);
    if (!deleted) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }
  }

  /* =================================================================
   * 工作流执行
   * ================================================================= */

  /**
   * 执行工作流
   */
  async execute(
    workflowId: string,
    input?: Record<string, unknown>,
  ): Promise<WorkflowExecutionData> {
    const workflow = await this.registryService.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }

    if (workflow.status !== 'active') {
      throw new BadRequestException(
        `Workflow "${workflowId}" is ${workflow.status}, must be "active" to execute`,
      );
    }

    // 执行前验证拓扑
    const validation = await this.validatorService.validate(
      workflow.nodes as any,
      workflow.edges as any,
    );
    if (!validation.valid) {
      throw new BadRequestException(
        `Cannot execute: validation failed — ${validation.errors.map((e) => e.message).join(', ')}`,
      );
    }

    return this.executorService.execute(workflowId, input ?? {});
  }

  /**
   * 停止执行
   */
  async stopExecution(executionId: string): Promise<void> {
    await this.executorService.stop(executionId);
  }

  /**
   * 获取执行记录列表
   */
  async getExecutions(filter?: {
    workflowId?: string;
    status?: ExecutionStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    items: WorkflowExecutionData[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.executorService.getExecutions(filter ?? {});
  }

  /**
   * 获取执行记录详情
   */
  async getExecutionDetail(executionId: string): Promise<WorkflowExecutionData> {
    const execution = await this.executorService.getExecution(executionId);
    if (!execution) {
      throw new NotFoundException(`Execution "${executionId}" not found`);
    }
    return execution;
  }

  /* =================================================================
   * 验证
   * ================================================================= */

  /**
   * 验证工作流
   */
  async validate(
    workflowId: string,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const result = await this.validatorService.validate(workflowId);
    return {
      valid: result.valid,
      errors: result.errors.map((e) => `[${e.code}] ${e.message}`),
      warnings: result.warnings.map((w) => `[${w.code}] ${w.message}`),
    };
  }

  /**
   * 直接验证节点和边（不查数据库）
   */
  async validateNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const result = await this.validatorService.validate(nodes as any, edges as any);
    return {
      valid: result.valid,
      errors: result.errors.map((e) => `[${e.code}] ${e.message}`),
      warnings: result.warnings.map((w) => `[${w.code}] ${w.message}`),
    };
  }

  /* =================================================================
   * 导入 / 导出
   * ================================================================= */

  /**
   * 导出工作流
   */
  async export(workflowId: string): Promise<ImportExportData> {
    const workflow = await this.registryService.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }

    return {
      version: '2.0.0',
      type: 'workflow',
      data: workflow as unknown as Record<string, unknown>,
      exportedAt: new Date(),
      exportedBy: workflow.createdBy,
    };
  }

  /**
   * 导入工作流
   */
  async import(data: ImportExportData): Promise<WorkflowData> {
    if (data.type !== 'workflow') {
      throw new BadRequestException(`Expected type "workflow", got "${data.type}"`);
    }

    const workflowData = data.data as unknown as WorkflowData;
    workflowData.workflowId = uuidv4();
    workflowData.status = 'draft';

    return this.registryService.register(workflowData);
  }

  /* =================================================================
   * 模板管理
   * ================================================================= */

  /**
   * 从工作流创建模板
   */
  async createTemplate(
    templateId: string,
    data: {
      name: string;
      description?: string;
      category?: string;
      tags?: string[];
      variables?: string[];
      createdBy?: string;
    },
  ): Promise<WorkflowTemplateData> {
    return this.registryService.createTemplate({
      templateId,
      name: data.name,
      description: data.description ?? '',
      category: data.category ?? '',
      nodes: [],
      edges: [],
      tags: data.tags ?? [],
      variables: data.variables ?? [],
      version: 1,
      isBuiltin: false,
      createdBy: data.createdBy ?? 'system',
    });
  }

  /**
   * 从现有工作流创建模板
   */
  async createFromWorkflow(
    workflowId: string,
    data: { name: string; description?: string; category?: string },
  ): Promise<WorkflowTemplateData> {
    const workflow = await this.registryService.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }

    const templateId = `tpl_${uuidv4().slice(0, 8)}`;
    return this.registryService.createTemplate({
      templateId,
      name: data.name,
      description: data.description ?? workflow.description,
      category: data.category ?? workflow.category,
      nodes: workflow.nodes as any,
      edges: workflow.edges as any,
      tags: workflow.tags ?? [],
      variables: [],
      version: 1,
      isBuiltin: false,
      createdBy: workflow.createdBy,
    });
  }

  /**
   * 从模板创建工作流
   */
  async createWorkflowFromTemplate(
    templateId: string,
    overrides?: { name?: string; description?: string },
  ): Promise<WorkflowData> {
    const template = await this.registryService.getTemplate(templateId);
    if (!template) {
      throw new NotFoundException(`Template "${templateId}" not found`);
    }

    return this.registryService.register({
      workflowId: uuidv4(),
      name: overrides?.name ?? template.name,
      description: overrides?.description ?? template.description,
      nodes: template.nodes as any,
      edges: template.edges as any,
      tags: [...template.tags],
      category: template.category,
      status: 'draft',
      createdBy: template.createdBy ?? 'system',
    });
  }

  /**
   * 获取模板列表
   */
  async getTemplates(options?: {
    category?: string;
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: WorkflowTemplateData[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.registryService.getTemplates(options ?? {});
  }

  /**
   * 获取模板详情
   */
  async getTemplateById(templateId: string): Promise<WorkflowTemplateData | null> {
    return this.registryService.getTemplate(templateId);
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const deleted = await this.registryService.removeTemplate(templateId);
    if (!deleted) {
      throw new NotFoundException(`Template "${templateId}" not found`);
    }
  }

  /**
   * 应用模板到已有工作流（用模板的节点和边替换）
   */
  async applyTemplate(workflowId: string, templateId: string): Promise<WorkflowData> {
    const template = await this.registryService.getTemplate(templateId);
    if (!template) {
      throw new NotFoundException(`Template "${templateId}" not found`);
    }

    const updated = await this.registryService.update(workflowId, {
      nodes: template.nodes as any,
      edges: template.edges as any,
    } as any);

    if (!updated) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }

    return updated;
  }

  /* =================================================================
   * 调度管理
   * ================================================================= */

  /**
   * 调度工作流（定时执行）
   */
  async scheduleWorkflow(
    workflowId: string,
    cron: string,
    options?: {
      input?: Record<string, unknown>;
      triggeredBy?: string;
    },
  ) {
    return this.schedulerService.schedule(workflowId, cron, options);
  }

  /**
   * 取消调度
   */
  async cancelSchedule(id: string): Promise<boolean> {
    return this.schedulerService.cancel(id);
  }

  /**
   * 获取所有调度任务
   */
  listSchedules() {
    return this.schedulerService.listSchedules();
  }

  /* =================================================================
   * 统计
   * ================================================================= */

  /**
   * 获取工作流统计
   */
  async getStats(): Promise<WorkflowStats> {
    const [allWorkflows, allExecutions] = await Promise.all([
      this.workflowModel.countDocuments().exec(),
      this.executionModel.find().exec(),
    ]);

    const activeWorkflows = await this.workflowModel
      .countDocuments({ status: 'active' })
      .exec();

    const totalExecutions = allExecutions.length;
    const completedExecutions = allExecutions.filter(
      (e) => e.status === 'completed',
    ).length;
    const failedExecutions = allExecutions.filter(
      (e) => e.status === 'failed',
    ).length;
    const runningExecutions = allExecutions.filter(
      (e) => e.status === 'running',
    ).length;

    const durations = allExecutions
      .filter((e) => e.durationMs != null)
      .map((e) => e.durationMs!);
    const averageDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // 按状态分组
    const executionsByStatus: Record<string, number> = {};
    for (const e of allExecutions) {
      const key = e.status ?? 'unknown';
      executionsByStatus[key] = (executionsByStatus[key] ?? 0) + 1;
    }

    // 按天分组
    const executionsByDayMap = new Map<string, number>();
    for (const e of allExecutions) {
      const day = e.createdAt.toISOString().slice(0, 10);
      executionsByDayMap.set(day, (executionsByDayMap.get(day) ?? 0) + 1);
    }
    const executionsByDay = Array.from(executionsByDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      totalWorkflows: allWorkflows,
      activeWorkflows,
      totalExecutions,
      completedExecutions,
      failedExecutions,
      runningExecutions,
      averageDuration,
      executionsByStatus,
      executionsByDay,
    };
  }
}
