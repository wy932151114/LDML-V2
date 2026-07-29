// ============================================================
// DZS-OS V2 — Prompt Registry Service
// 提示词注册中心服务：管理 Prompt 的注册、查找、编译渲染
// ============================================================

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prompt, PromptDocument } from '@/database/mongoose/schemas/prompt.schema';
import {
  PromptData,
  PromptCategory,
  PromptStatus,
  PromptRenderContext,
  CompiledPrompt,
} from '../interface/prompt.interface';
import {
  getTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  listByCategory as listTemplatesByCategory,
  PromptTemplateEntry,
} from '../templates/index';

// ── 简单的变量替换工具 ──────────────────────────────────────────

/**
 * 将 {{variable}} 占位符替换为实际值
 * 未提供的变量保留原始占位符
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
}

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class PromptRegistryService {
  private readonly logger = new Logger(PromptRegistryService.name);

  constructor(
    @InjectModel(Prompt.name)
    private readonly promptModel: Model<PromptDocument>,
  ) {
    this.seedBuiltInTemplates();
  }

  /* -----------------------------------------------------------------
   * 启动时种子化内置模板
   * ----------------------------------------------------------------- */

  private async seedBuiltInTemplates(): Promise<void> {
    try {
      const builtIn = getAllTemplates();
      for (const entry of builtIn) {
        const exists = await this.promptModel.findOne({ promptId: entry.id }).exec();
        if (!exists) {
          await this.promptModel.create({
            promptId: entry.id,
            name: entry.name,
            category: entry.category as PromptCategory,
            tags: entry.tags ?? [],
            provider: entry.recommendedProvider ?? 'openai',
            model: entry.recommendedModel ?? 'gpt-4o',
            version: entry.version,
            status: 'active' as PromptStatus,
            isLatest: true,
            description: entry.description,
            variables: entry.variables,
            template: entry.rawTemplate,
            maxTokens: entry.maxTokens ?? 4096,
            sortOrder: entry.sortOrder ?? 0,
            createdBy: 'system',
          });
          this.logger.log(`Seeded built-in template: ${entry.id}`);
        }
      }
      this.logger.log(`Built-in template seeding complete (${builtIn.length} entries)`);
    } catch (err) {
      // 非首次启动时 collection 可能尚不存在，静默处理
      this.logger.warn(`Seed skipped (likely already seeded): ${(err as Error).message}`);
    }
  }

  /* -----------------------------------------------------------------
   * CRUD
   * ----------------------------------------------------------------- */

  /**
   * 注册新 Prompt
   */
  async register(data: Omit<PromptData, 'createdAt' | 'updatedAt'>): Promise<PromptData> {
    const existing = await this.promptModel.findOne({ promptId: data.promptId }).exec();
    if (existing) {
      throw new ConflictException(`Prompt "${data.promptId}" already exists`);
    }

    const created = await this.promptModel.create({
      promptId: data.promptId,
      name: data.name,
      category: data.category,
      tags: data.tags ?? [],
      provider: data.provider ?? 'openai',
      model: data.model ?? 'gpt-4o',
      version: data.version ?? '1.0.0',
      status: data.status ?? 'active',
      isLatest: data.isLatest ?? true,
      description: data.description ?? '',
      variables: data.variables ?? [],
      template: data.template,
      maxTokens: data.maxTokens ?? 4096,
      sortOrder: data.sortOrder ?? 0,
      createdBy: data.createdBy ?? 'system',
    });

    this.logger.log(`Registered prompt: ${data.promptId}`);
    return this.toData(created);
  }

  /**
   * 按 promptId 获取当前版本的 Prompt
   */
  async get(promptId: string): Promise<PromptData | null> {
    const doc = await this.promptModel.findOne({ promptId }).exec();
    return doc ? this.toData(doc) : null;
  }

  /**
   * 获取所有 Prompt
   */
  async getAll(): Promise<PromptData[]> {
    const docs = await this.promptModel.find().sort({ sortOrder: 1 }).exec();
    return docs.map((d) => this.toData(d));
  }

  /**
   * 按分类获取 Prompt
   */
  async listByCategory(category: PromptCategory): Promise<PromptData[]> {
    const docs = await this.promptModel
      .find({ category })
      .sort({ sortOrder: 1 })
      .exec();
    return docs.map((d) => this.toData(d));
  }

  /**
   * 按分类分组（使用内置模板的 listByCategory + 数据库数据）
   */
  async listGroupedByCategory(): Promise<Record<PromptCategory, PromptData[]>> {
    const all = await this.getAll();
    const result = {} as Record<PromptCategory, PromptData[]>;
    for (const p of all) {
      if (!result[p.category]) result[p.category] = [];
      result[p.category].push(p);
    }
    return result;
  }

  /**
   * 更新 Prompt
   */
  async update(promptId: string, data: Partial<PromptData>): Promise<PromptData | null> {
    const doc = await this.promptModel
      .findOneAndUpdate({ promptId }, { $set: data }, { new: true })
      .exec();
    return doc ? this.toData(doc) : null;
  }

  /**
   * 删除 Prompt
   */
  async remove(promptId: string): Promise<boolean> {
    const result = await this.promptModel.deleteOne({ promptId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * 批量删除 Prompt
   */
  async batchRemove(promptIds: string[]): Promise<number> {
    const result = await this.promptModel.deleteMany({ promptId: { $in: promptIds } }).exec();
    return result.deletedCount ?? 0;
  }

  /**
   * 搜索 Prompt（支持关键词搜索 name / description / promptId）
   */
  async search(keyword: string, options?: {
    category?: PromptCategory;
    status?: PromptStatus;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ items: PromptData[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      $or: [
        { promptId: { $regex: keyword, $options: 'i' } },
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ],
    };

    if (options?.category) filter.category = options.category;
    if (options?.status) filter.status = options.status;
    if (options?.tags?.length) filter.tags = { $in: options.tags };

    const [docs, total] = await Promise.all([
      this.promptModel.find(filter).sort({ sortOrder: 1 }).skip(skip).limit(limit).exec(),
      this.promptModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toData(d)),
      total,
      page,
      limit,
    };
  }

  /* -----------------------------------------------------------------
   * 编译 & 渲染
   * ----------------------------------------------------------------- */

  /**
   * 编译渲染 Prompt：将模板与变量合并，返回可直接送入 LLM 的 CompiledPrompt
   */
  async render(context: PromptRenderContext): Promise<CompiledPrompt> {
    const { promptId, version, variables, overrides } = context;

    // 1. 获取 Prompt 数据
    const prompt = await this.promptModel.findOne({ promptId }).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt "${promptId}" not found`);
    }

    // 2. 若指定了版本，则后续由 PromptVersionService 处理；
    //    此处默认使用当前版本（模板内容来自 prompt.template）
    const template = prompt.template;

    // 3. 变量校验：检查必填变量是否提供
    const missing = prompt.variables.filter((v) => variables[v] === undefined);
    if (missing.length > 0) {
      this.logger.warn(`Missing variables for "${promptId}": ${missing.join(', ')}`);
    }

    // 4. 执行变量替换
    const systemMessage = replaceVariables(template, variables);

    // 5. 构造 CompiledPrompt
    return {
      promptId: prompt.promptId,
      version: version ?? prompt.version,
      systemMessage,
      messages: [
        { role: 'system' as const, content: systemMessage },
        { role: 'user' as const, content: '请根据以上要求生成内容。' },
      ],
      variables: { ...variables },
      maxTokens: overrides?.maxTokens ?? prompt.maxTokens,
    };
  }

  /**
   * 预览渲染结果（不执行 LLM 调用）
   */
  async preview(promptId: string, variables: Record<string, string>): Promise<{
    promptId: string;
    version: string;
    renderedTemplate: string;
    missingVariables: string[];
  }> {
    const prompt = await this.promptModel.findOne({ promptId }).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt "${promptId}" not found`);
    }

    const missing = prompt.variables.filter((v) => variables[v] === undefined);
    const renderedTemplate = replaceVariables(prompt.template, variables);

    return {
      promptId: prompt.promptId,
      version: prompt.version,
      renderedTemplate,
      missingVariables: missing,
    };
  }

  /* -----------------------------------------------------------------
   * 内置模板查询委托
   * ----------------------------------------------------------------- */

  /** 获取内置模板定义（通过 templates/index.ts） */
  getBuiltInTemplate(id: string): PromptTemplateEntry | undefined {
    return getTemplate(id);
  }

  /** 获取所有内置模板定义 */
  getAllBuiltInTemplates(): PromptTemplateEntry[] {
    return getAllTemplates();
  }

  /** 按分类获取内置模板 */
  getBuiltInTemplatesByCategory(category: PromptCategory): PromptTemplateEntry[] {
    return getTemplatesByCategory(category);
  }

  /** 按分类分组内置模板 */
  listBuiltInByCategory(): Record<PromptCategory, PromptTemplateEntry[]> {
    return listTemplatesByCategory();
  }

  /* -----------------------------------------------------------------
   * 内部工具
   * ----------------------------------------------------------------- */

  /** Mongoose Document → PromptData */
  private toData(doc: PromptDocument): PromptData {
    return {
      promptId: doc.promptId,
      name: doc.name,
      category: doc.category as PromptCategory,
      tags: doc.tags ?? [],
      provider: doc.provider,
      model: doc.model,
      version: doc.version,
      status: doc.status as PromptStatus,
      isLatest: doc.isLatest,
      description: doc.description ?? '',
      variables: doc.variables ?? [],
      template: doc.template,
      maxTokens: doc.maxTokens,
      sortOrder: doc.sortOrder,
      createdBy: doc.createdBy ?? '',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
