'use client';

import { useEffect, useState } from 'react';
import { useWuxingStore, useBaziStore } from '@/store';
import { analyzeEnergy } from '@/lib/api';
import { cn, WUXING_COLORS, WUXING_NAMES } from '@/lib/utils';
import { CardSkeleton, ErrorFallback, EmptyState } from '@/lib/components';
import ReactEChartsCore from 'echarts-for-react';
import { RefreshCw, Activity, Wind, AlertTriangle } from 'lucide-react';

export default function WuxingPage() {
  const { result, loading, error, setResult, setLoading, setError } = useWuxingStore();
  const baziResult = useBaziStore((s) => s.result);
  const baziStore = useBaziStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 从 sessionStorage 恢复排盘数据
  useEffect(() => {
    if (!baziResult) {
      try {
        const stored = sessionStorage.getItem('dzs_bazi_result');
        if (stored) {
          const parsed = JSON.parse(stored);
          baziStore.setResult(parsed);
        }
      } catch {}
    }
  }, []);

  const loadEnergy = async () => {
    if (!baziResult) return;
    setLoading(true);
    setError(null);
    try {
      const data = (baziResult as any).data || baziResult;
      const res = await analyzeEnergy({
        baziResult: { elementBalance: { scores: data.elementBalance?.scores || {} } },
        monthBranch: data.pillars?.month?.earthlyBranch || '巳',
      });
      if (res.success) {
        setResult(res.data);
      } else {
        setError('能量分析失败');
      }
    } catch (e: any) {
      setError(e.message || '请求失败');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEnergy();
  }, [baziResult]);

  const refresh = () => {
    setIsRefreshing(true);
    loadEnergy().finally(() => setTimeout(() => setIsRefreshing(false), 800));
  };

  const radarOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: '木 （East）', max: 200 },
        { name: '火 （South）', max: 200 },
        { name: '土 （Center）', max: 200 },
        { name: '金 （West）', max: 200 },
        { name: '水 （North）', max: 200 },
      ],
      shape: 'circle',
      radius: '65%',
      axisName: { color: '#94a3b8', fontSize: 11 },
      splitArea: { areaStyle: { color: ['rgba(245,158,11,0.02)', 'rgba(245,158,11,0.05)'] } },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [
              result?.energyField?.wood?.finalScore || 0,
              result?.energyField?.fire?.finalScore || 0,
              result?.energyField?.earth?.finalScore || 0,
              result?.energyField?.metal?.finalScore || 0,
              result?.energyField?.water?.finalScore || 0,
            ],
            name: '动态能量',
            areaStyle: { color: 'rgba(245,158,11,0.25)' },
            lineStyle: { color: '#f59e0b', width: 2 },
            itemStyle: { color: '#f59e0b' },
          },
          {
            value: [
              result?.energyField?.wood?.base || 0,
              result?.energyField?.fire?.base || 0,
              result?.energyField?.earth?.base || 0,
              result?.energyField?.metal?.base || 0,
              result?.energyField?.water?.base || 0,
            ],
            name: '基础能量',
            areaStyle: { color: 'rgba(148,163,184,0.1)' },
            lineStyle: { color: '#64748b', width: 1, type: 'dashed' },
            itemStyle: { color: '#64748b' },
          },
        ],
      },
    ],
  };

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: ['木', '火', '土', '金', '水'],
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(51,65,85,0.3)' } },
    },
    series: [
      {
        type: 'bar',
        data: [
          { value: result?.energyField?.wood?.finalScore || 0, itemStyle: { color: WUXING_COLORS.wood } },
          { value: result?.energyField?.fire?.finalScore || 0, itemStyle: { color: WUXING_COLORS.fire } },
          { value: result?.energyField?.earth?.finalScore || 0, itemStyle: { color: WUXING_COLORS.earth } },
          { value: result?.energyField?.metal?.finalScore || 0, itemStyle: { color: WUXING_COLORS.metal } },
          { value: result?.energyField?.water?.finalScore || 0, itemStyle: { color: WUXING_COLORS.water } },
        ],
        barWidth: '50%',
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11, formatter: (p: any) => p.value },
      },
    ],
  };

  const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

  // 未排盘状态
  if (!baziResult) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">五行能量</h1>
            <p className="text-sm text-[#64748b] mt-1">动态五行动能系统 · 月令加权 · 能量场分析</p>
          </div>
        </div>
        <EmptyState
          icon={<Wind size={40} />}
          title="请先在八字排盘页面排盘"
          description="五行能量分析依赖八字排盘结果"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">五行能量</h1>
          <p className="text-sm text-[#64748b] mt-1">动态五行动能系统 · 月令加权 · 能量场分析</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm hover:bg-[rgba(245,158,11,0.2)] transition-all">
          <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
          刷新
        </button>
      </div>

      {loading && !result ? (
        <CardSkeleton />
      ) : error ? (
        <ErrorFallback message={error} onRetry={loadEnergy} />
      ) : result ? (
        <>
          {/* 状态卡 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="dzg-card p-4">
              <div className="text-xs text-[#64748b]">总能量</div>
              <div className="text-2xl font-bold text-[#f59e0b] mt-1">{result.totalEnergy}</div>
            </div>
            <div className="dzg-card p-4">
              <div className="text-xs text-[#64748b]">主导五行</div>
              <div className="text-2xl font-bold mt-1" style={{ color: WUXING_COLORS[result.dominantElement as keyof typeof WUXING_COLORS] || '#f59e0b' }}>
                {WUXING_NAMES[result.dominantElement] || '--'}
              </div>
            </div>
            <div className="dzg-card p-4">
              <div className="text-xs text-[#64748b]">平衡状态</div>
              <div className="text-xl font-bold mt-1 text-[#F39C12]">{result.balanceState || '--'}</div>
            </div>
            <div className="dzg-card p-4">
              <div className="text-xs text-[#64748b]">能量稳定度</div>
              <div className="text-2xl font-bold mt-1" style={{ color: result.stability > 60 ? '#2ECC71' : '#F39C12' }}>
                {result.stability}%
              </div>
            </div>
          </div>

          {/* 图表区 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="dzg-card p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">五行能量雷达</h3>
              <ReactEChartsCore option={radarOption} style={{ height: 320 }} notMerge />
            </div>
            <div className="dzg-card p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">能量柱状比较</h3>
              <ReactEChartsCore option={barOption} style={{ height: 320 }} notMerge />
            </div>
          </div>

          {/* 各五行明细 */}
          <div className="dzg-card p-4">
            <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">能量明细</h3>
            <div className="grid grid-cols-5 gap-3">
              {elements.map((el) => {
                const e = result.energyField?.[el];
                const name = WUXING_NAMES[el];
                const color = WUXING_COLORS[el as keyof typeof WUXING_COLORS];
                return (
                  <div key={el} className="text-center p-3 rounded-lg border" style={{ borderColor: `${color}30` }}>
                    <div className="text-lg font-bold font-mono" style={{ color }}>{name}</div>
                    <div className="text-sm text-[#e2e8f0] mt-1 font-mono">{e?.finalScore || 0}</div>
                    <div className="text-[10px] text-[#64748b] mt-2 space-y-0.5">
                      <div>基础 {e?.base || 0}</div>
                      <div>月令 {e?.seasonalBoost !== undefined && e.seasonalBoost >= 0 ? `+${e.seasonalBoost}` : e?.seasonalBoost || 0}</div>
                      <div>占比 {e?.finalPercent || 0}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Activity size={40} />}
          title="点击刷新加载能量数据"
          action={
            <button onClick={loadEnergy} className="px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm">
              加载数据
            </button>
          }
        />
      )}
    </div>
  );
}
