// ============================================================
// DZS-OS V2 — Prompt Center Template Registry
// 提示词中心内置模板统一导出入口
// ============================================================

/**
 * Prompt 模板函数类型
 * 输入：用户参数 + 上下文
 * 输出：格式化后的 Prompt 字符串
 */
export type PromptTemplateFn = (params: Record<string, any>) => string;

/** Prompt 模板注册条目 */
export interface PromptTemplateEntry {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 分类 */
  category: PromptCategory;
  /** 描述 */
  description: string;
  /** 版本号 */
  version: string;
  /** 模板函数（动态生成） */
  template: PromptTemplateFn;
  /** 原始模板字符串（含 {{variable}} 占位符，用于数据库存储） */
  rawTemplate: string;
  /** 模板变量列表 */
  variables: string[];
  /** 推荐 Provider */
  recommendedProvider?: string;
  /** 推荐 Model */
  recommendedModel?: string;
  /** Token 上限 */
  maxTokens?: number;
  /** 标签 */
  tags?: string[];
  /** 排序权重 */
  sortOrder?: number;
}

/** Prompt 分类 */
export type PromptCategory =
  | 'bazi'
  | 'wuxing'
  | 'jiugong'
  | 'fengshui'
  | 'comprehensive'
  | 'ai-report'
  | 'daily-fortune'
  | 'custom';

// ============================================================
// 模板导入 & 注册
// ============================================================

import { baziAnalysisTemplate } from './bazi-analysis';
import { wuxingAnalysisTemplate } from './wuxing-analysis';
import { jiugongAnalysisTemplate } from './jiugong-analysis';
import { fengshuiAnalysisTemplate } from './fengshui-analysis';
import { comprehensiveAnalysisTemplate } from './comprehensive-analysis';
import { aiReportTemplate } from './ai-report';
import { dailyFortuneTemplate } from './daily-fortune';
import { customTemplate } from './custom';

/** 所有内置模板映射表 */
export const builtInTemplates: Map<string, PromptTemplateEntry> = new Map();

function register(entry: PromptTemplateEntry): void {
  builtInTemplates.set(entry.id, entry);
}

register(baziAnalysisTemplate);
register(wuxingAnalysisTemplate);
register(jiugongAnalysisTemplate);
register(fengshuiAnalysisTemplate);
register(comprehensiveAnalysisTemplate);
register(aiReportTemplate);
register(dailyFortuneTemplate);
register(customTemplate);

/** 按 ID 获取模板 */
export function getTemplate(id: string): PromptTemplateEntry | undefined {
  return builtInTemplates.get(id);
}

/** 获取所有模板 */
export function getAllTemplates(): PromptTemplateEntry[] {
  return Array.from(builtInTemplates.values());
}

/** 按分类获取模板 */
export function getTemplatesByCategory(category: PromptCategory): PromptTemplateEntry[] {
  return getAllTemplates().filter((t) => t.category === category);
}

/** 按分类分组 */
export function listByCategory(): Record<PromptCategory, PromptTemplateEntry[]> {
  const result = {} as Record<PromptCategory, PromptTemplateEntry[]>;
  for (const entry of builtInTemplates.values()) {
    if (!result[entry.category]) {
      result[entry.category] = [];
    }
    result[entry.category].push(entry);
  }
  return result;
}
