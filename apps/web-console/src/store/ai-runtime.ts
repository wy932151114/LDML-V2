// ============================================================
// AI Runtime Store — Zustand 状态管理
// 管理 AI Runtime 后台健康和配置状态
// ============================================================

import { create } from 'zustand';

// ============================================================
// 类型定义
// ============================================================
export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  model: string;
  error?: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
}

export interface RuntimeConfig {
  defaultProvider: string;
  defaultModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  cacheTTL: number;
}

export interface TokenStats {
  totalTokens: number;
  totalCost: number;
  callCount: number;
  avgDuration: number;
}

export interface CacheStats {
  hitRate: number;
  keys: number;
}

export interface RuntimeHealth {
  overall: string;
  providerCount: number;
  cacheEnabled: boolean;
}

// ============================================================
// Store 状态接口
// ============================================================
interface AIRuntimeState {
  providers: ProviderHealth[];
  models: ProviderModel[];
  stats: TokenStats;
  cacheStats: CacheStats;
  config: RuntimeConfig | null;
  health: RuntimeHealth;
  loading: boolean;
  error: string | null;
  setProviders: (p: ProviderHealth[]) => void;
  setModels: (m: ProviderModel[]) => void;
  setStats: (s: TokenStats) => void;
  setCacheStats: (c: CacheStats) => void;
  setConfig: (c: RuntimeConfig) => void;
  setHealth: (h: RuntimeHealth) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

const defaultStats: TokenStats = {
  totalTokens: 0,
  totalCost: 0,
  callCount: 0,
  avgDuration: 0,
};

const defaultCacheStats: CacheStats = {
  hitRate: 0,
  keys: 0,
};

const defaultHealth: RuntimeHealth = {
  overall: 'unknown',
  providerCount: 0,
  cacheEnabled: false,
};

// ============================================================
// Store
// ============================================================
export const useAIRuntimeStore = create<AIRuntimeState>((set) => ({
  providers: [],
  models: [],
  stats: { ...defaultStats },
  cacheStats: { ...defaultCacheStats },
  config: null,
  health: { ...defaultHealth },
  loading: false,
  error: null,

  setProviders: (p) => set({ providers: p }),
  setModels: (m) => set({ models: m }),
  setStats: (s) => set({ stats: s }),
  setCacheStats: (c) => set({ cacheStats: c }),
  setConfig: (c) => set({ config: c }),
  setHealth: (h) => set({ health: h }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
  reset: () =>
    set({
      providers: [],
      models: [],
      stats: { ...defaultStats },
      cacheStats: { ...defaultCacheStats },
      config: null,
      health: { ...defaultHealth },
      loading: false,
      error: null,
    }),
}));
