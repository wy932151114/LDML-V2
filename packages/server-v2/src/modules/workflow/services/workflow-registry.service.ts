// ============================================================
// DZS-OS V2 — Workflow Registry Service
// 工作流注册中心：管理工作流与模板的注册、查询、搜索、种子化
// ============================================================

import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  WorkflowDocument,
} from '@/database/mongoose/schemas/workflow.schema';
import {
  WorkflowTemplate,
  WorkflowTemplateDocument,
} from '@/database/mongoose/schemas/workflow-template.schema';
import type {
  WorkflowNode,
  WorkflowEdge,
} from '@/database/mongoose/schemas/workflow.schema';
import type {
  WorkflowData,
  WorkflowTemplateData,
  WorkflowStatus,
} from '../interface/workflow.interface';

// ── 内置模板定义 ────────────────────────────────────────────────

interface BuiltInTemplate {
  templateId: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tags: string[];
  variables: string[];
}

const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    templateId: 'bazi-analysis-flow',
    name: '八字分析流程',
    description: '标准的八字命理分析工作流：接收用户信息 → 排盘 → AI 分析 → 生成报告',
    category: '命理分析',
    nodes: [
      { nodeId: 'start', type: 'Start' as any, label: '开始', position: { x: 100, y: 200 }, config: {} },
      { nodeId: 'input', type: 'AI_RUNTIME' as any, label: '解析用户输入', position: { x: 300, y: 200 }, config: { systemPrompt: '从用户输入中提取出生年月日时和性别信息' } },
      { nodeId: 'bazi-calc', type: 'PROMPT' as any, label: '八字排盘', position: { x: 500, y: 200 }, config: { promptId: 'bazi-calculation' } },
      { nodeId: 'ai-analysis', type: 'AI_RUNTIME' as any, label: 'AI 命理分析', position: { x: 700, y: 200 }, config: { systemPrompt: '基于八字排盘结果进行命理分析' } },
      { nodeId: 'report', type: 'REPORT' as any, label: '生成报告', position: { x: 900, y: 200 }, config: { format: 'markdown' } },
      { nodeId: 'end', type: 'End' as any, label: '结束', position: { x: 1100, y: 200 }, config: {} },
    ],
    edges: [
      { edgeId: 'e1', source: 'start', target: 'input' },
      { edgeId: 'e2', source: 'input', target: 'bazi-calc' },
      { edgeId: 'e3', source: 'bazi-calc', target: 'ai-analysis' },
      { edgeId: 'e4', source: 'ai-analysis', target: 'report' },
      { edgeId: 'e5', source: 'report', target: 'end' },
    ],
    tags: ['八字', '命理', '内置'],
    variables: ['birthYear', 'birthMonth', 'birthDay', 'birthHour', 'gender'],
  },
  {
    templateId: 'daily-fortune-flow',
    name: '每日运势流程',
    description: '每日运势分析工作流：获取用户信息 → 日柱计算 → 多维度运势分析 → 生成报告',
    category: '运势分析',
    nodes: [
      { nodeId: 'start', type: 'Start' as any, label: '开始', position: { x: 100, y: 300 }, config: {} },
      { nodeId: 'load-user', type: 'DATABASE' as any, label: '加载用户信息', position: { x: 300, y: 200 }, config: { operation: 'query', collection: 'users' } },
      { nodeId: 'calc-day', type: 'PROMPT' as any, label: '日柱计算', position: { x: 300, y: 400 }, config: { promptId: 'daily-stem-branch' } },
      { nodeId: 'fortune', type: 'AI_RUNTIME' as any, label: '运势生成', position: { x: 550, y: 300 }, config: { systemPrompt: '根据用户八字和当日日柱，生成当日运势分析' } },
      { nodeId: 'report', type: 'REPORT' as any, label: '生成日报', position: { x: 800, y: 300 }, config: { format: 'html' } },
      { nodeId: 'end', type: 'End' as any, label: '结束', position: { x: 1000, y: 300 }, config: {} },
    ],
    edges: [
      { edgeId: 'e1', source: 'start', target: 'load-user' },
      { edgeId: 'e2', source: 'load-user', target: 'calc-day' },
      { edgeId: 'e3', source: 'load-user', target: 'fortune' },
      { edgeId: 'e4', source: 'calc-day', target: 'fortune' },
      { edgeId: 'e5', source: 'fortune', target: 'report' },
      { edgeId: 'e6', source: 'report', target: 'end' },
    ],
    tags: ['运势', '日运', '内置'],
    variables: ['userId'],
  },
];

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class WorkflowRegistryService {
  private readonly logger = new Logger(WorkflowRegistryService.name);

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    @InjectModel(WorkflowTemplate.name)
    private readonly templateModel: Model<WorkflowTemplateDocument>,
  ) {
    this.seedBuiltInTemplates();
  }

  /* =================================================================
   * 种子化内置模板
   * ================================================================= */

  private async seedBuiltInTemplates(): Promise<void> {
    try {
      for (const tpl of BUILT_IN_TEMPLATES) {
        const exists = await this.templateModel
          .findOne({ templateId: tpl.templateId })
          .exec();
        if (!exists) {
          await this.templateModel.create({
            templateId: tpl.templateId,
            name: tpl.name,
            description: tpl.description,
            category: tpl.category,
            nodes: tpl.nodes,
            edges: tpl.edges,
            tags: tpl.tags,
            variables: tpl.variables,
            version: '1.0.0',
            isBuiltin: true,
            createdBy: 'system',
          });
          this.logger.log(`Seeded built-in template: ${tpl.templateId}`);
        }
      }
      this.logger.log(
        `Built-in template seeding complete (${BUILT_IN_TEMPLATES.length} entries)`,
      );
    } catch (err) {
      this.logger.warn(
        `Seed skipped (collection may not exist yet): ${(err as Error).message}`,
      );
    }
  }

  /* =================================================================
   * Workflow CRUD
   * ================================================================= */

  /**
   * 注册新工作流
   */
  async register(
    data: Omit<WorkflowData, 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<WorkflowData> {
    const existing = await this.workflowModel
      .findOne({ workflowId: data.workflowId })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Workflow "${data.workflowId}" already exists`,
      );
    }

    const created = await this.workflowModel.create({
      workflowId: data.workflowId,
      name: data.name,
      description: data.description ?? '',
      category: data.category ?? '',
      tags: data.tags ?? [],
      version: '1.0.0',
      status: data.status ?? 'draft',
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
      createdBy: data.createdBy ?? 'system',
    });

    this.logger.log(`Registered workflow: ${data.workflowId}`);
    return this.toWorkflowData(created);
  }

  /**
   * 按 workflowId 获取工作流
   */
  async get(workflowId: string): Promise<WorkflowData | null> {
    const doc = await this.workflowModel.findOne({ workflowId }).exec();
    return doc ? this.toWorkflowData(doc) : null;
  }

  /**
   * 获取所有工作流（支持筛选）
   */
  async getAll(query?: {
    status?: WorkflowStatus;
    category?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{
    items: WorkflowData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query?.status) filter.status = query.status;
    if (query?.category) filter.category = query.category;
    if (query?.tags?.length) filter.tags = { $in: query.tags };

    const [docs, total] = await Promise.all([
      this.workflowModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.workflowModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toWorkflowData(d)),
      total,
      page,
      limit,
    };
  }

  /**
   * 更新工作流
   */
  async update(
    workflowId: string,
    data: Partial<WorkflowData>,
  ): Promise<WorkflowData | null> {
    const updateData: Record<string, unknown> = { ...data };
    // Remove fields that should not be directly updated
    delete (updateData as any).workflowId;
    delete (updateData as any).createdAt;
    delete (updateData as any).createdBy;

    // Increment version on data change
    updateData.$inc = { version: 1 };

    const doc = await this.workflowModel
      .findOneAndUpdate({ workflowId }, { $set: updateData }, { new: true })
      .exec();
    return doc ? this.toWorkflowData(doc) : null;
  }

  /**
   * 删除工作流
   */
  async remove(workflowId: string): Promise<boolean> {
    const result = await this.workflowModel
      .deleteOne({ workflowId })
      .exec();
    if (result.deletedCount > 0) {
      this.logger.log(`Deleted workflow: ${workflowId}`);
      return true;
    }
    return false;
  }

  /**
   * 搜索工作流（关键词匹配 name / description / workflowId）
   */
  async search(
    keyword: string,
    options?: {
      status?: WorkflowStatus;
      category?: string;
      tags?: string[];
      page?: number;
      limit?: number;
    },
  ): Promise<{
    items: WorkflowData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      $or: [
        { workflowId: { $regex: keyword, $options: 'i' } },
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ],
    };

    if (options?.status) filter.status = options.status;
    if (options?.category) filter.category = options.category;
    if (options?.tags?.length) filter.tags = { $in: options.tags };

    const [docs, total] = await Promise.all([
      this.workflowModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.workflowModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toWorkflowData(d)),
      total,
      page,
      limit,
    };
  }

  /* =================================================================
   * Template CRUD
   * ================================================================= */

  /**
   * 获取所有模板（支持筛选分页）
   */
  async getTemplates(options?: {
    category?: string;
    keyword?: string;
    isBuiltin?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: WorkflowTemplateData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options?.category) filter.category = options.category;
    if (options?.isBuiltin !== undefined)
      filter.isBuiltin = options.isBuiltin;
    if (options?.keyword) {
      filter.$or = [
        { name: { $regex: options.keyword, $options: 'i' } },
        { description: { $regex: options.keyword, $options: 'i' } },
      ];
    }

    const [docs, total] = await Promise.all([
      this.templateModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.templateModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toTemplateData(d)),
      total,
      page,
      limit,
    };
  }

  /**
   * 按 templateId 获取模板
   */
  async getTemplate(templateId: string): Promise<WorkflowTemplateData | null> {
    const doc = await this.templateModel.findOne({ templateId }).exec();
    return doc ? this.toTemplateData(doc) : null;
  }

  /**
   * 创建模板
   */
  async createTemplate(
    data: Omit<WorkflowTemplateData, 'createdAt' | 'updatedAt'>,
  ): Promise<WorkflowTemplateData> {
    const existing = await this.templateModel
      .findOne({ templateId: data.templateId })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Template "${data.templateId}" already exists`,
      );
    }

    const created = await this.templateModel.create({
      templateId: data.templateId,
      name: data.name,
      description: data.description ?? '',
      category: data.category ?? '',
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
      tags: data.tags ?? [],
      variables: data.variables ?? [],
      version: '1.0.0',
      isBuiltin: data.isBuiltin ?? false,
      createdBy: data.createdBy ?? 'system',
    });

    this.logger.log(`Created template: ${data.templateId}`);
    return this.toTemplateData(created);
  }

  /**
   * 删除模板
   */
  async removeTemplate(templateId: string): Promise<boolean> {
    const result = await this.templateModel
      .deleteOne({ templateId })
      .exec();
    return result.deletedCount > 0;
  }

  /* =================================================================
   * 内置模板查询
   * ================================================================= */

  /** 获取内置模板列表（静态定义，不查数据库） */
  getBuiltInTemplateList(): BuiltInTemplate[] {
    return BUILT_IN_TEMPLATES;
  }

  getBuiltInTemplate(id: string): BuiltInTemplate | undefined {
    return BUILT_IN_TEMPLATES.find((t) => t.templateId === id);
  }

  /* =================================================================
   * 内部工具
   * ================================================================= */

  private toWorkflowData(doc: WorkflowDocument): WorkflowData {
    return {
      workflowId: doc.workflowId,
      name: doc.name,
      description: doc.description ?? '',
      nodes: (doc.nodes ?? []) as any,
      edges: (doc.edges ?? []) as any,
      status: doc.status as WorkflowStatus,
      version: parseInt(doc.version, 10) || 1,
      tags: doc.tags ?? [],
      category: doc.category ?? '',
      createdBy: doc.createdBy ?? '',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private toTemplateData(
    doc: WorkflowTemplateDocument,
  ): WorkflowTemplateData {
    return {
      templateId: doc.templateId,
      name: doc.name,
      description: doc.description ?? '',
      category: doc.category ?? '',
      nodes: (doc.nodes ?? []) as any,
      edges: (doc.edges ?? []) as any,
      tags: doc.tags ?? [],
      variables: doc.variables ?? [],
      version: parseInt(doc.version, 10) || 1,
      isBuiltin: doc.isBuiltin ?? false,
      createdBy: doc.createdBy ?? '',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
