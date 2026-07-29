'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Cpu, Wind, Grid3X3, Brain, Scan,
  FileText, Server, MessageSquareCode, Workflow, Settings,
} from 'lucide-react';
import { useEffect } from 'react';
import { useSystemStore, useBaziStore } from '@/store';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';

const NAV_ITEMS = [
  { href: '/console/dashboard', label: '仪表盘', icon: LayoutDashboard, color: '#f59e0b' },
  { href: '/console/bazi', label: '八字排盘', icon: Cpu, color: '#2ECC71' },
  { href: '/console/wuxing', label: '五行能量', icon: Wind, color: '#E74C3C' },
  { href: '/console/jiugong', label: '九宫飞星', icon: Grid3X3, color: '#3498DB' },
  { href: '/console/ai-debug', label: 'AI调试', icon: Brain, color: '#9B59B6' },
  { href: '/console/cv-scan', label: 'CV扫描', icon: Scan, color: '#1ABC9C' },
  { href: '/console/ai-runtime', label: 'AI运行引擎', icon: Server, color: '#8B5CF6' },
  { href: '/console/workflow', label: '工作流引擎', icon: Workflow, color: '#06b6d4' },
  { href: '/console/prompt-center', label: '提示词中心', icon: MessageSquareCode, color: '#f59e0b' },
  { href: '/console/report', label: 'AI报告中心', icon: FileText, color: '#F39C12' },
  { href: '/console/provider-config', label: 'AI服务配置', icon: Settings, color: '#f59e0b' },
];

import { ConsoleGate } from '@/lib/console-gate';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isConnected, setConnected } = useSystemStore();
  const baziStore = useBaziStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    setConnected(true);
    const interval = setInterval(() => setConnected(true), 30000);
    return () => clearInterval(interval);
  }, [setConnected]);

  // 从 sessionStorage 恢复排盘数据（适配从首页 <a> 导航过来的情况）
  useEffect(() => {
    if (!baziStore.result) {
      try {
        const stored = sessionStorage.getItem('dzs_bazi_result');
        if (stored) {
          const parsed = JSON.parse(stored);
          baziStore.setResult(parsed);
        }
      } catch {}
    }
  }, []);

  // 自动 JWT 游客登录（所有控制台页面共享）
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token) return;
    fetch('/api/v2/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.accessToken) {
          localStorage.setItem('dzs_v2_token', data.accessToken);
          localStorage.setItem('dzs_v2_refresh', data.refreshToken || '');
          localStorage.setItem('dzs_v2_user', JSON.stringify(data.user || {}));
          useAuthStore.getState().setToken(
            data.accessToken,
            data.refreshToken || '',
            data.user || { id: '', nickname: 'Guest', role: 'user', isGuest: true },
          );
          // 登录完成后立即刷新 Provider Config 等需要认证的数据
          queryClient.invalidateQueries({ queryKey: ['provider-config'] });
          queryClient.refetchQueries({ queryKey: ['provider-config'] });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <ConsoleGate>
    <div className="flex h-screen">
      {/* 左侧导航 */}
      <aside className="w-64 flex-shrink-0 border-r border-[#1e293b] bg-[#0f1525] flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1e293b]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-black font-bold text-sm">{'道'}</div>
          <div>
            <div className="text-[#f59e0b] font-bold text-sm tracking-wider">DZS-OS</div>
            <div className="text-[#64748b] text-[10px]">v1.0.0 · 道之自然命理OS</div>
          </div>
        </div>

        {/* 导航项 */}
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]'
                    : 'text-[#94a3b8] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#e2e8f0]',
                )}
              >
                <Icon size={18} style={{ color: isActive ? '#f59e0b' : item.color }} />
                <span>{item.label}</span>
                {isActive && <div className="ml-auto w-1 h-4 bg-[#f59e0b] rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* 底部状态 */}
        <div className="px-4 py-3 border-t border-[#1e293b]">
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            <div className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-[#2ECC71]' : 'bg-[#E74C3C]')} />
            <span>{isConnected ? 'DZS Kernel 运行中' : '离线'}</span>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-screen" style={{
          backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}>
          {children}
        </div>
      </main>
    </div>
    </ConsoleGate>
  );
}
