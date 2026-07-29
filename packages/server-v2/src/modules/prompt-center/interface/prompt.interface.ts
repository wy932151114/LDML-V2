// ============================================================
// DZS-OS V2 — Prompt Center Interfaces
// 核心类型定义（不含装饰器，可供 domain / service 层复用）
// ============================================================

// ── 枚举 / 联合类型 ────────────────────────────────────────────

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

/** Prompt 状态 */
export type PromptStatus = 'active' | 'inactive' | 'deprecated';

/** Prompt 版本状态 */
export type PromptVersionStatus = 'draft' | 'published' | 'archived';

/** 版本号语义（major.minor.patch） */
export type SemVer = `${number}.${number}.${number}`;

// ── 核心数据接口 ────────────────────────────────────────────────

/** Prompt 注册条目（对应 prompt.schema.ts） */
export interface PromptData {
  promptId: string;
  name: string;
  category: PromptCategory;
  tags: string[];
  provider: string;
  model: string;
  version: string;
  status: PromptStatus;
  isLatest: boolean;
  description: string;
  variables: string[];
  template: string;
  maxTokens: number;
  sortOrder: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Prompt 版本记录（对应 prompt-version.schema.ts） */
export interface PromptVersionData {
  promptId: string;
  name: string;
  description?: string;
  version: string;
  template: string;
  variables: string[];
  tags: string[];
  status: PromptVersionStatus;
  publishedBy?: string;
  changelog?: string;
  isLatest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** 编译后的 Prompt（变量替换后，可直接送入 LLM 的消息体） */
export interface CompiledPrompt {
  promptId: string;
  version: string;
  systemMessage: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  variables: Record<string, string>;
  maxTokens: number;
}

/** Prompt 模板渲染上下文 */
export interface PromptRenderContext {
  promptId: string;
  version?: string;
  variables: Record<string, string>;
  /** 运行时可选覆盖 */
  overrides?: {
    maxTokens?: number;
    temperature?: number;
    provider?: string;
    model?: string;
  };
}

// ── 服务接口 ────────────────────────────────────────────────────

/** Prompt 注册中心服务契约 */
export interface IPromptRegistryService {
  /** 注册新 Prompt */
  register(data: Omit<PromptData, 'createdAt' | 'updatedAt'>): Promise<PromptData>;
  /** 按 promptId 获取当前版本 */
  get(promptId: string): Promise<PromptData | null>;
  /** 按分类列表 */
  listByCategory(category: PromptCategory): Promise<PromptData[]>;
  /** 编译渲染 Prompt */
  render(context: PromptRenderContext): Promise<CompiledPrompt>;
  /** 创建新版本 */
  createVersion(data: Omit<PromptVersionData, 'createdAt' | 'updatedAt'>): Promise<PromptVersionData>;
  /** 发布版本 */
  publishVersion(promptId: string, version: string): Promise<PromptVersionData>;
}

/** Prompt 执行器服务契约 */
export interface IPromptExecutorService {
  /** 执行 Prompt 并返回 LLM 输出 */
  execute(context: PromptRenderContext): Promise<{ content: string; tokenUsage: { prompt: number; completion: number; total: number } }>;
}
