// ============================================================
// DZS Web Console — API 客户端（统一契约层）
// 所有API返回 { success: true, data: T, timestamp: string, source: string }
// 所有页面通过 result.data.xxx 访问数据
// ============================================================

import axios from 'axios';

// ============================================================
// 统一 API 响应类型
// ============================================================
export interface APIResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  source: string;
}

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// 八字排盘
// ============================================================
export interface BaziInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: string;
  longitude?: number;
  birthPlace?: string;
  useTrueSolar?: boolean;
}

export interface BaziPillar {
  heavenlyStem: string;
  earthlyBranch: string;
  full: string;
  nayin: string;
  hiddenStems: string[];
  kongWang: string[];
  tenGod?: string;
}

export interface BaziResult {
  pillars: {
    year: BaziPillar;
    month: BaziPillar;
    day: BaziPillar;
    hour: BaziPillar;
  };
  dayMaster: string;
  dayMasterElement: string;
  gender: string;
  elementBalance: {
    scores: Record<string, number>;
    percentage: Record<string, number>;
    totalScore: number;
  };
  strength: {
    bodyStrength: string;
    strengthScore: number;
    deLing: boolean;
    deDi: boolean;
    deShi: boolean;
    rootBranches: string[];
    supportPower: number;
    opposePower: number;
    description: string;
  };
  usefulGod: {
    yongShen: string[];
    xiShen: string[];
    jiShen: string[];
    balanceState: string;
    missing: string[];
    excess: string[];
  };
  trueSolarTime?: {
    hour: number;
    minute: number;
    shichen: string;
    crossed: boolean;
    offsetMinutes: number;
  };
}

export async function calculateBazi(input: BaziInput): Promise<APIResponse<BaziResult>> {
  const { data } = await api.post<APIResponse<BaziResult>>('/bazi/calculate', input);
  return data;
}

// ============================================================
// 五行能量分析
// ============================================================
export interface EnergyAnalysisInput {
  baziResult: { elementBalance: { scores: Record<string, number> } };
  monthBranch: string;
  currentYear?: number;
}

export interface EnergyFieldItem {
  base: number;
  seasonalBoost: number;
  finalScore: number;
  finalPercent: number;
}

export interface WuxingEnergyResult {
  energyField: {
    wood: EnergyFieldItem;
    fire: EnergyFieldItem;
    earth: EnergyFieldItem;
    metal: EnergyFieldItem;
    water: EnergyFieldItem;
  };
  totalEnergy: number;
  dominantElement: string;
  balanceState: string;
  stability: number;
}

export async function analyzeEnergy(input: EnergyAnalysisInput): Promise<APIResponse<WuxingEnergyResult>> {
  const { data } = await api.post<APIResponse<WuxingEnergyResult>>('/energy/analyze', input);
  return data;
}

// ============================================================
// 九宫飞星
// ============================================================
export interface PalaceData {
  position: number;
  name: string;
  direction: string;
  star: {
    number: number;
    name: string;
    wuxing: string;
    type: string;
    color: string;
  };
  energy: number;
  type: string;
  suitable?: string[];
  avoid?: string[];
}

export interface NinePalaceResult {
  palaces: PalaceData[];
  year: PalaceData[];
  month: PalaceData[];
  day: PalaceData[];
  summary: {
    bestDirection: string;
    worstDirection: string;
    auspiciousStars: number[];
    inauspiciousStars: number[];
    bestTime: string;
  };
  text: string;
}

export async function calculateNinePalaceApi(year: number, month: number, day: number): Promise<APIResponse<NinePalaceResult>> {
  const { data } = await api.post<APIResponse<NinePalaceResult>>('/nine-palace/calculate', { year, month, day });
  return data;
}

// ============================================================
// AI 生成
// ============================================================
export interface AiGenerateInput {
  type: string;
  prompt: string;
  systemPrompt: string;
  baziData?: any;
  energyData?: any;
}

export interface AiGenerateResult {
  output: string;
  validation: { passed: boolean; errors: string[]; warnings: string[] };
  tokenUsage: { prompt: number; completion: number; total: number };
  riskCheck: { passed: boolean; warnings: string[] };
}

// V2 API 基础地址
const v2Api = axios.create({
  baseURL: '/api/v2',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

export async function generateAI(input: AiGenerateInput): Promise<APIResponse<AiGenerateResult>> {
  // 自动获取 token（兼容 H5 页面未有 token 的场景）
  let token = typeof window !== 'undefined' ? localStorage.getItem('dzs_v2_token') : null;

  if (!token) {
    // 尝试自动游客登录
    try {
      const guestRes = await axios.post('/api/v2/auth/guest', {}, { timeout: 5000 });
      if (guestRes.data?.accessToken) {
        token = guestRes.data.accessToken;
        localStorage.setItem('dzs_v2_token', token!);
      }
    } catch { /* 静默失败，无 token 走 V1 降级 */ }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    // 调用 V2 AI Runtime
    const { data } = await axios.post('/api/v2/ai-runtime/generate', {
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.baziData
          ? `【八字数据】\n${JSON.stringify(input.baziData, null, 2)}\n\n【用户问题】\n${input.prompt}`
          : input.prompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
    }, { headers, timeout: 60000 });

    return {
      success: true,
      data: {
        output: data.content || '',
        validation: { passed: true, errors: [], warnings: [] },
        tokenUsage: {
          prompt: data.usage?.promptTokens || 0,
          completion: data.usage?.completionTokens || 0,
          total: data.usage?.totalTokens || 0,
        },
        riskCheck: { passed: true, warnings: [] },
      },
      timestamp: new Date().toISOString(),
      source: 'v2-ai-runtime',
    };
  } catch (err: any) {
    // V2 失败时尝试 V1（兼容旧版）
    if (token) {
      try {
        const { data } = await api.post<APIResponse<AiGenerateResult>>('/ai/generate', input);
        return data;
      } catch { /* V1 also failed */ }
    }
    // 返回失败结果 — 前端应有合理降级处理
    return {
      success: false,
      data: {
        output: '',
        validation: { passed: false, errors: ['AI 服务暂不可用'], warnings: [] },
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        riskCheck: { passed: false, warnings: ['AI 服务降级'] },
      },
      timestamp: new Date().toISOString(),
      source: 'fallback',
    };
  }
}

// ============================================================
// CV 空间扫描
// ============================================================
export interface CVElement {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  wuxing: string;
}

export interface CVSpatialMapping {
  palace: string;
  elements: Array<{ type: string; x: number; y: number }>;
}

export interface CVConflict {
  type: string;
  description: string;
  severity: string;
  remedy: string;
}

export interface CVAdvice {
  type: string;
  content: string;
}

export interface CVScanResult {
  elements: CVElement[];
  spatialMap: CVSpatialMapping[];
  confidence: number;
  conflicts: CVConflict[];
  advice: CVAdvice[];
}

export async function analyzeCVScan(input: Record<string, any>): Promise<APIResponse<CVScanResult>> {
  const { data } = await api.post<APIResponse<CVScanResult>>('/cv/analyze', input, { timeout: 60000 });
  return data;
}

// ============================================================
// 验证状态
// ============================================================
export interface ValidationStatus {
  passed: boolean;
  errors: number;
  warnings: number;
  lastCheck: string;
}

export async function getValidationStatus(): Promise<APIResponse<ValidationStatus>> {
  const { data } = await api.get<APIResponse<ValidationStatus>>('/validation/status');
  return data;
}

export default api;
