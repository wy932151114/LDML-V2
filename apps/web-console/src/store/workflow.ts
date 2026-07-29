// ============================================================
// DZS Web Console — Workflow 状态管理（Zustand）
// ============================================================

import { create } from 'zustand';

export type WorkflowNodeType =
  | 'START' | 'END' | 'AI_RUNTIME' | 'PROMPT' | 'REPORT'
  | 'CONDITION' | 'DELAY' | 'HTTP' | 'DATABASE' | 'CUSTOM';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  nodeId: string;
  type: WorkflowNodeType;
  label: string;
  position: WorkflowNodePosition;
  config?: Record<string, any>;
  next?: string[];
  condition?: string;
}

export interface WorkflowEdge {
  edgeId: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowData {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  triggeredBy: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  currentNodeId?: string;
  error?: string;
  nodeResults: any[];
  logs: any[];
}

interface WorkflowState {
  // 列表
  workflows: WorkflowData[];
  loading: boolean;
  error: string | null;

  // 当前选中
  selectedWorkflow: WorkflowData | null;
  editing: boolean;

  // 节点编辑
  selectedNode: WorkflowNode | null;

  // 执行
  executions: WorkflowExecution[];
  selectedExecution: WorkflowExecution | null;

  // 设计器状态
  canvasNodes: WorkflowNode[];
  canvasEdges: WorkflowEdge[];
  dirty: boolean;

  // Actions
  setWorkflows: (w: WorkflowData[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  selectWorkflow: (w: WorkflowData | null) => void;
  setEditing: (v: boolean) => void;
  selectNode: (n: WorkflowNode | null) => void;
  setCanvasNodes: (nodes: WorkflowNode[]) => void;
  setCanvasEdges: (edges: WorkflowEdge[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;
  setDirty: (v: boolean) => void;
  setExecutions: (e: WorkflowExecution[]) => void;
  selectExecution: (e: WorkflowExecution | null) => void;
  reset: () => void;
}

const initialState = {
  workflows: [],
  loading: false,
  error: null,
  selectedWorkflow: null,
  editing: false,
  selectedNode: null,
  executions: [],
  selectedExecution: null,
  canvasNodes: [],
  canvasEdges: [],
  dirty: false,
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  ...initialState,

  setWorkflows: (w) => set({ workflows: w }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),

  selectWorkflow: (w) => set({
    selectedWorkflow: w,
    editing: false,
    selectedNode: null,
    canvasNodes: w?.nodes || [],
    canvasEdges: w?.edges || [],
    dirty: false,
  }),

  setEditing: (v) => set({ editing: v }),
  selectNode: (n) => set({ selectedNode: n }),

  setCanvasNodes: (nodes) => set({ canvasNodes: nodes }),
  setCanvasEdges: (edges) => set({ canvasEdges: edges }),

  addNode: (node) => set((s) => ({
    canvasNodes: [...s.canvasNodes, node],
    dirty: true,
  })),

  updateNode: (nodeId, updates) => set((s) => ({
    canvasNodes: s.canvasNodes.map((n) =>
      n.nodeId === nodeId ? { ...n, ...updates } : n
    ),
    dirty: true,
  })),

  removeNode: (nodeId) => set((s) => ({
    canvasNodes: s.canvasNodes.filter((n) => n.nodeId !== nodeId),
    canvasEdges: s.canvasEdges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    ),
    dirty: true,
  })),

  addEdge: (edge) => set((s) => ({
    canvasEdges: [...s.canvasEdges, edge],
    dirty: true,
  })),

  removeEdge: (edgeId) => set((s) => ({
    canvasEdges: s.canvasEdges.filter((e) => e.edgeId !== edgeId),
    dirty: true,
  })),

  setDirty: (v) => set({ dirty: v }),

  setExecutions: (e) => set({ executions: e }),
  selectExecution: (e) => set({ selectedExecution: e }),

  reset: () => set(initialState),
}));
