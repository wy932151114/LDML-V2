// ============================================================
// DZS-OS V2 — Prompt Registry
// 所有报告 AI Prompt 统一存放，禁止硬编码
// ============================================================

/**
 * Prompt 模板函数类型
 * 输入：排盘数据 + 用户问题
 * 输出：格式化后的 Prompt 字符串
 */
export type PromptTemplate = (params: PromptParams) => string;

/** Prompt 输入参数 */
export interface PromptParams {
  /** 八字排盘结果 JSON */
  baziData?: Record<string, any>;
  /** 用户问题 */
  userQuery?: string;
  /** 用户名 */
  userName?: string;
  /** 出生信息摘要 */
  birthInfo?: string;
  /** 额外上下文 */
  context?: Record<string, any>;
}

/** Prompt 注册条目 */
export interface PromptEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  template: PromptTemplate;
  /** 推荐模型 */
  recommendedModel?: string;
  /** Token 上限估计 */
  maxTokens?: number;
}
