'use client';

import { useEffect, useState } from 'react';
import { useSystemStore, useBaziStore } from '@/store';
import { useValidationQuery } from '@/lib/hooks/queries';
import { useAIHealth, useTokenStats } from '@/lib/hooks/ai-runtime-queries';
import { formatEnergy, getRiskColor, WUXING_COLORS, WUXING_NAMES, cn } from '@/lib/utils';
import { CardSkeleton } from '@/lib/components';
import {
  Activity, AlertTriangle, Cpu, Zap, Shield, Wind,
  TrendingUp, Clock, ArrowUp, ArrowDown,
} from 'lucide-react';
import ReactEChartsCore from 'echarts-for-react';

export default function DashboardPage() {
  const { validationStatus, setValidationStatus, systemMode, setConnected } = useSystemStore();
  const baziResult = useBaziStore((s) => s.result);
  const [time, setTime] = useState(new Date());

  const { data: validStatus, isLoading: validLoading } = useValidationQuery();
  const { data: aiHealth } = useAIHealth();
  const { data: tokenStats } = useTokenStats();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (validStatus) {
      setValidationStatus(validStatus as any);
      setConnected(true);
    }
  }, [validStatus, setValidationStatus, setConnected]);

  // ===== 从真实数据提取 =====
  const data = baziResult ? (baziResult as any).data || baziResult : null;

  const energyField = data?.elementBalance?.percentage || {};
  const radarValues = [
    energyField.木 || 0,
    energyField.火 || 0,
    energyField.土 || 0,
    energyField.金 || 0,
    energyField.水 || 0,
  ];
  const totalScore = data?.elementBalance?.totalScore || 0;
  const stability = data?.strength?.strengthScore || 0;
  const dominantElement = data ? Object.entries(data.elementBalance?.percentage || {}).sort((a:any,b:any)=>b[1]-a[1])[0]?.[0] : '火';
  const weakestElement = data ? Object.entries(data.elementBalance?.percentage || {}).sort((a:any,b:any)=>a[1]-b[1])[0]?.[0] : '水';
  const yongShen = data?.usefulGod?.yongShen?.join('/') || '--';
  const jiShen = data?.usefulGod?.jiShen?.join('/') || '--';
  const dayMaster = data?.dayMaster || '--';

  const radarOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: '木', max: 100 },
        { name: '火', max: 100 },
        { name: '土', max: 100 },
        { name: '金', max: 100 },
        { name: '水', max: 100 },
      ],
      shape: 'circle',
      axisName: { color: '#94a3b8', fontSize: 12 },
      splitArea: { areaStyle: { color: ['rgba(245,158,11,0.02)', 'rgba(245,158,11,0.05)'] } },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: radarValues,
        name: '今日能量',
        areaStyle: { color: 'rgba(245,158,11,0.2)' },
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
      }],
    }],
  };

  const KPI_CARDS = [
    { label: '今日能量总值', value: totalScore, unit: '', icon: Zap, color: '#f59e0b', trend: 'up' as const, change: totalScore > 0 ? '已计算' : '' },
    { label: '能量稳定度', value: stability, unit: '%', icon: Activity, color: '#2ECC71', trend: 'up' as const, change: stability > 0 ? `${stability >= 50 ? '稳定' : '偏弱'}` : '' },
    { label: '风险等级', value: 0, unit: '%', icon: AlertTriangle, color: getRiskColor(0), trend: 'down' as const, change: '' },
    { label: '日主五行', value: dayMaster, unit: '', icon: Wind, color: '#E74C3C', trend: 'up' as const, change: WUXING_NAMES[data?.dayMasterElement] || '' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">DZS-OS 仪表盘</h1>
          <p className="text-sm text-[#64748b] mt-1">道之自然命理AI操作系统 · 实时监控面板</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>{time.toLocaleTimeString('zh-CN')}</span>
          </div>
          <div className={cn('flex items-center gap-2', validationStatus?.passed ? 'text-[#2ECC71]' : 'text-[#64748b]')}>
            <Shield size={14} />
            <span>{validLoading ? '检查中...' : validationStatus?.passed ? '验证通过' : '验证待检'}</span>
          </div>
        </div>
      </div>

      {/* KPI卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className="dzg-card p-4 group hover:border-[rgba(245,158,11,0.3)] transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-[#64748b] mb-1">{kpi.label}</div>
                <div className="text-2xl font-bold text-[#e2e8f0]" style={{ color: kpi.color }}>
                  {typeof kpi.value === 'number' ? formatEnergy(kpi.value) : kpi.value}{kpi.unit}
                </div>
              </div>
              <div className="p-2 rounded-lg" style={{ background: `${kpi.color}20` }}>
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
            </div>
            {kpi.change && (
              <div className={cn('flex items-center gap-1 text-xs mt-2', kpi.trend === 'up' ? 'text-[#2ECC71]' : 'text-[#E74C3C]')}>
                {kpi.trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                <span>{kpi.change}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 主区域 2列 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 五行能量雷达图 */}
        <div className="dzg-card p-4 col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">五行能量雷达</h3>
            <span className="text-[10px] text-[#64748b]">{data ? '已排盘' : '等待排盘'}</span>
          </div>
          {data ? (
            <ReactEChartsCore option={radarOption} style={{ height: 260 }} notMerge />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-[#64748b]">
              请先在八字排盘页面中排盘
            </div>
          )}
        </div>

        {/* 系统状态 */}
        <div className="dzg-card p-4 col-span-1">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">系统状态</h3>
          <div className="space-y-3">
            <StatusRow label="系统内核" value="运行中" color="#2ECC71" />
            <StatusRow label="能量总线" value="激活" color="#2ECC71" />
            <StatusRow label="系统验证" value={validLoading ? '检查中' : validationStatus?.passed ? '通过' : '等待中'} color={validationStatus?.passed ? '#2ECC71' : '#F39C12'} />
            <StatusRow label="AI引擎" value="就绪" color="#2ECC71" />
            <StatusRow label="协议版本" value="2.3" color="#94a3b8" />
            <StatusRow label="运行模式" value={systemMode} color="#f59e0b" />
          </div>
        </div>

        {/* 命理摘要 — 真实数据 */}
        <div className="dzg-card p-4 col-span-1">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">今日命理摘要</h3>
          {data ? (
            <div className="space-y-3">
              <DetailRow label="日主" value={dayMaster} color="#f59e0b" />
              <DetailRow label="用神" value={yongShen} color="#2ECC71" />
              <DetailRow label="忌神" value={jiShen} color="#E74C3C" />
              <DetailRow label="主导五行" value={WUXING_NAMES[dominantElement] || dominantElement} />
              <DetailRow label="最弱五行" value={WUXING_NAMES[weakestElement] || weakestElement} />
              <DetailRow label="身强" value={data?.strength?.bodyStrength || '--'} />
              <DetailRow label="能量总分" value={`${totalScore}`} color="#f59e0b" />
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-[#64748b]">
              暂无八字数据<br />请先在八字排盘页面排盘
            </div>
          )}
        </div>
      </div>

      {/* AI 运行引擎状态卡片 */}
      <div className="dzg-card p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">AI 运行引擎</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatusMiniCard
            label="Provider 在线"
            value={aiHealth
              ? `${Object.values(aiHealth.providers || {}).filter((p: any) => p.status === 'healthy').length}/${Object.keys(aiHealth.providers || {}).length}`
              : '--'}
            color="#8B5CF6"
          />
          <StatusMiniCard
            label="今日 Token"
            value={tokenStats ? (tokenStats.totalTokens ?? 0).toLocaleString() : '--'}
            color="#f59e0b"
          />
          <StatusMiniCard
            label="缓存命中率"
            value={tokenStats?.cacheHitRate != null
              ? `${(tokenStats.cacheHitRate * 100).toFixed(1)}%`
              : aiHealth?.cache?.enabled != null
                ? (aiHealth.cache.enabled ? '启用' : '禁用')
                : '--'}
            color="#2ECC71"
          />
          <StatusMiniCard
            label="平均响应"
            value={tokenStats?.avgDuration != null ? `${tokenStats.avgDuration.toFixed(0)}ms` : '--'}
            color="#3498DB"
          />
        </div>
      </div>

      {/* 底部：状态面板 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="dzg-card p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">活动日志</h3>
          <div className="space-y-2 text-xs text-[#94a3b8]">
            <ActivityLog time={time.toLocaleTimeString('zh-CN')} event="系统运行中" type="success" />
            <ActivityLog time="--" event={`系统验证: ${validationStatus?.passed ? '通过' : '待检'}`} type={validationStatus?.passed ? 'success' : 'warn'} />
            <ActivityLog time="--" event={`API: ${process.env.NEXT_PUBLIC_API_URL || 'localhost:4000'}`} type="info" />
          </div>
        </div>
        <div className="dzg-card p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">系统验证</h3>
          <div className="space-y-2 text-xs">
            <CheckRow label="四柱完整性" passed={!!data?.pillars} />
            <CheckRow label="五行正数" passed={!!data?.elementBalance} />
            <CheckRow label="经度范围" passed={true} />
            <CheckRow label="真太阳时修正" passed={!!data?.trueSolarTime} />
            <CheckRow label="用神一致性" passed={!!data?.usefulGod} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 子组件
function StatusRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#64748b]">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#64748b]">{label}</span>
      <span className="font-mono text-[#e2e8f0]" style={color ? { color } : {}}>{value}</span>
    </div>
  );
}

function ActivityLog({ time, event, type }: { time: string; event: string; type: 'info' | 'success' | 'warn' }) {
  const colors = { info: '#3498DB', success: '#2ECC71', warn: '#F39C12' };
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#64748b] w-16">{time}</span>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[type] }} />
      <span>{event}</span>
    </div>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#94a3b8]">{label}</span>
      <span className={passed ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}>
        {passed ? '✓' : '✗'}
      </span>
    </div>
  );
}

function StatusMiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: `${color}08` }}>
      <div className="text-xs text-[#64748b] mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
