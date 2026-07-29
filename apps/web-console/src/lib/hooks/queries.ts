// ============================================================
// DZS Web Console — React Query Hooks
// 统一API调用层，所有页面通过 hooks 发起请求
// ============================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  calculateBazi,
  analyzeEnergy,
  calculateNinePalaceApi,
  generateAI,
  analyzeCVScan,
  getValidationStatus,
  type BaziInput,
  type BaziResult,
  type EnergyAnalysisInput,
  type WuxingEnergyResult,
  type NinePalaceResult,
  type AiGenerateInput,
  type AiGenerateResult,
  type CVScanResult,
  type ValidationStatus,
  type APIResponse,
} from '../api';

// ============================================================
// Query Keys
// ============================================================
export const queryKeys = {
  bazi: ['bazi'] as const,
  energy: ['energy'] as const,
  ninePalace: (year: number, month: number, day: number) => ['nine-palace', year, month, day] as const,
  validation: ['validation'] as const,
};

// ============================================================
// 八字排盘 Hook
// ============================================================
export function useBaziMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BaziInput) => calculateBazi(input),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.setQueryData(queryKeys.bazi, res.data);
      }
    },
  });
}

export function useBaziResult() {
  return useQuery({
    queryKey: queryKeys.bazi,
    queryFn: () => null as BaziResult | null,
    enabled: false,
    initialData: null,
  });
}

// ============================================================
// 五行能量 Hook
// ============================================================
export function useEnergyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EnergyAnalysisInput) => analyzeEnergy(input),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.setQueryData(queryKeys.energy, res.data);
      }
    },
  });
}

// ============================================================
// 九宫飞星 Hook
// ============================================================
export function useNinePalaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month, day }: { year: number; month: number; day: number }) =>
      calculateNinePalaceApi(year, month, day),
    onSuccess: (res, vars) => {
      if (res.success) {
        queryClient.setQueryData(queryKeys.ninePalace(vars.year, vars.month, vars.day), res.data);
      }
    },
  });
}

// ============================================================
// AI 生成 Hook
// ============================================================
export function useAiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AiGenerateInput) => generateAI(input),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.setQueryData(['ai-result'], res.data);
      }
    },
  });
}

// ============================================================
// CV 扫描 Hook
// ============================================================
export function useCVMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, any>) => analyzeCVScan(input),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.setQueryData(['cv-result'], res.data);
      }
    },
  });
}

// ============================================================
// 验证状态 Hook
// ============================================================
export function useValidationQuery() {
  return useQuery({
    queryKey: queryKeys.validation,
    queryFn: async () => {
      const res = await getValidationStatus();
      return res.success ? res.data : null;
    },
    refetchInterval: 30000,
  });
}

// ============================================================
// Workflow — React Query Hooks
// ============================================================

const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dzs_v2_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...options?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || `请求失败 ${res.status}`);
  return data;
}

// ── Query Keys ──
export const workflowKeys = {
  all: ['workflows'] as const,
  list: (query?: string) => ['workflows', 'list', query] as const,
  detail: (id: string) => ['workflows', id] as const,
  stats: ['workflows', 'stats'] as const,
  executions: (workflowId?: string) => ['workflows', 'executions', workflowId] as const,
  templates: ['workflows', 'templates'] as const,
};

// ── Types ──
export interface WorkflowListItem {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  nodeCount?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowDetail {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  nodes: any[];
  edges: any[];
  variables?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowStats {
  total: number;
  active: number;
  draft: number;
  paused: number;
  archived: number;
  executionsToday: number;
  successRate: number;
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
  error?: string;
}

export interface WorkflowTemplate {
  templateId: string;
  name: string;
  description?: string;
  category?: string;
  nodeCount: number;
  tags?: string[];
}

// ── Hooks: 列表 ──
export function useWorkflows(query?: string) {
  return useQuery({
    queryKey: workflowKeys.list(query),
    queryFn: async (): Promise<WorkflowListItem[]> => {
      const params = query ? `?q=${encodeURIComponent(query)}` : '?limit=100';
      const data = await fetchWithAuth<any>(`/api/v2/workflows${params}`);
      if (data?.workflows) return data.workflows;
      if (Array.isArray(data)) return data;
      return [];
    },
  });
}

// ── Hooks: 详情 ──
export function useWorkflow(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.detail(workflowId),
    queryFn: async (): Promise<WorkflowDetail | null> => {
      const data = await fetchWithAuth<any>(`/api/v2/workflows/${workflowId}`);
      return data?.workflow || data || null;
    },
    enabled: !!workflowId,
  });
}

// ============================================================
// Provider Config — React Query Hooks
// ============================================================

export interface ProviderConfigItem {
  name: string;
  displayName: string;
  type: string;
  apiKeyMasked: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  rpm: number;
  tpm: number;
  maxRetries: number;
  retryDelay: number;
  organization?: string;
  extraHeaders: Record<string, string>;
  isBuiltin: boolean;
  lastTestResult?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    model: string;
    error?: string;
    timestamp: string;
  };
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestConnectionResult {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  model: string;
  error?: string;
  timestamp: string;
}

export const providerConfigKeys = {
  all: ['provider-config'] as const,
};

async function providerConfigFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dzs_v2_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
    const data = await res.json();
    if (!res.ok) {
      // 401/403 时返回空数组而非抛错
      if (res.status === 401 || res.status === 403) return ([] as unknown) as T;
      throw new Error(data?.message || data?.error || `请求失败 ${res.status}`);
    }
    return data;
  } catch {
    return ([] as unknown) as T;
  }
}

export function useProviderConfigs(enabled?: boolean) {
  return useQuery({
    queryKey: providerConfigKeys.all,
    queryFn: async (): Promise<ProviderConfigItem[]> => {
      const data = await providerConfigFetch<any>('/api/v2/provider-config');
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled ?? true,
    refetchInterval: (query) => {
      // 如果数据为空（还没拿到 token），每 3 秒重试
      if (query.state.data && Array.isArray(query.state.data) && query.state.data.length === 0) {
        return 3000;
      }
      return 30000;
    },
    staleTime: 0,
    retry: 3,
    retryDelay: 2000,
  });
}

export function useUpdateProviderConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, ...data }: { name: string } & Record<string, any>) => {
      return providerConfigFetch<any>(`/api/v2/provider-config/${encodeURIComponent(name)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerConfigKeys.all });
    },
  });
}

export function useTestProviderConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<TestConnectionResult> => {
      return providerConfigFetch<any>(`/api/v2/provider-config/${encodeURIComponent(name)}/test`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerConfigKeys.all });
    },
  });
}

// ── Hooks: 统计 ──
export function useWorkflowStats() {
  return useQuery({
    queryKey: workflowKeys.stats,
    queryFn: async (): Promise<WorkflowStats | null> => {
      const data = await fetchWithAuth<any>('/api/v2/workflows/stats');
      return data?.stats || data || null;
    },
  });
}

// ── Hooks: 模板列表 ──
export function useWorkflowTemplates() {
  return useQuery({
    queryKey: workflowKeys.templates,
    queryFn: async (): Promise<WorkflowTemplate[]> => {
      const data = await fetchWithAuth<any>('/api/v2/workflows/templates');
      if (data?.templates) return data.templates;
      if (Array.isArray(data)) return data;
      return [];
    },
  });
}

// ── Mutations ──

// 创建工作流
export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; category?: string; tags?: string[] }) => {
      return fetchWithAuth<any>('/api/v2/workflows', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

// 保存工作流
export function useSaveWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, ...data }: { workflowId: string; name?: string; description?: string; nodes?: any[]; edges?: any[]; variables?: string[]; status?: string }) => {
      return fetchWithAuth<any>(`/api/v2/workflows/${workflowId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(vars.workflowId) });
    },
  });
}

// 删除工作流
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workflowId: string) => {
      return fetchWithAuth<any>(`/api/v2/workflows/${workflowId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}

// 执行工作流
export function useExecuteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, input }: { workflowId: string; input?: Record<string, any> }) => {
      return fetchWithAuth<any>(`/api/v2/workflows/${workflowId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ input: input || {} }),
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(vars.workflowId) });
    },
  });
}

// 停止工作流执行
export function useStopWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, executionId }: { workflowId: string; executionId: string }) => {
      return fetchWithAuth<any>(`/api/v2/workflows/${workflowId}/executions/${executionId}/stop`, {
        method: 'POST',
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(vars.workflowId) });
    },
  });
}

// ── Hooks: 执行记录 ──
export function useWorkflowExecutions(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.executions(workflowId),
    queryFn: async (): Promise<WorkflowExecution[]> => {
      const data = await fetchWithAuth<any>(`/api/v2/workflows/${workflowId}/executions?limit=50`);
      if (data?.executions) return data.executions;
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!workflowId,
  });
}
