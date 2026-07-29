// ============================================================
// AI Runtime — React Query Hooks
// 统一数据获取层，连接到 /api/v2/ai-runtime/
// ============================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';

const AI_API = '/api/v2/ai-runtime';

async function fetchWithAuth(url: string, options?: RequestInit) {
  const token = useAuthStore.getState().token;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      // 401/403 时静默返回空对象，避免触发 React 错误覆盖层
      if (res.status === 401 || res.status === 403) return null;
      throw new Error(await res.text().catch(() => res.statusText));
    }
    return res.json();
  } catch {
    return null;
  }
}

// ============================================================
// Query Keys
// ============================================================
export const aiRuntimeKeys = {
  health: ['ai-runtime', 'health'] as const,
  models: ['ai-runtime', 'models'] as const,
  tokenStats: ['ai-runtime', 'stats', 'tokens'] as const,
  providerStats: ['ai-runtime', 'stats', 'providers'] as const,
  cacheStats: ['ai-runtime', 'stats', 'cache'] as const,
  config: ['ai-runtime', 'config'] as const,
};

// ============================================================
// 健康状态
// ============================================================
export function useAIHealth() {
  return useQuery({
    queryKey: aiRuntimeKeys.health,
    queryFn: () => fetchWithAuth(`${AI_API}/health`),
    refetchInterval: 30000,
  });
}

// ============================================================
// 模型列表
// ============================================================
export function useModelList() {
  return useQuery({
    queryKey: aiRuntimeKeys.models,
    queryFn: () => fetchWithAuth(`${AI_API}/models`),
    staleTime: 60000,
  });
}

// ============================================================
// Token 统计
// ============================================================
export function useTokenStats() {
  return useQuery({
    queryKey: aiRuntimeKeys.tokenStats,
    queryFn: () => fetchWithAuth(`${AI_API}/stats/tokens`),
    refetchInterval: 60000,
  });
}

// ============================================================
// Provider 统计
// ============================================================
export function useProviderStats() {
  return useQuery({
    queryKey: aiRuntimeKeys.providerStats,
    queryFn: () => fetchWithAuth(`${AI_API}/stats/providers`),
    refetchInterval: 60000,
  });
}

// ============================================================
// 缓存统计
// ============================================================
export function useCacheStats() {
  return useQuery({
    queryKey: aiRuntimeKeys.cacheStats,
    queryFn: () => fetchWithAuth(`${AI_API}/stats/cache`),
    refetchInterval: 60000,
  });
}

// ============================================================
// 运行时配置
// ============================================================
export function useRuntimeConfig() {
  return useQuery({
    queryKey: aiRuntimeKeys.config,
    queryFn: () => fetchWithAuth(`${AI_API}/config`),
    staleTime: 30000,
  });
}

// ============================================================
// 更新运行时配置
// ============================================================
export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: any) =>
      fetchWithAuth(`${AI_API}/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-runtime', 'config'] }),
  });
}

// ============================================================
// 测试 Provider 连接
// ============================================================
export function useTestProvider() {
  return useMutation({
    mutationFn: (providerName: string) =>
      fetchWithAuth(`${AI_API}/providers/${providerName}/test`, { method: 'POST' }),
  });
}
