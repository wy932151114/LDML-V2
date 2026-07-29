// ============================================================
// DZS-OS V2 — Prompt Version Service
// Prompt 版本管理服务：创建、发布、归档、查询版本历史
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';

import {
  PromptVersion,
  PromptVersionDocument,
} from '@/database/mongoose/schemas/prompt-version.schema';
import { Prompt, PromptDocument } from '@/database/mongoose/schemas/prompt.schema';
import type {
  PromptVersionData,
  PromptVersionStatus,
  SemVer,
} from '../interface/prompt.interface';

// ── 查询参数类型 ──────────────────────────────────────────────

export interface VersionQueryOptions {
  /** 版本状态筛选 */
  status?: PromptVersionStatus;
  /** 页码（默认 1） */
  page?: number;
  /** 每页条数（默认 20） */
  limit?: number;
  /** 排序字段 */
  sort?: string;
  /** 排序方向 */
  order?: 'asc' | 'desc';
}

/** 版本对比结果 */
export interface VersionComparison {
  promptId: string;
  baseVersion: string;
  targetVersion: string;
  changes: Array<{
    field: string;
    from: unknown;
    to: unknown;
  }>;
  summary: string;
}

/** 分页版本列表 */
export interface PaginatedVersionResult {
  items: PromptVersionData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── 服务实现 ──────────────────────────────────────────────────

@Injectable()
export class PromptVersionService {
  private readonly logger = new Logger(PromptVersionService.name);

  constructor(
    @InjectModel(PromptVersion.name)
    private readonly versionModel: Model<PromptVersionDocument>,
    @InjectModel(Prompt.name)
    private readonly promptModel: Model<PromptDocument>,
  ) {}

  /* --------------------------------------------------------------------
   * 创建版本
   * -------------------------------------------------------------------- */

  /**
   * 为指定 Prompt 创建新版本记录。
   * - 自动计算下一个版本号（若未指定）
   * - 新建版本默认标记为 draft
   * - 若未指定变量的，从模板中自动提取
   */
  async createVersion(data: {
    promptId: string;
    name: string;
    version?: string;
    template: string;
    variables?: string[];
    tags?: string[];
    description?: string;
    changelog?: string;
    publishedBy?: string;
  }): Promise<PromptVersionData> {
    // 1. 校验 prompt 存在
    const prompt = await this.promptModel.findOne({ promptId: data.promptId }).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt [${data.promptId}] 不存在`);
    }

    // 2. 确定版本号
    let version = data.version;
    if (!version) {
      version = await this.nextVersion(data.promptId);
    }

    // 3. 校验版本号唯一性（同一 promptId 下）
    const exists = await this.versionModel
      .findOne({ promptId: data.promptId, version })
      .exec();
    if (exists) {
      throw new ConflictException(
        `Prompt [${data.promptId}] 版本 [${version}] 已存在`,
      );
    }

    // 4. 自动提取变量（若未提供）
    const variables =
      data.variables ?? this.extractVariablesFromTemplate(data.template);

    // 5. 创建版本记录
    const doc = await this.versionModel.create({
      promptId: data.promptId,
      name: data.name,
      version,
      template: data.template,
      variables,
      tags: data.tags ?? [],
      description: data.description,
      changelog: data.changelog,
      status: 'draft',
      isLatest: false,
    });

    this.logger.log(`Version created: ${data.promptId}@${version}`);

    return this.toVersionData(doc);
  }

  /* --------------------------------------------------------------------
   * 查询单个版本
   * -------------------------------------------------------------------- */

  /**
   * 获取指定 Prompt 的某个版本
   */
  async getVersion(
    promptId: string,
    version: string,
  ): Promise<PromptVersionData> {
    const doc = await this.versionModel
      .findOne({ promptId, version })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `版本 [${promptId}@${version}] 不存在`,
      );
    }
    return this.toVersionData(doc);
  }

  /**
   * 通过 MongoDB _id 获取版本
   */
  async getVersionById(id: string): Promise<PromptVersionData> {
    const doc = await this.versionModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`版本记录 [${id}] 不存在`);
    }
    return this.toVersionData(doc);
  }

  /* --------------------------------------------------------------------
   * 版本列表
   * -------------------------------------------------------------------- */

  /**
   * 列出指定 Prompt 的所有版本（分页）
   */
  async listVersions(
    promptId: string,
    options: VersionQueryOptions = {},
  ): Promise<PaginatedVersionResult> {
    const {
      status,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = options;

    const filter: Record<string, unknown> = { promptId };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const sortObj: Record<string, SortOrder> = { [sort]: order === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.versionModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.versionModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toVersionData(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取指定 Prompt 的最新版本
   */
  async getLatestVersion(promptId: string): Promise<PromptVersionData | null> {
    const doc = await this.versionModel
      .findOne({ promptId, isLatest: true })
      .exec();
    return doc ? this.toVersionData(doc) : null;
  }

  /* --------------------------------------------------------------------
   * 发布 / 归档
   * -------------------------------------------------------------------- */

  /**
   * 发布版本：draft → published
   * - 自动将该 prompt 下其他版本的 isLatest 置为 false
   * - 更新 prompt 主表的最新版本号
   */
  async publishVersion(
    promptId: string,
    version: string,
    publishedBy?: string,
  ): Promise<PromptVersionData> {
    const doc = await this.versionModel
      .findOne({ promptId, version })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `版本 [${promptId}@${version}] 不存在`,
      );
    }
    if (doc.status === 'published') {
      throw new BadRequestException(
        `版本 [${promptId}@${version}] 已发布`,
      );
    }
    if (doc.status === 'archived') {
      throw new BadRequestException(
        `版本 [${promptId}@${version}] 已归档，无法发布`,
      );
    }

    // 清除该 prompt 下所有版本的 isLatest 标记
    await this.versionModel
      .updateMany(
        { promptId, isLatest: true },
        { $set: { isLatest: false } },
      )
      .exec();

    // 更新目标版本
    doc.status = 'published';
    doc.isLatest = true;
    if (publishedBy) {
      doc.publishedBy = publishedBy;
    }
    await doc.save();

    // 同步更新 prompt 主表
    await this.promptModel
      .findOneAndUpdate(
        { promptId },
        { $set: { version, isLatest: true } },
      )
      .exec();

    this.logger.log(`Version published: ${promptId}@${version}`);

    return this.toVersionData(doc);
  }

  /**
   * 归档版本：published → archived 或 draft → archived
   */
  async archiveVersion(
    promptId: string,
    version: string,
  ): Promise<PromptVersionData> {
    const doc = await this.versionModel
      .findOne({ promptId, version })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `版本 [${promptId}@${version}] 不存在`,
      );
    }
    if (doc.status === 'archived') {
      throw new BadRequestException(
        `版本 [${promptId}@${version}] 已归档`,
      );
    }

    doc.status = 'archived';
    doc.isLatest = false;
    await doc.save();

    this.logger.log(`Version archived: ${promptId}@${version}`);

    return this.toVersionData(doc);
  }

  /* --------------------------------------------------------------------
   * 删除版本
   * -------------------------------------------------------------------- */

  /**
   * 删除指定版本记录（仅允许 draft 状态）
   */
  async deleteVersion(promptId: string, version: string): Promise<void> {
    const doc = await this.versionModel
      .findOne({ promptId, version })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `版本 [${promptId}@${version}] 不存在`,
      );
    }
    if (doc.status !== 'draft') {
      throw new BadRequestException(
        `仅可删除 draft 状态的版本（当前: ${doc.status}）`,
      );
    }

    await this.versionModel.deleteOne({ _id: doc._id }).exec();

    this.logger.log(`Version deleted: ${promptId}@${version}`);
  }

  /**
   * 删除指定 Prompt 的所有版本
   */
  async deleteAllVersions(promptId: string): Promise<number> {
    const result = await this.versionModel
      .deleteMany({ promptId })
      .exec();
    this.logger.log(
      `All versions deleted for prompt [${promptId}]: ${result.deletedCount}`,
    );
    return result.deletedCount;
  }

  /* --------------------------------------------------------------------
   * 版本对比
   * -------------------------------------------------------------------- */

  /**
   * 比较同一 Prompt 的两个版本
   */
  async compareVersions(
    promptId: string,
    baseVersion: string,
    targetVersion: string,
  ): Promise<VersionComparison> {
    const [base, target] = await Promise.all([
      this.versionModel.findOne({ promptId, version: baseVersion }).exec(),
      this.versionModel.findOne({ promptId, version: targetVersion }).exec(),
    ]);

    if (!base) {
      throw new NotFoundException(`基础版本 [${baseVersion}] 不存在`);
    }
    if (!target) {
      throw new NotFoundException(`目标版本 [${targetVersion}] 不存在`);
    }

    const changes: VersionComparison['changes'] = [];
    const comparableFields: Array<keyof PromptVersionDocument> = [
      'name',
      'template',
      'variables',
      'tags',
      'description',
    ];

    for (const field of comparableFields) {
      const fromVal = (base as any)[field];
      const toVal = (target as any)[field];

      if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        changes.push({
          field: field as string,
          from: fromVal,
          to: toVal,
        });
      }
    }

    // 状态变化
    if (base.status !== target.status) {
      changes.push({
        field: 'status',
        from: base.status,
        to: target.status,
      });
    }

    // 生成摘要
    const summary = changes.length === 0
      ? '两个版本完全相同'
      : `共 ${changes.length} 处变更：${changes.map((c) => c.field).join(', ')}`;

    return {
      promptId,
      baseVersion,
      targetVersion,
      changes,
      summary,
    };
  }

  /* --------------------------------------------------------------------
   * 内部工具方法
   * -------------------------------------------------------------------- */

  /**
   * 计算该 Prompt 的下一个版本号
   */
  private async nextVersion(promptId: string): Promise<string> {
    const latest = await this.versionModel
      .findOne({ promptId })
      .sort({ createdAt: -1 })
      .select('version')
      .exec();

    if (!latest) {
      return '1.0.0';
    }

    const parts = latest.version.split('.').map(Number);
    // minor bump
    const major = parts[0] ?? 1;
    const minor = (parts[1] ?? 0) + 1;
    const patch = parts[2] ?? 0;

    return `${major}.${minor}.${patch}`;
  }

  /**
   * 从模板字符串中提取 {{variable}} 占位符
   */
  private extractVariablesFromTemplate(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template)) !== null) {
      matches.add(match[1]);
    }

    return Array.from(matches).sort();
  }

  /**
   * 将 Mongoose Document 转换为纯对象
   */
  private toVersionData(doc: PromptVersionDocument): PromptVersionData {
    return {
      promptId: doc.promptId,
      name: doc.name,
      description: doc.description,
      version: doc.version as SemVer,
      template: doc.template,
      variables: [...doc.variables],
      tags: [...doc.tags],
      status: doc.status as PromptVersionStatus,
      publishedBy: doc.publishedBy,
      changelog: doc.changelog,
      isLatest: doc.isLatest,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
