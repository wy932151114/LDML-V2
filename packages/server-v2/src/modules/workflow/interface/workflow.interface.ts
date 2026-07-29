// ============================================================
// DZS-OS V2 — Workflow Engine Interfaces
// 核心类型定义（不含装饰器，可供 domain / service 层复用）
// ============================================================

// ── 枚举 / 联合类型 ────────────────────────────────────────────

/** 工作流节点类型 */
export type WorkflowNodeType =
  | 'START'
  | 'END'
  | 'AI_RUNTIME'
  | 'PROMPT'
  | 'REPORT'
  | 'CONDITION'
  | 'DELAY'
  | 'HTTP'
  | 'DATABASE'
  | 'CUSTOM';

/** 工作流状态 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

/** 工作流执行状态 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

/** 节点执行状态 */
export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// ── 基础几何类型 ────────────────────────────────────────────────

/** 节点在画布上的位置 */
export interface WorkflowNodePosition {
  x: number;
  y: number;
}

// ── 核心数据接口 ────────────────────────────────────────────────

/** 工作流边（连线） */
export interface WorkflowEdge {
  edgeId: string;
  source: string;
  target: string;
  label?: string;
}

/** 工作流节点 */
export interface WorkflowNode {
  nodeId: string;
  type: WorkflowNodeType;
  label: string;
  position: WorkflowNodePosition;
  /** 节点配置（根据 type 不同含不同配置项） */
  config?: Record<string, unknown>;
  /** 后续节点 ID（多分支时需配合 condition 判断） */
  next?: string | string[];
  /** 条件表达式（CONDITION 类型节点使用） */
  condition?: string;
}

/** 全量工作流数据（对应 workflow.schema.ts） */
export interface WorkflowData {
  workflowId: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  version: number;
  tags: string[];
  category?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 工作流执行记录数据 */
export interface WorkflowExecutionData {
  executionId: string;
  workflowId: string;
  workflowName?: string;
  workflowVersion: number;
  status: ExecutionStatus;
  triggeredBy: string;
  triggerType: 'manual' | 'scheduled' | 'event' | 'api';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  nodeResults?: WorkflowNodeResult[];
  logs?: WorkflowLogEntry[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 工作流模板数据 */
export interface WorkflowTemplateData {
  templateId: string;
  name: string;
  description?: string;
  category?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tags: string[];
  variables: string[];
  version: number;
  isBuiltin: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 节点执行结果 */
export interface WorkflowNodeResult {
  nodeId: string;
  nodeType: WorkflowNodeType;
  nodeLabel: string;
  status: NodeStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  retryCount: number;
}

/** 工作流日志条目 */
export interface WorkflowLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  nodeId?: string;
  message: string;
  data?: Record<string, unknown>;
}

/** 工作流统计数据 */
export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  runningExecutions: number;
  averageDuration: number;
  executionsByStatus?: Record<string, number>;
  executionsByDay?: Array<{ date: string; count: number }>;
}

// ── 服务接口 ────────────────────────────────────────────────────

/** 工作流引擎服务契约 */
export interface IWorkflowEngineService {
  /** 创建新工作流 */
  create(data: Omit<WorkflowData, 'createdAt' | 'updatedAt' | 'version'>): Promise<WorkflowData>;
  /** 按 workflowId 获取工作流 */
  get(workflowId: string): Promise<WorkflowData | null>;
  /** 更新工作流 */
  update(workflowId: string, data: Partial<WorkflowData>): Promise<WorkflowData>;
  /** 删除工作流 */
  delete(workflowId: string): Promise<void>;
  /** 列出工作流（分页） */
  list(filter?: { status?: WorkflowStatus; keyword?: string; page?: number; limit?: number }): Promise<{ items: WorkflowData[]; total: number; page: number; limit: number }>;
  /** 执行工作流 */
  execute(workflowId: string, input?: Record<string, unknown>): Promise<WorkflowExecutionData>;
  /** 停止执行 */
  stopExecution(executionId: string): Promise<void>;
  /** 验证工作流拓扑合法性 */
  validate(workflowId: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
  /** 导入工作流 */
  import(data: ImportExportData): Promise<WorkflowData>;
  /** 导出工作流 */
  export(workflowId: string): Promise<ImportExportData>;
}

/** 工作流模板服务契约 */
export interface IWorkflowTemplateService {
  /** 从工作流创建模板 */
  createFromWorkflow(workflowId: string, data: { name: string; description?: string; category?: string }): Promise<WorkflowTemplateData>;
  /** 从模板创建工作流 */
  createWorkflowFromTemplate(templateId: string, overrides?: { name?: string; description?: string }): Promise<WorkflowData>;
  /** 按模板 ID 获取 */
  get(templateId: string): Promise<WorkflowTemplateData | null>;
  /** 列出模板 */
  list(filter?: { category?: string; keyword?: string; page?: number; limit?: number }): Promise<{ items: WorkflowTemplateData[]; total: number; page: number; limit: number }>;
  /** 删除模板 */
  delete(templateId: string): Promise<void>;
}

/** 导入/导出数据 */
export interface ImportExportData {
  version: string;
  type: 'workflow' | 'template';
  data: Record<string, unknown>;
  exportedAt: Date;
  exportedBy: string;
}
