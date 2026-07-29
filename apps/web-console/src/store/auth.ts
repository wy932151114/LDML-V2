// ============================================================
// 道之自然 Auth Store — JWT 认证状态管理（Zustand）
// 管理登录/注册/游客登录/Token持久化
// ============================================================

import { create } from 'zustand';

interface AuthUser {
  id: string;
  email?: string;
  nickname: string;
  role: string;
  isGuest: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  showAuthModal: boolean;
  showChangePwdModal: boolean;
  login: (email: string, password: string) => Promise<string>;
  loginByEmail: (email: string, password: string) => Promise<string>;
  loginByPhone: (phone: string, password: string) => Promise<string>;
  register: (email: string, password: string, nickname?: string) => Promise<string>;
  guestLogin: () => Promise<string>;
  logout: () => void;
  setToken: (token: string, refreshToken: string, user: AuthUser) => void;
  setShowAuthModal: (v: boolean) => void;
  setShowChangePwdModal: (v: boolean) => void;
  getAuthHeaders: () => Record<string, string>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isLoggedIn: false,
  showAuthModal: false,
  showChangePwdModal: false,

  setShowAuthModal: (v) => set({ showAuthModal: v }),
  setShowChangePwdModal: (v) => set({ showChangePwdModal: v }),

  getAuthHeaders: (): Record<string, string> => {
    const t = get().token;
    if (t) return { Authorization: `Bearer ${t}` } as Record<string, string>;
    return {} as Record<string, string>;
  },

  setToken: (token, refreshToken, user) => {
    set({ token, refreshToken, user, isLoggedIn: true });
    try {
      localStorage.setItem('dzs_v2_token', token);
      localStorage.setItem('dzs_v2_refresh', refreshToken);
      localStorage.setItem('dzs_v2_user', JSON.stringify(user));
    } catch {}
  },

  login: async (email, password) => {
    const res = await fetch('/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '登录失败');
    get().setToken(data.accessToken, data.refreshToken, data.user);
    return data.accessToken;
  },

  loginByEmail: async (email, password) => {
    const res = await fetch('/api/v1/auth/login/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '登录失败');
    get().setToken(data.accessToken, data.refreshToken, data.user);
    return data.accessToken;
  },

  loginByPhone: async (phone, password) => {
    const res = await fetch('/api/v1/auth/login/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '登录失败');
    get().setToken(data.accessToken, data.refreshToken, data.user);
    return data.accessToken;
  },

  register: async (email, password, nickname) => {
    const res = await fetch('/api/v2/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '注册失败');
    get().setToken(data.accessToken, data.refreshToken, data.user);
    return data.accessToken;
  },

  guestLogin: async () => {
    const res = await fetch('/api/v2/auth/guest', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '游客登录失败');
    get().setToken(data.accessToken, data.refreshToken, data.user);
    return data.accessToken;
  },

  logout: () => {
    set({ token: null, refreshToken: null, user: null, isLoggedIn: false });
    try {
      localStorage.removeItem('dzs_v2_token');
      localStorage.removeItem('dzs_v2_refresh');
      localStorage.removeItem('dzs_v2_user');
    } catch {}
  },

  changePassword: async (oldPassword, newPassword) => {
    const token = get().token;
    if (!token) throw new Error('请先登录');
    const res = await fetch('/api/v2/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '密码修改失败');
  },
}));

// 浏览器加载时恢复登录状态
if (typeof window !== 'undefined') {
  try {
    const token = localStorage.getItem('dzs_v2_token');
    const refresh = localStorage.getItem('dzs_v2_refresh');
    const userStr = localStorage.getItem('dzs_v2_user');
    if (token && userStr) {
      useAuthStore.getState().setToken(token, refresh || '', JSON.parse(userStr));
    }
  } catch {}
}
