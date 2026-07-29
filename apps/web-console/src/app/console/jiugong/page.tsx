'use client';

import { useEffect, useState } from 'react';
import { useJiugongStore } from '@/store';
import { calculateNinePalaceApi } from '@/lib/api';
import type { PalaceData } from '@/lib/api';
import { cn, WUXING_COLORS } from '@/lib/utils';
import { CardSkeleton, ErrorFallback, EmptyState } from '@/lib/components';
import { Grid3X3, RefreshCw, Info, Clock, Calendar } from 'lucide-react';

const PALACE_INFO: Record<number, { name: string; direction: string; wuxing: string }> = {
  1: { name: '坎', direction: '北', wuxing: '水' },
  2: { name: '坤', direction: '西南', wuxing: '土' },
  3: { name: '震', direction: '东', wuxing: '木' },
  4: { name: '巽', direction: '东南', wuxing: '木' },
  5: { name: '中', direction: '中', wuxing: '土' },
  6: { name: '乾', direction: '西北', wuxing: '金' },
  7: { name: '兑', direction: '西', wuxing: '金' },
  8: { name: '艮', direction: '东北', wuxing: '土' },
  9: { name: '离', direction: '南', wuxing: '火' },
};

// 洛书九宫：戴九履一，左三右七，二四为肩，六八为足
const LO_SHU_POSITIONS: Record<number, [number, number]> = {
  1: [2, 1], 2: [0, 2], 3: [1, 0], 4: [0, 0],
  5: [1, 1],
  6: [2, 2], 7: [1, 2], 8: [2, 0], 9: [0, 1],
};

type StarLayer = 'year' | 'month' | 'day';
const LAYER_LABELS: Record<StarLayer, string> = { year: '流年飞星', month: '流月飞星', day: '日飞星' };
const LAYER_ICONS: Record<StarLayer, string> = { year: '📅', month: '📆', day: '☀️' };

export default function JiugongPage() {
  const { date, result, selectedPalace, loading, error, setDate, setResult, setError, setSelectedPalace, setLoading } = useJiugongStore();
  const [layer, setLayer] = useState<StarLayer>('year');

  useEffect(() => { loadPalace(); }, []);

  const loadPalace = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calculateNinePalaceApi(date.year, date.month, date.day);
      if (res.success) setResult(res.data);
      else setError('服务端返回错误');
    } catch (e: any) {
      setError(e.message || '网络请求失败');
    } finally { setLoading(false); }
  };

  // Get current layer's palace data
  const currentPalaces: PalaceData[] = result ? (result[layer] || result.palaces) : [];
  const selectedData = currentPalaces.find((p) => p.position === selectedPalace);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">九宫飞星</h1>
          <p className="text-sm text-[#64748b] mt-1">空间能量引擎 · 三年/月/日三层飞星布局</p>
        </div>
        <button onClick={loadPalace} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm hover:bg-[rgba(245,158,11,0.2)]">
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          刷新
        </button>
      </div>

      {loading && !result ? (
        <CardSkeleton />
      ) : error ? (
        <ErrorFallback message={error} onRetry={loadPalace} />
      ) : result ? (
        <div className="grid grid-cols-3 gap-6">
          {/* 左+中：九宫格 */}
          <div className="col-span-2 dzg-card p-6">
            {/* 流年/流月/日飞星切换 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#64748b]" />
                <span className="text-sm text-[#e2e8f0]">{date.year}年{date.month}月{date.day}日</span>
              </div>
              <div className="flex gap-1 bg-[#0a0e17] rounded-lg p-0.5">
                {(['year', 'month', 'day'] as StarLayer[]).map((l) => (
                  <button key={l} onClick={() => { setLayer(l); setSelectedPalace(null); }}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md transition-all',
                      layer === l
                        ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] font-semibold'
                        : 'text-[#64748b] hover:text-[#94a3b8]',
                    )}>
                    {LAYER_ICONS[l]} {LAYER_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* 九宫格 */}
            <div className="relative w-full aspect-square bg-[rgba(0,0,0,0.3)] rounded-lg overflow-hidden" style={{ maxHeight: '60vh' }}>
              {currentPalaces.map((p) => {
                const pos = LO_SHU_POSITIONS[p.position];
                if (!pos) return null;
                const [row, col] = pos;
                const isSelected = selectedPalace === p.position;
                const wuxingColor = WUXING_COLORS[p.star?.wuxing?.toLowerCase() as keyof typeof WUXING_COLORS] || '#94a3b8';
                const energyColor = p.energy > 60 ? '#2ECC71' : p.energy > 30 ? '#F39C12' : '#E74C3C';

                return (
                  <div key={p.position}
                    onClick={() => setSelectedPalace(isSelected ? null : p.position)}
                    className={cn(
                      'absolute cursor-pointer rounded-lg border transition-all duration-300',
                      'hover:brightness-110 hover:scale-[1.02]',
                      isSelected ? 'ring-2 ring-[#f59e0b] border-[#f59e0b]' : 'border-[#334155]',
                    )}
                    style={{
                      top: `${row * 33.33}%`, left: `${col * 33.33}%`,
                      width: '33.33%', height: '33.33%',
                      background: `linear-gradient(135deg, ${wuxingColor}08, ${wuxingColor}15)`,
                      boxShadow: isSelected ? `0 0 20px ${wuxingColor}40` : 'none',
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full p-2">
                      <div className="text-xs text-[#64748b] absolute top-2 left-2">{p.name}</div>
                      <div className="text-lg font-bold font-mono" style={{ color: wuxingColor }}>{p.star?.number}</div>
                      <div className="text-[10px] text-[#94a3b8]">{p.star?.name}</div>
                      <div className="text-[10px]" style={{ color: energyColor }}>{p.type}</div>
                      <div className="text-xs mt-1 font-mono" style={{ color: wuxingColor }}>{p.energy}%</div>
                    </div>
                  </div>
                );
              })}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 w-px h-full bg-[rgba(245,158,11,0.1)]" />
                <div className="absolute left-2/3 top-0 w-px h-full bg-[rgba(245,158,11,0.1)]" />
                <div className="absolute top-1/3 left-0 h-px w-full bg-[rgba(245,158,11,0.1)]" />
                <div className="absolute top-2/3 left-0 h-px w-full bg-[rgba(245,158,11,0.1)]" />
              </div>
            </div>
          </div>

          {/* 右侧：详情 */}
          <div className="space-y-4">
            {selectedData ? (
              <div className="dzg-card p-4">
                <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
                  <Info size={14} className="text-[#f59e0b]" />
                  {selectedData.name}宫（{selectedData.direction}方）— {LAYER_LABELS[layer]}
                </h3>
                <div className="space-y-2 text-sm">
                  <Detail label="当值星" value={`${selectedData.star?.number}号${selectedData.star?.name}`} color={WUXING_COLORS[selectedData.star?.wuxing?.toLowerCase() as keyof typeof WUXING_COLORS]} />
                  <Detail label="宫位五行" value={PALACE_INFO[selectedData.position]?.wuxing || ''} />
                  <Detail label="能量值" value={`${selectedData.energy}%`} color={selectedData.energy > 60 ? '#2ECC71' : '#F39C12'} />
                  <Detail label="吉凶评级" value={selectedData.type} color={selectedData.type === '大凶' || selectedData.type === '凶' ? '#E74C3C' : selectedData.type === '吉' ? '#2ECC71' : '#F39C12'} />
                  {selectedData.suitable && <Detail label="宜" value={selectedData.suitable.slice(0, 3).join('、')} color="#2ECC71" />}
                  {selectedData.avoid && <Detail label="忌" value={selectedData.avoid.slice(0, 3).join('、')} color="#E74C3C" />}
                </div>
              </div>
            ) : null}

            {result.summary && (
              <div className="dzg-card p-4">
                <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">吉凶星汇总</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-[10px] text-[#64748b] mb-1">吉星</div>
                    <div className="text-[#2ECC71]">{result.summary.auspiciousStars?.join('、') || '--'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748b] mb-1">凶星</div>
                    <div className="text-[#E74C3C]">{result.summary.inauspiciousStars?.join('、') || '--'}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="dzg-card p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">最佳方位</h3>
              <div className="text-lg font-bold text-[#2ECC71]">{result.summary.bestDirection}</div>
              <div className="text-xs text-[#64748b] mt-1">最差：<span className="text-[#E74C3C]">{result.summary.worstDirection}</span></div>
            </div>

            {result.text && (
              <div className="dzg-card p-4">
                <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">飞星解读</h3>
                <div className="text-xs text-[#94a3b8] whitespace-pre-line leading-relaxed">{result.text}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState icon={<Grid3X3 size={40} />} title="点击刷新加载九宫数据"
          action={<button onClick={loadPalace} className="px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm">加载数据</button>}
        />
      )}
    </div>
  );
}

function Detail({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#64748b] text-xs">{label}</span>
      <span className="font-mono text-xs text-[#e2e8f0]" style={color ? { color } : {}}>{value}</span>
    </div>
  );
}
