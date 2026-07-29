// ============================================================
// DZS-OS V2 — Prompt Center Main Service
// 提示词中心主服务：协调注册、版本管理、变量替换、预览与执行
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptVersion, PromptVersionDocument } from '@/database/mongoose/schemas/prompt-version.schema';
import { AIRuntimeService } from '@/modules/ai-runtime/ai-runtime.service';
import {
  PromptData,
  PromptCategory,
  PromptStatus,
  PromptVersionData,
  PromptVersionStatus,
  PromptRenderContext,
  CompiledPrompt,
} from '../interface/prompt.interface';
import { PromptRegistryService } from './prompt-registry.service';

// ── 简单语义版本号比较（用于自动递增） ──────────────────────────

/**
 * 将 semver 字符串解析为数字数组
 */
function parseSemVer(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10) || 0);
}

/**
 * 递增补丁版本号（patch）：1.0.0 → 1.0.1
 */
function bumpPatch(v: string): string {
  const [major, minor, patch] = parseSemVer(v);
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * 递增次版本号（minor）：1.0.0 → 1.1.0
 */
function bumpMinor(v: string): string {
  const [major, minor] = parseSemVer(v);
  return `${major}.${minor + 1}.0`;
}

/**
 * 递增主版本号（major）：1.0.0 → 2.0.0
 */
function bumpMajor(v: string): string {
  const [major] = parseSemVer(v);
  return `${major + 1}.0.0`;
}

// ── {{variable}} 替换工具 ─────────────────────────────────────

/**
 * 替换模板中的 {{variable}} 占位符
 * 未提供的变量保留原始占位符
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] !== undefined ? variables[key] : `{{${key}}}`;
  });
}

/**
 * 从模板中提取所有 {{variable}} 占位符名称
 */
function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class PromptCenterService {
  private readonly logger = new Logger(PromptCenterService.name);

  constructor(
    private readonly registryService: PromptRegistryService,

    @InjectModel(PromptVersion.name)
    private readonly versionModel: Model<PromptVersionDocument>,

    private readonly aiRuntimeService: AIRuntimeService,
  ) {}

  /* =================================================================
   * 注册管理 — 委托给 RegistryService
   * ================================================================= */

  /** 注册新 Prompt */
  async register(data: Omit<PromptData, 'createdAt' | 'updatedAt'>): Promise<PromptData> {
    return this.registryService.register(data);
  }

  /** 获取 Prompt */
  async get(promptId: string): Promise<PromptData | null> {
    return this.registryService.get(promptId);
  }

  /** 获取所有 Prompt */
  async getAll(): Promise<PromptData[]> {
    return this.registryService.getAll();
  }

  /** 按分类获取 Prompt */
  async listByCategory(category: PromptCategory): Promise<PromptData[]> {
    return this.registryService.listByCategory(category);
  }

  /** 更新 Prompt */
  async update(promptId: string, data: Partial<PromptData>): Promise<PromptData | null> {
    return this.registryService.update(promptId, data);
  }

  /** 删除 Prompt */
  async remove(promptId: string): Promise<boolean> {
    // 同时删除关联版本
    await this.versionModel.deleteMany({ promptId }).exec();
    return this.registryService.remove(promptId);
  }

  /** 搜索 Prompt */
  async search(keyword: string, options?: {
    category?: PromptCategory;
    status?: PromptStatus;
    tags?: string[];
    page?: number;
    limit?: number;
  }) {
    return this.registryService.search(keyword, options);
  }

  /* =================================================================
   * 版本管理 — PromptVersionService 功能内联
   * ================================================================= */

  /**
   * 创建新版本
   */
  async createVersion(data: Omit<PromptVersionData, 'createdAt' | 'updatedAt'>): Promise<PromptVersionData> {
    // 检查是否存在已有版本
    const existingVersion = await this.versionModel
      .findOne({ promptId: data.promptId, version: data.version })
      .exec();

    if (existingVersion) {
      throw new NotFoundException(`Version ${data.version} for prompt "${data.promptId}" already exists`);
    }

    // 检查 prompt 是否存在
    const prompt = await this.registryService.get(data.promptId);
    if (!prompt) {
      throw new NotFoundException(`Prompt "${data.promptId}" not found`);
    }

    // 将旧版本的 isLatest 标记设为 false
    await this.versionModel
      .updateMany({ promptId: data.promptId }, { $set: { isLatest: false } })
      .exec();

    // 创建新版本
    const created = await this.versionModel.create({
      promptId: data.promptId,
      name: data.name,
      description: data.description ?? '',
      version: data.version,
      template: data.template,
      variables: data.variables ?? extractVariables(data.template),
      tags: data.tags ?? [],
      status: data.status ?? 'draft',
      publishedBy: data.publishedBy,
      changelog: data.changelog,
      isLatest: true,
    });

    this.logger.log(`Created version ${data.version} for prompt "${data.promptId}"`);

    // 同步更新 Prompt 主表
    await this.registryService.update(data.promptId, {
      version: data.version,
      template: data.template,
      variables: data.variables ?? extractVariables(data.template),
    });

    return this.toVersionData(created);
  }

  /**
   * 获取 Prompt 的所有版本
   */
  async getVersions(promptId: string): Promise<PromptVersionData[]> {
    const docs = await this.versionModel
      .find({ promptId })
      .sort({ version: -1 })
      .exec();
    return docs.map((d) => this.toVersionData(d));
  }

  /**
   * 获取单个版本
   */
  async getVersion(promptId: string, version: string): Promise<PromptVersionData | null> {
    const doc = await this.versionModel.findOne({ promptId, version }).exec();
    return doc ? this.toVersionData(doc) : null;
  }

  /**
   * 获取最新版本
   */
  async getLatestVersion(promptId: string): Promise<PromptVersionData | null> {
    const doc = await this.versionModel.findOne({ promptId, isLatest: true }).exec();
    return doc ? this.toVersionData(doc) : null;
  }

  /**
   * 发布版本（draft → published）
   */
  async publishVersion(promptId: string, version: string): Promise<PromptVersionData> {
    const doc = await this.versionModel.findOne({ promptId, version }).exec();
    if (!doc) {
      throw new NotFoundException(`Version ${version} for prompt "${promptId}" not found`);
    }

    doc.status = 'published' as PromptVersionStatus;
    doc.isLatest = true;

    // 其他版本不再是 latest
    await this.versionModel
      .updateMany({ promptId, version: { $ne: version } }, { $set: { isLatest: false } })
      .exec();

    // 同步更新 Prompt 主表
    await this.registryService.update(promptId, {
      version: doc.version,
      template: doc.template,
      variables: doc.variables,
    });

    await doc.save();
    this.logger.log(`Published version ${version} for prompt "${promptId}"`);

    return this.toVersionData(doc);
  }

  /**
   * 归档版本（published → archived）
   */
  async archiveVersion(promptId: string, version: string): Promise<PromptVersionData> {
    const doc = await this.versionModel.findOne({ promptId, version }).exec();
    if (!doc) {
      throw new NotFoundException(`Version ${version} for prompt "${promptId}" not found`);
    }

    doc.status = 'archived' as PromptVersionStatus;
    await doc.save();
    this.logger.log(`Archived version ${version} for prompt "${promptId}"`);

    return this.toVersionData(doc);
  }

  /**
   * 自动递增版本号并创建新版本（基于当前最新版本）
   */
  async bumpVersion(
    promptId: string,
    level: 'major' | 'minor' | 'patch',
    updates: {
      template?: string;
      variables?: string[];
      description?: string;
      changelog?: string;
      publishedBy?: string;
    },
  ): Promise<PromptVersionData> {
    const latest = await this.getLatestVersion(promptId);
    if (!latest) {
      throw new NotFoundException(`No existing version found for prompt "${promptId}"`);
    }

    const newVersion = level === 'major'
      ? bumpMajor(latest.version)
      : level === 'minor'
        ? bumpMinor(latest.version)
        : bumpPatch(latest.version);

    return this.createVersion({
      promptId,
      name: latest.name,
      description: updates.description ?? latest.description,
      version: newVersion,
      template: updates.template ?? latest.template,
      variables: updates.variables ?? latest.variables,
      tags: latest.tags,
      status: 'draft',
      publishedBy: updates.publishedBy,
      changelog: updates.changelog,
      isLatest: true,
    });
  }

  /** 版本历史分页 */
  async getVersionHistory(
    promptId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: PromptVersionData[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.versionModel.find({ promptId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.versionModel.countDocuments({ promptId }).exec(),
    ]);

    return {
      items: docs.map((d) => this.toVersionData(d)),
      total,
      page,
      limit,
    };
  }

  /* =================================================================
   * 变量管理 — PromptVariableService 功能内联
   * ================================================================= */

  /**
   * 校验模板变量：检查所有 {{variable}} 是否都已提供值
   * @returns 缺失的变量列表
   */
  validateVariables(template: string, variables: Record<string, string>): string[] {
    const required = extractVariables(template);
    return required.filter((v) => variables[v] === undefined);
  }

  /**
   * 从模板中提取变量列表
   */
  extractVariables(template: string): string[] {
    return extractVariables(template);
  }

  /**
   * 变量替换预览：返回替换后的模板内容
   */
  applyVariables(template: string, variables: Record<string, string>): string {
    return replaceVariables(template, variables);
  }

  /**
   * 完整的变量预览（含缺失变量提示）
   */
  previewVariables(
    template: string,
    variables: Record<string, string>,
  ): {
    rendered: string;
    missing: string[];
    used: string[];
  } {
    const allVars = extractVariables(template);
    const missing = allVars.filter((v) => variables[v] === undefined);
    const used = allVars.filter((v) => variables[v] !== undefined);
    return {
      rendered: replaceVariables(template, variables),
      missing,
      used,
    };
  }

  /* =================================================================
   * 渲染 & 执行 — 核心编排
   * ================================================================= */

  /**
   * 编译渲染 Prompt（不执行 LLM）
   * 优先使用指定版本的模板，否则使用主表当前版本
   */
  async render(context: PromptRenderContext): Promise<CompiledPrompt> {
    const { promptId, version, variables, overrides } = context;

    // 1. 获取模板内容
    let template: string;
    let actualVersion: string;
    let maxTokens: number;
    let templateVariables: string[];

    if (version) {
      // 使用指定版本
      const versionDoc = await this.versionModel.findOne({ promptId, version }).exec();
      if (!versionDoc) {
        throw new NotFoundException(`Version ${version} for prompt "${promptId}" not found`);
      }
      template = versionDoc.template;
      actualVersion = versionDoc.version;
      maxTokens = overrides?.maxTokens ?? 4096;
      templateVariables = versionDoc.variables;
    } else {
      // 使用注册表中的当前版本
      const prompt = await this.registryService.get(promptId);
      if (!prompt) {
        throw new NotFoundException(`Prompt "${promptId}" not found`);
      }
      template = prompt.template;
      actualVersion = prompt.version;
      maxTokens = overrides?.maxTokens ?? prompt.maxTokens;
      templateVariables = prompt.variables;
    }

    // 2. 变量校验（仅警告，不阻断）
    const missing = templateVariables.filter((v) => variables[v] === undefined);
    if (missing.length > 0) {
      this.logger.warn(`Missing variables for "${promptId}@${actualVersion}": ${missing.join(', ')}`);
    }

    // 3. 执行变量替换
    const systemMessage = replaceVariables(template, variables);

    // 4. 构造 CompiledPrompt
    return {
      promptId,
      version: actualVersion,
      systemMessage,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: '请根据以上要求生成内容。' },
      ],
      variables: { ...variables },
      maxTokens,
    };
  }

  /**
   * 执行 Prompt（编译 + LLM 调用）
   */
  async execute(context: PromptRenderContext & { userId?: string }): Promise<{
    content: string;
    tokenUsage: { prompt: number; completion: number; total: number };
    modelUsed?: string;
    providerUsed?: string;
    processingTime: number;
  }> {
    const start = Date.now();

    // 1. 编译渲染
    const compiled = await this.render(context);

    // 2. 获取 Prompt 数据（用于 provider/model 信息）
    const prompt = await this.registryService.get(context.promptId);
    const provider = context.overrides?.provider ?? prompt?.provider ?? 'openai';
    const model = context.overrides?.model ?? prompt?.model ?? 'gpt-4o';

    // 3. 调用 AI Runtime
    const result = await this.aiRuntimeService.generate(context.userId ?? 'system', {
      provider,
      model,
      messages: compiled.messages,
      temperature: context.overrides?.temperature,
      maxTokens: compiled.maxTokens,
    });

    const processingTime = Date.now() - start;

    return {
      content: result.content,
      tokenUsage: {
        prompt: result.usage.promptTokens,
        completion: result.usage.completionTokens,
        total: result.usage.totalTokens,
      },
      modelUsed: result.model,
      providerUsed: result.provider,
      processingTime,
    };
  }

  /**
   * 预览 Prompt 渲染效果（不执行 LLM）
   */
  async preview(
    promptId: string,
    variables: Record<string, string>,
    version?: string,
  ): Promise<{
    promptId: string;
    version: string;
    renderedTemplate: string;
    missingVariables: string[];
    allVariables: string[];
  }> {
    let template: string;
    let actualVersion: string;
    let templateVariables: string[];

    if (version) {
      const versionDoc = await this.versionModel.findOne({ promptId, version }).exec();
      if (!versionDoc) {
        throw new NotFoundException(`Version ${version} for prompt "${promptId}" not found`);
      }
      template = versionDoc.template;
      actualVersion = versionDoc.version;
      templateVariables = versionDoc.variables;
    } else {
      const prompt = await this.registryService.get(promptId);
      if (!prompt) {
        throw new NotFoundException(`Prompt "${promptId}" not found`);
      }
      template = prompt.template;
      actualVersion = prompt.version;
      templateVariables = prompt.variables;
    }

    const missing = templateVariables.filter((v) => variables[v] === undefined);
    const renderedTemplate = replaceVariables(template, variables);

    return {
      promptId,
      version: actualVersion,
      renderedTemplate,
      missingVariables: missing,
      allVariables: templateVariables,
    };
  }

  /* =================================================================
   * 内置模板查询
   * ================================================================= */

  /** 获取内置模板 */
  getBuiltInTemplate(id: string) {
    return this.registryService.getBuiltInTemplate(id);
  }

  /** 获取所有内置模板 */
  getAllBuiltInTemplates() {
    return this.registryService.getAllBuiltInTemplates();
  }

  /** 按分类获取内置模板 */
  getBuiltInTemplatesByCategory(category: PromptCategory) {
    return this.registryService.getBuiltInTemplatesByCategory(category);
  }

  /** 按分类分组内置模板 */
  listBuiltInByCategory() {
    return this.registryService.listBuiltInByCategory();
  }

  /* =================================================================
   * 内置工具
   * ================================================================= */

  /** Mongoose Document → PromptVersionData */
  private toVersionData(doc: PromptVersionDocument): PromptVersionData {
    return {
      promptId: doc.promptId,
      name: doc.name,
      description: doc.description,
      version: doc.version,
      template: doc.template,
      variables: doc.variables ?? [],
      tags: doc.tags ?? [],
      status: doc.status as PromptVersionStatus,
      publishedBy: doc.publishedBy,
      changelog: doc.changelog,
      isLatest: doc.isLatest,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
