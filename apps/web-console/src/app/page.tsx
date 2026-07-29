'use client';

import { useState, useEffect, useRef } from 'react';
import { useBaziStore } from '@/store';

// ============================================================
// 道之自然 · 命理AI系统 — 统一H5首页
// 功能涵盖：八字排盘 / 五行分析 / 大运流年 / 九宫飞星 /
//           AI改命 / CV空间扫描 / 每日运势 / 管理后台
// ============================================================

import { create } from 'zustand';
import { useAuthStore } from '@/store/auth';



// 中国主要城市经纬度表
const CITIES: { name: string; lng: number }[] = [
  { name: '北京', lng: 116.4 }, { name: '上海', lng: 121.5 },
  { name: '广州', lng: 113.3 }, { name: '深圳', lng: 114.1 },
  { name: '成都', lng: 104.1 }, { name: '杭州', lng: 120.2 },
  { name: '武汉', lng: 114.3 }, { name: '西安', lng: 108.9 },
  { name: '南京', lng: 118.8 }, { name: '重庆', lng: 106.5 },
  { name: '长沙', lng: 113.0 }, { name: '郑州', lng: 113.7 },
  { name: '青岛', lng: 120.4 }, { name: '大连', lng: 121.6 },
  { name: '昆明', lng: 102.7 }, { name: '厦门', lng: 118.1 },
];

// 时辰选项
const SHICHEN = [
  { label: '未知（默认午时）', val: '' },
  { label: '子时 23:00-00:59', val: '23' },
  { label: '丑时 01:00-02:59', val: '1' },
  { label: '寅时 03:00-04:59', val: '3' },
  { label: '卯时 05:00-06:59', val: '5' },
  { label: '辰时 07:00-08:59', val: '7' },
  { label: '巳时 09:00-10:59', val: '9' },
  { label: '午时 11:00-12:59', val: '11' },
  { label: '未时 13:00-14:59', val: '13' },
  { label: '申时 15:00-16:59', val: '15' },
  { label: '酉时 17:00-18:59', val: '17' },
  { label: '戌时 19:00-20:59', val: '19' },
  { label: '亥时 21:00-22:59', val: '21' },
];

// ============ 时辰→具体时间 辅助函数 ============

/** 根据时辰起始小时，生成每5分钟的具体时间选项（覆盖两小时，共24个） */
function getTimeOptions(shichenHour: string): { value: number; label: string }[] {
  const startHour = shichenHour ? parseInt(shichenHour) : 11; // 默认午时
  const options: { value: number; label: string }[] = [];
  for (let offset = 0; offset < 120; offset += 5) {
    const h = (startHour + Math.floor(offset / 60)) % 24;
    const m = offset % 60;
    options.push({
      value: offset,
      label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    });
  }
  return options;
}

/** 将时辰起始小时 + 分钟偏移量(0-119) 转为实际时和分 */
function offsetToActualTime(shichenHour: string, offset: number): { hour: number; minute: number } {
  const startHour = shichenHour ? parseInt(shichenHour) : 11;
  return {
    hour: (startHour + Math.floor(offset / 60)) % 24,
    minute: offset % 60,
  };
}

/** 将时辰起始小时 + 分钟偏移量(0-119) 转为显示格式 "HH:MM" */
function formatShichenTime(shichenHour: string, offset: number): string {
  const { hour, minute } = offsetToActualTime(shichenHour, offset);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 功能模块定义 */
const MODULES = [
  {
    id: 'fortune', label: '每日运势', icon: '☯️', color: '#f59e0b',
    desc: '今日宜忌 · 五行吉位 · 能量指引', href: '/h5/fortune',
    grad: 'from-amber-500/20 to-yellow-600/10', border: 'border-amber-500/20',
  },
  {
    id: 'wuxing', label: '五行能量', icon: '🔥', color: '#E74C3C',
    desc: '实时能量图谱 · 生克制化分析', href: '/h5/wuxing',
    grad: 'from-red-500/20 to-orange-600/10', border: 'border-red-500/20',
  },
  {
    id: 'dayun', label: '大运流年', icon: '📈', color: '#8E44AD',
    desc: '十年大运 · 流年吉凶 · 人生轨迹', href: '/h5/dayun',
    grad: 'from-purple-500/20 to-violet-600/10', border: 'border-purple-500/20',
  },
  {
    id: 'jiugong', label: '九宫飞星', icon: '🧭', color: '#3498DB',
    desc: '流年吉凶方位 · 空间能量布局', href: '/h5/jiugong',
    grad: 'from-blue-500/20 to-cyan-600/10', border: 'border-blue-500/20',
  },
  {
    id: 'ai', label: 'AI改命顾问', icon: '🤖', color: '#9B59B6',
    desc: '个性化改运方案 · 智能对话', href: '/h5/ai',
    grad: 'from-purple-500/20 to-pink-600/10', border: 'border-purple-500/20',
  },
  {
    id: 'cv', label: 'CV空间扫描', icon: '📷', color: '#1ABC9C',
    desc: '手机拍房间 · 风水AI分析', href: '/h5/cv-scan',
    grad: 'from-emerald-500/20 to-teal-600/10', border: 'border-emerald-500/20',
  },
  {
    id: 'console', label: '管理后台', icon: '⚙️', color: '#64748b',
    desc: 'V2报告中心 · 数据看板 · 深度分析', href: '/console/dashboard',
    grad: 'from-slate-500/20 to-zinc-600/10', border: 'border-slate-500/20',
  },
  {
    id: 'report', label: '报告中心', icon: '📋', color: '#2ECC71',
    desc: '保存的报告 · 历史记录 · 导出PDF', href: '/console/report',
    grad: 'from-green-500/20 to-emerald-600/10', border: 'border-green-500/20',
  },
];

export default function HomePage() {
  // ============ 八字排盘状态 ============
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('0');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [longitude, setLongitude] = useState('116.4');
  const [useTrueSolar, setUseTrueSolar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'bazi' | 'modules'>('bazi');
  const [scrollY, setScrollY] = useState(0);
  const baziStore = useBaziStore();
  const resultRef = useRef<HTMLDivElement>(null);

  // 滚动监听（用于视差效果）
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 读取排盘历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dzs_bazi_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  // 历史记录点击
  const handleHistoryClick = async (input: any) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = {
        year: input.year || parseInt(year),
        month: input.month || parseInt(month),
        day: input.day || parseInt(day),
        hour: input.hour ?? 12, minute: input.minute ?? 0,
        gender: input.gender || gender,
      };
      if (input.useTrueSolar && input.longitude) {
        (payload as any).longitude = input.longitude;
        (payload as any).useTrueSolar = true;
      }
      const res = await fetch('/api/v1/bazi/calculate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data); baziStore.setResult(data.data);
        try { sessionStorage.setItem('dzs_bazi_result', JSON.stringify(data.data)); } catch {}
        try { sessionStorage.setItem('dzs_bazi_input', JSON.stringify({
          year: input.year || parseInt(year),
          month: input.month || parseInt(month),
          day: input.day || parseInt(day),
          hour: input.hour ?? 12,
          minute: input.minute ?? 0,
          gender: input.gender || gender,
          birthPlace: input.birthPlace || '',
          longitude: input.longitude || 120,
          useTrueSolar: input.useTrueSolar ?? true,
        })); } catch {}
        setActiveTab('bazi');
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else setError(data.error || '计算失败');
    } catch { setError('网络错误，请稍后重试'); }
    setLoading(false);
  };

  const selectCity = (lng: number) => { setLongitude(String(lng)); setUseTrueSolar(true); };

  const handleSubmit = async () => {
    if (!year || !month || !day) { setError('请填写出生年月日'); return; }
    setLoading(true); setError(''); setResult(null);
    const offset = parseInt(minute || '0');
    const { hour: actualHour, minute: actualMinute } = offsetToActualTime(hour, offset);
    const payload: any = {
      year: parseInt(year), month: parseInt(month), day: parseInt(day),
      hour: actualHour, minute: actualMinute, gender,
    };
    if (useTrueSolar && longitude) { payload.longitude = parseFloat(longitude); payload.useTrueSolar = true; }
    try {
      const res = await fetch('/api/v1/bazi/calculate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data); baziStore.setResult(data.data);
        try { sessionStorage.setItem('dzs_bazi_result', JSON.stringify(data.data)); } catch {}
        try { sessionStorage.setItem('dzs_bazi_input', JSON.stringify({
          year: parseInt(year), month: parseInt(month), day: parseInt(day),
          hour: actualHour, minute: actualMinute,
          gender, birthPlace: '',
          longitude: useTrueSolar ? parseFloat(longitude || '120') : 120,
          useTrueSolar: useTrueSolar ?? true,
        })); } catch {}
        const timeDisplay = formatShichenTime(hour, offset);
        const record = {
          id: Date.now(),
          time: `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')} ${timeDisplay}`,
          gender,
          input: { year: parseInt(year), month: parseInt(month), day: parseInt(day), hour: actualHour, minute: actualMinute, gender, longitude: useTrueSolar ? parseFloat(longitude) : undefined, useTrueSolar },
          pillars: data.data.pillars, dayMaster: data.data.dayMaster,
          trueSolar: useTrueSolar ? `经度${longitude}°E` : undefined,
          createdAt: new Date().toISOString(),
        };
        const updated = [record, ...history].slice(0, 10);
        setHistory(updated);
        try { localStorage.setItem('dzs_bazi_history', JSON.stringify(updated)); } catch {}
        setActiveTab('bazi');
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else setError(data.error || '计算失败');
    } catch { setError('网络错误，请稍后重试'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#05080f] text-[#e2e8f0] overflow-x-hidden">

      {/* ============ 认证栏 ============ */}
      <AuthBar />

      {/* ============ 视差背景粒子层 ============ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 70% 80%, #2ECC71 0%, transparent 40%), radial-gradient(circle at 50% 50%, #3498DB 0%, transparent 50%)',
            transform: `translateY(${scrollY * 0.05}px)`,
          }} />
        {/* 浮动粒子 */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-[0.04]"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              background: ['#f59e0b', '#2ECC71', '#3498DB', '#E74C3C'][i % 4],
              animation: `float${i % 3} ${6 + i % 4}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }} />
        ))}
      </div>

      {/* ============ HERO 区域 ============ */}
      <header className="relative px-5 pt-14 pb-10 text-center overflow-hidden" style={{ zIndex: 1 }}>
        {/* 顶部光晕 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)',
            transform: `translateY(${scrollY * -0.1}px)`,
          }} />
        <div className="relative">
          {/* 品牌 Logo */}
          <div className="relative mx-auto mb-5 w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] animate-pulse opacity-30 blur-xl" />
            <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] 
              flex items-center justify-center text-black font-bold text-3xl shadow-lg shadow-[#f59e0b]/30 
              before:absolute before:inset-[-3px] before:rounded-full before:border before:border-[#f59e0b]/20 before:animate-[spin_8s_linear_infinite]"
            >
              <span className="relative drop-shadow-sm">道</span>
            </div>
            {/* 装饰轨道环 */}
            <div className="absolute -inset-4 rounded-full border border-[#f59e0b]/5 animate-[spin_12s_linear_infinite] pointer-events-none" />
          </div>

          <h1 className="text-3xl font-bold tracking-[0.15em] bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#d97706] bg-clip-text text-transparent">
            道之自然
          </h1>
          <p className="text-sm text-[#64748b] mt-1.5 tracking-wider font-light">
            DZS — 命理AI决策系统
          </p>
          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-[#4a5a6e]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> 系统在线</span>
            <span>v2.0.0</span>
          </div>
        </div>
      </header>

      {/* ============ 导航标签 ============ */}
      <nav className="sticky top-0 z-20 px-4 pt-2 pb-1 bg-[#05080f]/90 backdrop-blur-xl border-b border-[#1a2332]/50">
        <div className="flex gap-1">
          <button onClick={() => setActiveTab('bazi')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'bazi'
                ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 shadow-sm shadow-[#f59e0b]/5'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}>
            ☯ 八字排盘
          </button>
          <button onClick={() => setActiveTab('modules')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'modules'
                ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 shadow-sm shadow-[#f59e0b]/5'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}>
            🧩 功能中心
          </button>
        </div>
      </nav>

      {/* ============ TAB 1: 八字排盘 ============ */}
      {activeTab === 'bazi' && (
      <div className="animate-[fadeIn_0.3s_ease]">
        {/* 排盘输入 */}
        <section className="px-4 pt-4 pb-2" style={{ zIndex: 1, position: 'relative' }}>
          <div className="rounded-2xl bg-gradient-to-b from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-5
            shadow-[0_4px_20px_rgba(245,158,11,0.03)]">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span className="text-lg">☯</span> 八字速查
              </h2>
              <span className="text-[10px] text-[#4a5a6e] font-mono">输入出生信息</span>
            </div>
            <p className="text-xs text-[#64748b] mb-4">输入出生信息，立即排盘 · 支持真太阳时修正</p>

            <div className="space-y-3">
              {/* 年月日 */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-[#64748b] mb-1 block">年</label>
                  <input value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1990" className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/20 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1 block">月</label>
                  <input value={month} onChange={e => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="5" className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/20 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1 block">日</label>
                  <input value={day} onChange={e => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="15" className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/20 transition-all" />
                </div>
              </div>

              {/* 性别 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#64748b] mb-1 block">性别</label>
                  <div className="flex gap-2">
                    <button onClick={() => setGender('男')}
                      className={`flex-1 py-2.5 rounded-lg text-sm border transition-all ${
                        gender === '男' ? 'bg-[#f59e0b]/10 border-[#f59e0b] text-[#f59e0b]' : 'bg-[#1a2332] border-[#2a3a4e] text-[#94a3b8] hover:border-[#3a4a5e]'
                      }`}>男</button>
                    <button onClick={() => setGender('女')}
                      className={`flex-1 py-2.5 rounded-lg text-sm border transition-all ${
                        gender === '女' ? 'bg-[#f59e0b]/10 border-[#f59e0b] text-[#f59e0b]' : 'bg-[#1a2332] border-[#2a3a4e] text-[#94a3b8] hover:border-[#3a4a5e]'
                      }`}>女</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1 block">出生地经度</label>
                  <div className="flex gap-1">
                    <input value={longitude} onChange={e => setLongitude(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="116.4" disabled={!useTrueSolar}
                      className={`w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none transition-all ${!useTrueSolar ? 'opacity-40' : ''}`} />
                    <span className="flex items-center text-[10px] text-[#64748b] whitespace-nowrap">°E</span>
                  </div>
                </div>
              </div>

              {/* 真太阳时 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer select-none" onClick={() => setUseTrueSolar(!useTrueSolar)}>
                  <div className={`w-9 h-5 rounded-full transition-colors relative ${useTrueSolar ? 'bg-[#f59e0b]' : 'bg-[#2a3a4e]'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${useTrueSolar ? 'left-[18px]' : 'left-[2px]'}`} />
                  </div>
                  真太阳时修正
                </label>
                {useTrueSolar && (
                  <div className="flex gap-1 overflow-x-auto max-w-[220px] pb-0.5 scrollbar-hide">
                    {CITIES.slice(0, 6).map(c => (
                      <button key={c.name} onClick={() => selectCity(c.lng)}
                        className={`shrink-0 px-2 py-0.5 rounded text-[10px] border transition-all ${
                          Math.abs(parseFloat(longitude) - c.lng) < 0.5
                            ? 'bg-[#f59e0b]/10 border-[#f59e0b] text-[#f59e0b]'
                            : 'bg-[#1a2332] border-[#2a3a4e] text-[#64748b] hover:border-[#3a4a5e]'
                        }`}>{c.name}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* 时辰 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#64748b] mb-1 block">时辰（可选）</label>
                  <select value={hour} onChange={e => setHour(e.target.value)}
                    className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/20 transition-all">
                    {SHICHEN.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1 block">具体时间</label>
                  <select value={minute} onChange={e => setMinute(e.target.value)}
                    className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/20 transition-all">
                    {getTimeOptions(hour).map(opt => (
                      <option key={opt.value} value={String(opt.value)}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 提交 */}
              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-semibold text-sm
                disabled:opacity-50 transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-[#f59e0b]/20
                disabled:hover:shadow-none">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    排盘中...
                  </span>
                ) : '☯ 开始排盘'}
              </button>

              {error && <p className="text-xs text-[#E74C3C] text-center">{error}</p>}
            </div>
          </div>
        </section>

        {/* 排盘结果 */}
        {result && (
          <section ref={resultRef} className="px-4 mb-6" style={{ zIndex: 1, position: 'relative' }}>
            <div className="rounded-2xl bg-gradient-to-b from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-5
              shadow-[0_4px_20px_rgba(245,158,11,0.03)] animate-[fadeIn_0.4s_ease]">
              {/* 结果头部 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#f59e0b] flex items-center gap-2">
                  <span>📜</span> 排盘结果
                </h3>
                <span className="text-[10px] text-[#4a5a6e] font-mono">
                  {result.trueSolarTime ? '真太阳时' : '北京时间'}
                </span>
              </div>

              {/* 四柱 */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(['year', 'month', 'day', 'hour'] as const).map((pillar, i) => {
                  const p = result.pillars[pillar];
                  const labels = ['年柱', '月柱', '日柱', '时柱'];
                  return (
                    <div key={pillar} className="text-center bg-gradient-to-b from-[#1a2332] to-[#151e2d] rounded-xl py-3 border border-[#2a3a4e]">
                      <div className="text-[10px] text-[#64748b] mb-1">{labels[i]}</div>
                      <div className="text-lg font-bold text-[#f59e0b] font-mono">{p.full}</div>
                      <div className="text-[10px] text-[#94a3b8] mt-1">{p.nayin}</div>
                    </div>
                  );
                })}
              </div>

              {/* 真太阳时修正 */}
              {result.trueSolarTime && (
                <div className="mb-3 p-2.5 rounded-lg bg-[#1a2332]/50 border border-[#2a3a4e] text-[10px] text-[#94a3b8] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>☀️ 真太阳时修正</span>
                  <span>偏移 {result.trueSolarTime.offsetMinutes} 分钟</span>
                  <span>{String(result.trueSolarTime.hour).padStart(2,'0')}:{String(result.trueSolarTime.minute).padStart(2,'0')}</span>
                  <span>（{result.trueSolarTime.shichen}）</span>
                  {result.trueSolarTime.crossed && <span className="text-[#f59e0b] font-medium">⚠️ 时柱已修正</span>}
                </div>
              )}

              {/* 日主 + 用神 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-b from-[#1a2332] to-[#151e2d] rounded-xl p-3 border border-[#2a3a4e]">
                  <div className="text-[10px] text-[#64748b] mb-1">日主</div>
                  <div className="text-lg font-bold font-mono">{result.dayMaster}</div>
                  <div className="text-[10px] text-[#94a3b8]">{result.strength.bodyStrength}</div>
                </div>
                <div className="bg-gradient-to-b from-[#1a2332] to-[#151e2d] rounded-xl p-3 border border-[#2a3a4e]">
                  <div className="text-[10px] text-[#64748b] mb-1">用神</div>
                  <div className="text-lg font-bold text-[#2ECC71]">{result.usefulGod.yongShen.join('、')}</div>
                  <div className="text-[10px] text-[#94a3b8]">喜 {result.usefulGod.xiShen.join('、')}</div>
                </div>
              </div>

              {/* 五行能量条 */}
              <div className="space-y-2 mb-4">
                <h4 className="text-[10px] text-[#64748b] font-medium mb-2">⚡ 五行能量分布</h4>
                {(['木', '火', '土', '金', '水'] as const).map((wx) => {
                  const pct = result.elementBalance.percentage[wx] || 0;
                  const colors: Record<string, string> = {
                    '木': '#2ECC71', '火': '#E74C3C', '土': '#F39C12', '金': '#f59e0b', '水': '#3498DB'
                  };
                  return (
                    <div key={wx} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-center drop-shadow-sm" style={{ color: colors[wx] }}>{wx}</span>
                      <div className="flex-1 h-2 bg-[#1a2332] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: colors[wx], boxShadow: `0 0 6px ${colors[wx]}40` }} />
                      </div>
                      <span className="w-8 text-right text-[#64748b] font-mono text-[10px]">{pct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* 分析跳转 */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#f59e0b]/5 via-[#f59e0b]/3 to-transparent border border-[#f59e0b]/10">
                <h4 className="text-xs font-semibold text-[#f59e0b] mb-2">✨ 深度分析</h4>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  日主{result.dayMaster}，{result.strength?.bodyStrength || ''}。
                  用神{result.usefulGod?.yongShen?.join('、') || '未知'}，忌神{result.usefulGod?.jiShen?.join('、') || '未知'}。
                  {Object.entries(result.elementBalance?.percentage || {}).sort((a:any,b:any)=>b[1]-a[1]).filter(([,v]:any)=>v>30).map(([k]:any)=>`${k}偏旺`).join('，')}
                </p>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {[
                    { label: '每日运势', href: '/h5/fortune', icon: '☯️' },
                    { label: '五行详情', href: '/h5/wuxing', icon: '🔥' },
                    { label: '九宫飞星', href: '/h5/jiugong', icon: '🧭' },
                    { label: '大运流年', href: '/h5/dayun', icon: '📈' },
                    { label: 'AI改命', href: '/h5/ai', icon: '🤖' },
                  ].map(item => (
                    <a key={item.label} href={item.href}
                      className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg bg-[#1a2332]/80 border border-[#2a3a4e] 
                      hover:border-[#f59e0b]/30 hover:bg-[#1a2332] transition-all active:scale-95">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-[9px] text-[#94a3b8]">{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* 底部操作 */}
              <div className="flex gap-2 mt-4">
                <button onClick={() => window.open('/console/report', '_self')}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a2332] border border-[#2a3a4e] text-center text-sm text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#3a4a5e] transition-all">
                  📋 报告中心
                </button>
                <button onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-center text-sm text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all active:scale-[0.98]">
                  🔄 重新排盘
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 排盘历史 */}
        {history.length > 0 && (
          <section className="px-4 mb-6" style={{ zIndex: 1, position: 'relative' }}>
            <div className="rounded-2xl bg-gradient-to-b from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span>📋</span> 排盘历史
                </h3>
                <button onClick={() => { setHistory([]); try { localStorage.removeItem('dzs_bazi_history'); } catch {} }}
                  className="text-[10px] text-[#64748b] hover:text-[#E74C3C] transition-colors">清空</button>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-hide">
                {history.map((rec: any) => (
                  <div key={rec.id} onClick={() => rec.input && handleHistoryClick(rec.input)}
                    className="flex items-center justify-between bg-gradient-to-r from-[#1a2332] to-[#151e2d] rounded-lg px-3 py-2.5 
                    border border-[#2a3a4e] cursor-pointer hover:border-[#f59e0b]/40 hover:bg-[#1a2838] transition-all active:scale-[0.99]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#f59e0b] font-mono font-medium">
                        {rec.pillars?.year?.full} {rec.pillars?.month?.full} {rec.pillars?.day?.full}
                      </span>
                      <span className="text-[10px] text-[#64748b]">{rec.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.trueSolar && <span className="text-[8px] text-[#3498DB]" title={rec.trueSolar}>☀️</span>}
                      <span className="text-[10px] text-[#94a3b8]">{rec.gender}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 无结果时的功能入口 */}
        {!result && (
          <section className="px-4 mb-6" style={{ zIndex: 1, position: 'relative' }}>
            <div className="rounded-2xl bg-gradient-to-b from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>🚀</span> 快捷入口
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {MODULES.slice(0, 8).map(mod => (
                  <a key={mod.id} href={mod.href}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gradient-to-b from-[#1a2332] to-[#151e2d] 
                    border border-[#2a3a4e] hover:border-[#f59e0b]/20 hover:bg-[#1a2838] transition-all active:scale-95">
                    <span className="text-xl">{mod.icon}</span>
                    <span className="text-[10px] text-[#94a3b8] text-center leading-tight">{mod.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      )}

      {/* ============ TAB 2: 功能中心 ============ */}
      {activeTab === 'modules' && (
      <div className="animate-[fadeIn_0.3s_ease]">
        <section className="px-4 pt-4 pb-6" style={{ zIndex: 1, position: 'relative' }}>
          {/* 欢迎标题 */}
          <div className="mb-4 text-center">
            <h2 className="text-lg font-semibold text-[#e2e8f0]">🧩 功能中心</h2>
            <p className="text-xs text-[#64748b] mt-1">选择功能模块，探索命运奥秘</p>
          </div>

          {/* 功能卡片网格 */}
          <div className="grid grid-cols-1 gap-3">
            {MODULES.map((mod, idx) => (
              <a key={mod.id} href={mod.href}
                className="group relative rounded-2xl bg-gradient-to-br from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-4
                overflow-hidden hover:border-[#f59e0b]/20 transition-all duration-300 active:scale-[0.99]"
                style={{ animationDelay: `${idx * 80}ms`, animation: 'fadeIn 0.4s ease forwards', opacity: 0 }}>
                {/* 装饰光晕 */}
                <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${mod.grad} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a2332] to-[#151e2d] border border-[#2a3a4e] 
                    flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {mod.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold group-hover:text-[#f59e0b] transition-colors">{mod.label}</h3>
                      <span className="text-[18px] text-[#4a5a6e] group-hover:text-[#f59e0b] group-hover:translate-x-1 transition-all ml-auto">›</span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-0.5">{mod.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* 系统信息 */}
          <div className="mt-4 rounded-2xl bg-gradient-to-b from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🔗</span> 系统链接
            </h3>
            <div className="space-y-2">
              <a href="http://192.168.1.38:5000/api/docs" target="_blank"
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1a2332]/50 border border-[#2a3a4e] hover:border-[#f59e0b]/20 transition-all group">
                <span className="text-lg">📖</span>
                <div className="flex-1">
                  <div className="text-xs font-medium group-hover:text-[#f59e0b] transition-colors">V2 API 文档</div>
                  <div className="text-[10px] text-[#64748b]">Swagger UI · 在线调试</div>
                </div>
                <span className="text-[#4a5a6e] group-hover:text-[#f59e0b] transition-all">↗</span>
              </a>
              <a href="/h5/fortune" target="_self"
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1a2332]/50 border border-[#2a3a4e] hover:border-[#f59e0b]/20 transition-all group">
                <span className="text-lg">🏠</span>
                <div className="flex-1">
                  <div className="text-xs font-medium group-hover:text-[#f59e0b] transition-colors">道之自然 · H5 首页</div>
                  <div className="text-[10px] text-[#64748b]">移动端命理分析</div>
                </div>
                <span className="text-[#4a5a6e] group-hover:text-[#f59e0b] transition-all">→</span>
              </a>
            </div>
          </div>
        </section>
      </div>
      )}

      {/* ============ 底部 ============ */}
      <footer className="px-4 pb-8 pt-2 text-center" style={{ zIndex: 1, position: 'relative' }}>
        <div className="border-t border-[#1a2332] pt-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            {[
              { icon: '☯️', href: '/h5/fortune' },
              { icon: '🔥', href: '/h5/wuxing' },
              { icon: '📈', href: '/h5/dayun' },
              { icon: '🧭', href: '/h5/jiugong' },
              { icon: '🤖', href: '/h5/ai' },
              { icon: '⚙️', href: '/console/dashboard' },
            ].map(item => (
              <a key={item.href} href={item.href}
                className="w-8 h-8 rounded-full bg-[#1a2332] border border-[#2a3a4e] flex items-center justify-center text-sm
                hover:bg-[#2a3a4e] hover:border-[#f59e0b]/20 transition-all active:scale-90">
                {item.icon}
              </a>
            ))}
          </div>
          <p className="text-[10px] text-[#4a5a6e]">道之自然 · DZS-OS v2.0.0</p>
          <p className="text-[10px] text-[#3a4a5e] mt-1 tracking-wide">AI仅供参考 · 命运由自己掌握</p>
        </div>
      </footer>

      {/* ============ 认证模态框 ============ */}
      <AuthModal />
      <ChangePasswordModal />

      {/* ============ 动画 Keyframes ============ */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float0 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%      { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%      { transform: translateY(10px) translateX(-15px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%      { transform: translateY(-15px) translateX(-5px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ============================================================
// 认证栏组件（固定在页面顶部）
// ============================================================
function AuthBar() {
  const { isLoggedIn, user, setShowAuthModal, setShowChangePwdModal, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="sticky top-0 z-50 px-4 py-2 bg-[#05080f]/90 backdrop-blur-xl border-b border-[#1e293b]/60">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#f59e0b] font-semibold tracking-wider">道之自然</span>
          <span className="text-[8px] text-[#4a5a6e]">DZS</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn && user ? (
            <>
              <div className="flex items-center gap-2 pr-2 border-r border-[#1e293b]">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-[8px] text-black font-bold">
                  {user.nickname?.charAt(0) || '?'}
                </div>
                <span className="text-xs text-[#94a3b8] truncate max-w-[100px]">{user.nickname}</span>
                {user.role === 'super_admin' && (
                  <span className="px-1 py-0.5 rounded text-[8px] bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">Admin</span>
                )}
              </div>
              <button onClick={() => setShowChangePwdModal(true)} className="text-[10px] text-[#64748b] hover:text-[#f59e0b] transition-colors mr-2">修改密码</button>
              <button onClick={logout} className="text-[10px] text-[#64748b] hover:text-[#E74C3C] transition-colors">退出</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowAuthModal(true)}
                className="px-3 py-1 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all active:scale-95">登录</button>
              <button onClick={() => setShowAuthModal(true)}
                className="px-3 py-1 rounded-lg bg-[#1a2332] border border-[#2a3a4e] text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-all active:scale-95">注册</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 登录/注册模态框
// ============================================================
function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, guestLogin } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  if (!showAuthModal) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => { setShowAuthModal(false); setSuccess(false); }, 800);
    } catch (err: any) { setError(err.message || '登录失败'); }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    if (!email || !password) { setError('请填写邮箱和密码'); setLoading(false); return; }
    if (password.length < 6) { setError('密码至少6位'); setLoading(false); return; }
    try {
      await useAuthStore.getState().register(email, password, nickname || email.split('@')[0]);
      setSuccess(true);
      setTimeout(() => { setShowAuthModal(false); setSuccess(false); }, 800);
    } catch (err: any) { setError(err.message || '注册失败'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}>
      <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-black font-bold text-sm">{'道'}</div>
          <h3 className="text-base font-semibold">{mode === 'login' ? '登录' : '注册'}</h3>
          <p className="text-[10px] text-[#64748b] mt-0.5">道之自然 · 命理AI决策系统</p>
        </div>
        {success ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-[#2ECC71] font-medium">成功！</p>
          </div>
        ) : (
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-[#64748b] mb-1 block">昵称（可选）</label>
                <input value={nickname} onChange={e => setNickname(e.target.value)}
                  placeholder="你的昵称"
                  className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none" />
              </div>
            )}
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">邮箱</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="·······"
                className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98]">
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => { setLoading(true); guestLogin().then(() => { setSuccess(true); setTimeout(() => { setShowAuthModal(false); setSuccess(false); }, 800); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
                  className="w-full py-2 rounded-lg bg-[#1a2332] border border-[#2a3a4e] text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-all">
                  游客模式（无需注册）
                </button>
              </>
            )}
            {error && <p className="text-xs text-[#E74C3C] text-center">{error}</p>}
            <div className="text-center pt-1">
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-[10px] text-[#64748b] hover:text-[#f59e0b] transition-colors">
                {mode === 'login' ? '没有账号？立即注册' : '已有账号？去登录'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 修改密码模态框
// ============================================================
function ChangePasswordModal() {
  const { showChangePwdModal, setShowChangePwdModal, changePassword } = useAuthStore();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  if (!showChangePwdModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess(false);
    if (newPwd !== confirmPwd) { setError('两次输入的密码不一致'); setLoading(false); return; }
    if (newPwd.length < 6) { setError('新密码至少6位'); setLoading(false); return; }
    try {
      await changePassword(oldPwd, newPwd);
      setSuccess(true);
      setTimeout(() => { setShowChangePwdModal(false); setSuccess(false); }, 1500);
    } catch (err: any) { setError(err.message || '修改失败'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={(e) => { if (e.target === e.currentTarget) setShowChangePwdModal(false); }}>
      <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#0f1525] to-[#0c1020] border border-[#1e293b] p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-black font-bold text-sm">🔑</div>
          <h3 className="text-base font-semibold">修改密码</h3>
          <p className="text-[10px] text-[#64748b] mt-0.5">修改后需要重新登录</p>
        </div>
        {success ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-[#2ECC71] font-medium">密码修改成功！</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">当前密码</label>
              <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
                placeholder="输入当前密码"
                className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">新密码</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="至少6位"
                className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">确认新密码</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="再次输入新密码"
                className="w-full bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:border-[#f59e0b] focus:outline-none" />
            </div>
            <button type="submit" disabled={loading || !oldPwd || !newPwd || !confirmPwd}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98]">
              {loading ? '修改中...' : '确认修改'}
            </button>
            <button type="button" onClick={() => setShowChangePwdModal(false)}
              className="w-full py-2 rounded-lg border border-[#2a3a4e] text-xs text-[#64748b] hover:text-[#94a3b8] transition-all">
              取消
            </button>
            {error && <p className="text-xs text-[#E74C3C] text-center">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
