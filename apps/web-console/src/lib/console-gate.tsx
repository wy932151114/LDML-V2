'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, KeyRound } from 'lucide-react';

const CONSOLE_PIN_KEY = 'dzs_console_auth';

export function ConsoleGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(CONSOLE_PIN_KEY);
    if (stored === 'granted') setAuthed(true);
    else setAuthed(false);
  }, []);

  const handleLogin = () => {
    // 默认密码: 888888（勇哥可修改），可从环境变量读取
    const validPin = process.env.NEXT_PUBLIC_CONSOLE_PIN || '888888';
    if (pin === validPin) {
      localStorage.setItem(CONSOLE_PIN_KEY, 'granted');
      setAuthed(true);
    } else {
      setError('密码错误');
      setTimeout(() => setError(''), 2000);
    }
  };

  if (authed === null) return null; // 加载中

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0] flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-black font-bold text-2xl shadow-lg shadow-[#f59e0b]/20">
              <Shield size={28} />
            </div>
            <h1 className="text-xl font-bold tracking-wider text-[#f59e0b]">DZS-OS Console</h1>
            <p className="text-sm text-[#64748b] mt-2">管理后台需要密码验证</p>
          </div>

          <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={14} className="text-[#f59e0b]" />
              <span className="text-xs text-[#94a3b8]">请输入访问密码</span>
            </div>

            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="输入密码"
              className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-xl px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none mb-3"
              autoFocus
            />

            {error && (
              <p className="text-xs text-[#E74C3C] mb-3 text-center">{error}</p>
            )}

            <button onClick={handleLogin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2">
              <KeyRound size={16} />
              验证身份
            </button>

            <p className="text-[10px] text-[#4a5a6e] text-center mt-4">
              提示：默认密码 888888
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
