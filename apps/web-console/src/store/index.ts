// ============================================================
// DZS Web Console — 全局状态（Zustand）
// ============================================================

import { create } from 'zustand';
import type { BaziResult, WuxingEnergyResult, NinePalaceResult, AiGenerateResult, CVScanResult, ValidationStatus } from '@/lib/api';

// ============================================================
// 系统状态
// ============================================================
interface SystemState {
  isConnected: boolean;
  lastSync: string | null;
  validationStatus: ValidationStatus | null;
  systemMode: 'online' | 'offline' | 'degraded';
  setConnected: (v: boolean) => void;
  setValidationStatus: (s: ValidationStatus) => void;
  setSystemMode: (m: 'online' | 'offline' | 'degraded') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  isConnected: false,
  lastSync: null,
  validationStatus: null,
  systemMode: 'offline',
  setConnected: (v) => set({ isConnected: v, lastSync: new Date().toISOString() }),
  setValidationStatus: (s) => set({ validationStatus: s }),
  setSystemMode: (m) => set({ systemMode: m }),
}));

// ============================================================
// 八字状态
// ============================================================
interface BaziState {
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    gender: string;
    longitude?: number;
    birthPlace?: string;
    useTrueSolar: boolean;
  };
  result: BaziResult | null;
  loading: boolean;
  error: string | null;
  setInput: (partial: Partial<BaziState['input']>) => void;
  setResult: (r: BaziResult | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

const defaultInput = {
  year: new Date().getFullYear() - 30,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: '男',
  longitude: 120,
  birthPlace: '北京',
  useTrueSolar: false,
};

export const useBaziStore = create<BaziState>((set) => ({
  input: { ...defaultInput },
  result: null,
  loading: false,
  error: null,
  setInput: (partial) => set((s) => ({ input: { ...s.input, ...partial } })),
  setResult: (r) => set({ result: r, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
  reset: () => set({ input: { ...defaultInput }, result: null, error: null }),
}));

// ============================================================
// 五行能量状态
// ============================================================
interface WuxingState {
  result: WuxingEnergyResult | null;
  loading: boolean;
  error: string | null;
  setResult: (r: WuxingEnergyResult | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useWuxingStore = create<WuxingState>((set) => ({
  result: null,
  loading: false,
  error: null,
  setResult: (r) => set({ result: r }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
}));

// ============================================================
// 九宫飞星状态
// ============================================================
interface JiugongState {
  date: { year: number; month: number; day: number };
  result: NinePalaceResult | null;
  selectedPalace: number | null;
  loading: boolean;
  error: string | null;
  setDate: (d: Partial<JiugongState['date']>) => void;
  setResult: (r: NinePalaceResult | null) => void;
  setSelectedPalace: (n: number | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useJiugongStore = create<JiugongState>((set) => ({
  date: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  },
  result: null,
  selectedPalace: null,
  loading: false,
  error: null,
  setDate: (d) => set((s) => ({ date: { ...s.date, ...d } })),
  setResult: (r) => set({ result: r }),
  setSelectedPalace: (n) => set({ selectedPalace: n }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
}));

// ============================================================
// AI 调试状态
// ============================================================
interface AiDebugState {
  prompt: string;
  systemPrompt: string;
  result: AiGenerateResult | null;
  loading: boolean;
  error: string | null;
  setPrompt: (v: string) => void;
  setSystemPrompt: (v: string) => void;
  setResult: (r: AiGenerateResult | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

const DEFAULT_SYSTEM_PROMPT = `你是道之自然命理AI系统。
核心原则：
1. 命理是基础，改命是目的
2. 必须提供解决方案
3. 禁止宿命论
4. 必须提供时辰与方位
5. 必须提供风险提示`;
export const useAiDebugStore = create<AiDebugState>((set) => ({
  prompt: '请根据提供的八字数据生成今日运势报告',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  result: null,
  loading: false,
  error: null,
  setPrompt: (v) => set({ prompt: v }),
  setSystemPrompt: (v) => set({ systemPrompt: v }),
  setResult: (r) => set({ result: r, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
}));

// ============================================================
// CV 扫描状态
// ============================================================
interface CVState {
  imagePreview: string | null;
  result: CVScanResult | null;
  loading: boolean;
  error: string | null;
  setImagePreview: (v: string | null) => void;
  setResult: (r: CVScanResult | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useCVStore = create<CVState>((set) => ({
  imagePreview: null,
  result: null,
  loading: false,
  error: null,
  setImagePreview: (v) => set({ imagePreview: v }),
  setResult: (r) => set({ result: r, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
}));

// ============================================================
// Workflow 状态
// ============================================================
export { useWorkflowStore } from './workflow';
