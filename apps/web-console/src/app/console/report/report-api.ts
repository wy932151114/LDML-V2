// ============================================================
// DZS-OS V2 — Report API Client
// ============================================================

const BASE = '/api/v2/report';

// ============================================================
// Token 自动刷新（JWT 过期检查 + Refresh Token 机制）
// ============================================================
let _refreshing = false;

function _decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

async function _tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('dzs_v2_refresh');
  if (!refreshToken || _refreshing) return false;
  _refreshing = true;
  try {
    const res = await fetch('/api/v2/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const newToken = data.accessToken;
    const newRefresh = data.refreshToken || refreshToken;
    localStorage.setItem('dzs_v2_token', newToken);
    localStorage.setItem('dzs_v2_refresh', newRefresh);
    // 同步更新 Zustand 状态
    try {
      const { useAuthStore } = await import('@/store/auth');
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.getState().setToken(newToken, newRefresh, user);
    } catch {}
    return true;
  } catch {
    return false;
  } finally {
    _refreshing = false;
  }
}

export interface Report {
  id: string;
  userId: string;
  type: string;
  status: string;
  sections: ReportSection[];
  tokenUsage?: TokenUsage;
  exports: ExportRecord[];
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  order: number;
  type?: string;
}

export interface TokenUsage {
  totalTokens: number;
  modelVersion: string;
}

export interface ExportRecord {
  format: string;
  url: string;
  fileSize: number;
}

export interface ReportJobStatus {
  jobId: string;
  status: string;
  progressPercent: number;
  progressMessage?: string;
}

export interface PaginatedReports {
  items: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function request<T>(url: string, options?: RequestInit, _retried?: boolean): Promise<T> {
  // 1) 预刷新：如果 Token 即将过期（< 60秒），提前刷新
  let token = localStorage.getItem('dzs_v2_token');
  if (token && !_retried) {
    const payload = _decodeJwt(token);
    if (payload && payload.exp * 1000 < Date.now() + 60000) {
      const ok = await _tryRefreshToken();
      if (ok) token = localStorage.getItem('dzs_v2_token');
    }
  }
  // 2) 发起请求
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  // 3) 收到 401 时自动刷新 Token 并重试一次（避免并发重复刷新）
  if (res.status === 401 && !_retried) {
    const ok = await _tryRefreshToken();
    if (ok) return request<T>(url, options, true);
  }
  // 4) 错误处理
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res as any;
}

export const reportApi = {
  generate: (type: string, baziData?: any) =>
    request<ReportJobStatus>(`${BASE}/generate`, {
      method: 'POST',
      body: JSON.stringify({ type, baziData }),
    }),

  list: (page: number = 1, limit: number = 20, type?: string, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    return request<PaginatedReports>(`${BASE}?${params}`);
  },

  get: (id: string) =>
    request<Report>(`${BASE}/${id}`),

  delete: (id: string) =>
    request<{ success: boolean }>(`${BASE}/${id}`, { method: 'DELETE' }),

  batchDelete: (ids: string[]) =>
    request<{ success: boolean }>(`${BASE}/batch-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  getJobProgress: (jobId: string) =>
    request<ReportJobStatus>(`${BASE}/job/${jobId}`),

  export: async (id: string, format: 'html' | 'pdf' | 'markdown'): Promise<Blob> => {
    const token = localStorage.getItem('dzs_v2_token');
    const res = await fetch(`${BASE}/export/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reportId: id, format }),
    });
    if (!res.ok) throw new Error('导出失败');
    return res.blob();
  },
};
