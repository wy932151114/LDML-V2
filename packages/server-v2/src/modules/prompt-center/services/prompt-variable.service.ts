// ============================================================
// DZS-OS V2 — Prompt Variable Service
// Prompt 变量管理服务：模板变量提取、校验、替换与定义管理
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Prompt, PromptDocument } from '@/database/mongoose/schemas/prompt.schema';
import {
  PromptVersion,
  PromptVersionDocument,
} from '@/database/mongoose/schemas/prompt-version.schema';

// ── 类型定义 ──────────────────────────────────────────────────

/** 单个变量的元信息 */
export interface VariableInfo {
  /** 变量名 */
  name: string;
  /** 变量描述（可选） */
  description?: string;
  /** 示例值 */
  example?: string;
  /** 是否必填 */
  required: boolean;
  /** 默认值 */
  defaultValue?: string;
}

/** 变量校验结果 */
export interface VariableValidationResult {
  /** 是否通过校验 */
  valid: boolean;
  /** 已声明但模板中未使用的变量 */
  unused: string[];
  /** 模板中使用但未声明的变量 */
  undeclared: string[];
  /** 所有通过校验的变量 */
  matched: string[];
  /** 总览信息 */
  summary: string;
}

/** 变量替换结果 */
export interface VariableResolveResult {
  /** 替换后的模板内容 */
  resolved: string;
  /** 已成功替换的变量 */
  replaced: string[];
  /** 缺失值的变量（模板中用到了但未提供值） */
  missing: string[];
}

/** 模板变量分析报告 */
export interface VariableAnalysis {
  /** 模板中的所有占位符 */
  placeholders: string[];
  /** 已声明的变量列表 */
  declared: string[];
  /** 声明的变量详细信息 */
  declaredInfo: VariableInfo[];
  /** 校验结果 */
  validation: VariableValidationResult;
}

// ── 模板变量正则 ──────────────────────────────────────────────

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

// ── 服务实现 ──────────────────────────────────────────────────

@Injectable()
export class PromptVariableService {
  private readonly logger = new Logger(PromptVariableService.name);

  constructor(
    @InjectModel(Prompt.name)
    private readonly promptModel: Model<PromptDocument>,
    @InjectModel(PromptVersion.name)
    private readonly versionModel: Model<PromptVersionDocument>,
  ) {}

  /* --------------------------------------------------------------------
   * 变量提取
   * -------------------------------------------------------------------- */

  /**
   * 从模板字符串中提取所有 {{variable}} 占位符
   */
  extractVariables(template: string): string[] {
    const matches = new Set<string>();
    let match: RegExpExecArray | null;

    const regex = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = regex.exec(template)) !== null) {
      matches.add(match[1]);
    }

    return Array.from(matches).sort();
  }

  /**
   * 获取指定 Prompt 当前版本的变量列表
   */
  async getPromptVariables(promptId: string): Promise<string[]> {
    const prompt = await this.promptModel.findOne({ promptId }).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt [${promptId}] 不存在`);
    }
    return [...prompt.variables];
  }

  /**
   * 获取指定版本中的变量列表
   */
  async getVersionVariables(
    promptId: string,
    version: string,
  ): Promise<string[]> {
    const doc = await this.versionModel
      .findOne({ promptId, version })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `版本 [${promptId}@${version}] 不存在`,
      );
    }
    return [...doc.variables];
  }

  /* --------------------------------------------------------------------
   * 变量校验
   * -------------------------------------------------------------------- */

  /**
   * 校验模板中的占位符与声明的变量列表是否一致
   *
   * @param template  模板内容
   * @param declared  已声明的变量名数组
   */
  validateVariables(
    template: string,
    declared: string[],
  ): VariableValidationResult {
    const placeholders = this.extractVariables(template);
    const declaredSet = new Set(declared);

    const matched: string[] = [];
    const unused: string[] = [];
    const undeclared: string[] = [];

    for (const ph of placeholders) {
      if (declaredSet.has(ph)) {
        matched.push(ph);
      } else {
        undeclared.push(ph);
      }
    }

    for (const d of declared) {
      if (!placeholders.includes(d)) {
        unused.push(d);
      }
    }

    const valid = undeclared.length === 0;

    return {
      valid,
      unused,
      undeclared,
      matched,
      summary: valid
        ? '✅ 模板变量校验通过'
        : `⚠️ 发现 ${undeclared.length} 个未声明的变量`,
    };
  }

  /* --------------------------------------------------------------------
   * 变量替换
   * -------------------------------------------------------------------- */

  /**
   * 将模板中的占位符替换为实际值
   *
   * @param template  模板内容
   * @param values    变量键值对
   */
  resolveVariables(
    template: string,
    values: Record<string, string>,
  ): VariableResolveResult {
    const placeholders = this.extractVariables(template);
    const replaced: string[] = [];
    const missing: string[] = [];

    let resolved = template;

    for (const ph of placeholders) {
      if (values[ph] !== undefined && values[ph] !== null) {
        // 使用全局替换以防同一变量多次出现
        const escaped = ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\{\\{${escaped}\\}\\}`, 'g');
        resolved = resolved.replace(pattern, values[ph]);
        replaced.push(ph);
      } else {
        missing.push(ph);
      }
    }

    return { resolved, replaced, missing };
  }

  /**
   * 批量替换并返回警告信息
   * 与 resolveVariables 的行为一致，但会对缺失变量发出 logger 警告
   */
  async resolveAndLog(
    promptId: string,
    version: string,
    values: Record<string, string>,
  ): Promise<VariableResolveResult> {
    const doc = await this.versionModel
      .findOne({ promptId, version })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `版本 [${promptId}@${version}] 不存在`,
      );
    }

    const result = this.resolveVariables(doc.template, values);

    if (result.missing.length > 0) {
      this.logger.warn(
        `[${promptId}@${version}] 缺失变量: ${result.missing.join(', ')}`,
      );
    }

    return result;
  }

  /* --------------------------------------------------------------------
   * 变量定义管理（CRUD on Prompt.variables）
   * -------------------------------------------------------------------- */

  /**
   * 为指定 Prompt 添加变量声明
   */
  async addVariable(
    promptId: string,
    variable: string,
  ): Promise<string[]> {
    if (!/^\w+$/.test(variable)) {
      throw new BadRequestException(
        `变量名 "${variable}" 不合法（仅支持字母、数字、下划线）`,
      );
    }

    const prompt = await this.promptModel
      .findOneAndUpdate(
        { promptId, variables: { $ne: variable } },
        { $push: { variables: variable } },
        { new: true },
      )
      .exec();

    if (!prompt) {
      const existing = await this.promptModel.findOne({ promptId }).exec();
      if (!existing) {
        throw new NotFoundException(`Prompt [${promptId}] 不存在`);
      }
      // 变量已存在
      throw new BadRequestException(
        `变量 "${variable}" 已在 Prompt [${promptId}] 中声明`,
      );
    }

    this.logger.log(`Variable added: ${promptId}.${variable}`);
    return [...prompt.variables];
  }

  /**
   * 批量添加变量声明
   */
  async addVariables(
    promptId: string,
    variables: string[],
  ): Promise<string[]> {
    const invalid = variables.filter((v) => !/^\w+$/.test(v));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `以下变量名不合法: ${invalid.join(', ')}`,
      );
    }

    const prompt = await this.promptModel
      .findOneAndUpdate(
        { promptId },
        { $addToSet: { variables: { $each: variables } } },
        { new: true },
      )
      .exec();

    if (!prompt) {
      throw new NotFoundException(`Prompt [${promptId}] 不存在`);
    }

    this.logger.log(`Variables added to ${promptId}: ${variables.join(', ')}`);
    return [...prompt.variables];
  }

  /**
   * 从 Prompt 中移除变量声明
   */
  async removeVariable(
    promptId: string,
    variable: string,
  ): Promise<string[]> {
    const prompt = await this.promptModel
      .findOneAndUpdate(
        { promptId },
        { $pull: { variables: variable } },
        { new: true },
      )
      .exec();

    if (!prompt) {
      throw new NotFoundException(`Prompt [${promptId}] 不存在`);
    }

    this.logger.log(`Variable removed: ${promptId}.${variable}`);
    return [...prompt.variables];
  }

  /**
   * 替换 Prompt 的完整变量列表
   */
  async setVariables(
    promptId: string,
    variables: string[],
  ): Promise<string[]> {
    const prompt = await this.promptModel
      .findOneAndUpdate(
        { promptId },
        { $set: { variables } },
        { new: true },
      )
      .exec();

    if (!prompt) {
      throw new NotFoundException(`Prompt [${promptId}] 不存在`);
    }

    this.logger.log(`Variables replaced for ${promptId}: ${variables.join(', ')}`);
    return [...prompt.variables];
  }

  /* --------------------------------------------------------------------
   * 变量分析与同步
   * -------------------------------------------------------------------- */

  /**
   * 对指定 Prompt 进行完整的变量分析：
   * - 提取模板中的占位符
   * - 与声明列表对比
   * - 返回分析报告
   */
  async analyze(promptId: string): Promise<VariableAnalysis> {
    const prompt = await this.promptModel.findOne({ promptId }).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt [${promptId}] 不存在`);
    }

    const template = prompt.template;
    const declared = [...prompt.variables];
    const placeholders = this.extractVariables(template);
    const validation = this.validateVariables(template, declared);

    const declaredInfo: VariableInfo[] = declared.map((name) => ({
      name,
      required: true,
      description: `${name} 变量`,
    }));

    return {
      placeholders,
      declared,
      declaredInfo,
      validation,
    };
  }

  /**
   * 同步模板变量：自动将模板中的占位符同步到 prompt 的 variables 字段
   * - 添加模板中出现的但未声明的变量
   * - 不移除已声明但模板中未使用的变量（仅提示）
   */
  async syncVariables(promptId: string): Promise<{
    added: string[];
    removed: string[];
    currentVariables: string[];
  }> {
    const prompt = await this.promptModel.findOne({ promptId }).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt [${promptId}] 不存在`);
    }

    const placeholders = this.extractVariables(prompt.template);
    const existingSet = new Set(prompt.variables);
    const placeholderSet = new Set(placeholders);

    const added: string[] = [];
    const removed: string[] = [];

    // 添加新出现的占位符
    for (const ph of placeholders) {
      if (!existingSet.has(ph)) {
        added.push(ph);
      }
    }

    // 仅记录已声明但未使用的（不移除）
    for (const v of prompt.variables) {
      if (!placeholderSet.has(v)) {
        removed.push(v);
      }
    }

    if (added.length > 0) {
      prompt.variables = [...new Set([...prompt.variables, ...added])];
      await prompt.save();
      this.logger.log(
        `Variables synced for ${promptId}: added ${added.join(', ')}`,
      );
    }

    return {
      added,
      removed,
      currentVariables: [...prompt.variables],
    };
  }

  /* --------------------------------------------------------------------
   * 批量操作与版本变量同步
   * -------------------------------------------------------------------- */

  /**
   * 将某个版本的变量列表同步到 Prompt 主表
   */
  async syncFromVersion(
    promptId: string,
    version: string,
  ): Promise<string[]> {
    const doc = await this.versionModel
      .findOne({ promptId, version })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `版本 [${promptId}@${version}] 不存在`,
      );
    }

    const prompt = await this.promptModel
      .findOneAndUpdate(
        { promptId },
        { $set: { variables: [...doc.variables] } },
        { new: true },
      )
      .exec();

    if (!prompt) {
      throw new NotFoundException(`Prompt [${promptId}] 不存在`);
    }

    this.logger.log(
      `Variables synced from version ${version} to prompt ${promptId}`,
    );

    return [...prompt.variables];
  }

  /**
   * 校验变量值集是否满足模板所需
   * 返回每个缺失的必填变量
   */
  getMissingRequired(
    template: string,
    values: Record<string, string>,
  ): string[] {
    const placeholders = this.extractVariables(template);
    return placeholders.filter(
      (ph) => values[ph] === undefined || values[ph] === null,
    );
  }

  /**
   * 构建默认变量值映射（所有变量 → 默认空字符串）
   */
  buildDefaultValues(variables: string[]): Record<string, string> {
    const values: Record<string, string> = {};
    for (const v of variables) {
      values[v] = '';
    }
    return values;
  }
}
