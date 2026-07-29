'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import BottomNav from '@/app/h5/_components/BottomNav';
import { calculateNinePalaceApi } from '@/lib/api';
import type { PalaceData } from '@/lib/api';

/**
 * 道之自然 · H5 九宫飞星页面
 * 洛书九宫 + 流年/流月/日飞星展示（后端 API 驱动）
 */

// ── 命卦计算（本地纯函数，无依赖） ──────────────────────────

const PALACE_SHORT_NAMES: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽',
  5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
};

const DIRECTIONS: Record<number, string> = {
  1: '北', 2: '西南', 3: '东', 4: '东南',
  5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南',
};

/** 命卦吉利方位表 */
const MING_GUA_DIRECTIONS: Record<number, { name: string; direction: string; energy: string }[]> = {
  1: [{ name: '生气', direction: '东南', energy: '大吉' }, { name: '天医', direction: '东', energy: '吉' }, { name: '延年', direction: '南', energy: '吉' }, { name: '伏位', direction: '北', energy: '小吉' }],
  2: [{ name: '生气', direction: '东北', energy: '大吉' }, { name: '天医', direction: '西', energy: '吉' }, { name: '延年', direction: '西北', energy: '吉' }, { name: '伏位', direction: '西南', energy: '小吉' }],
  3: [{ name: '生气', direction: '南', energy: '大吉' }, { name: '天医', direction: '北', energy: '吉' }, { name: '延年', direction: '东南', energy: '吉' }, { name: '伏位', direction: '东', energy: '小吉' }],
  4: [{ name: '生气', direction: '北', energy: '大吉' }, { name: '天医', direction: '南', energy: '吉' }, { name: '延年', direction: '东', energy: '吉' }, { name: '伏位', direction: '东南', energy: '小吉' }],
  6: [{ name: '生气', direction: '西', energy: '大吉' }, { name: '天医', direction: '东北', energy: '吉' }, { name: '延年', direction: '西南', energy: '吉' }, { name: '伏位', direction: '西北', energy: '小吉' }],
  7: [{ name: '生气', direction: '西北', energy: '大吉' }, { name: '天医', direction: '西南', energy: '吉' }, { name: '延年', direction: '东北', energy: '吉' }, { name: '伏位', direction: '西', energy: '小吉' }],
  8: [{ name: '生气', direction: '西南', energy: '大吉' }, { name: '天医', direction: '西北', energy: '吉' }, { name: '延年', direction: '西', energy: '吉' }, { name: '伏位', direction: '东北', energy: '小吉' }],
  9: [{ name: '生气', direction: '东', energy: '大吉' }, { name: '天医', direction: '东南', energy: '吉' }, { name: '延年', direction: '北', energy: '吉' }, { name: '伏位', direction: '南', energy: '小吉' }],
};

/** 计算命卦：出生年→个人卦数 */
function calcMingGua(year: number, gender: 'male' | 'female'): { number: number; name: string; direction: string; type: string; wuxing: string } {
  let sum = String(year).split('').reduce((a, d) => a + parseInt(d, 10), 0);
  while (sum >= 10) sum = String(sum).split('').reduce((a, d) => a + parseInt(d, 10), 0);
  const before2000 = year < 2000;
  let kua = gender === 'male' ? (before2000 ? 11 - sum : 9 - sum) : (before2000 ? 4 + sum : 6 + sum);
  while (kua > 9) kua -= 9;
  while (kua < 1) kua += 9;
  const num = kua === 5 ? (gender === 'male' ? 2 : 8) : kua;
  const wx: Record<number, string> = { 1: '水', 2: '土', 3: '木', 4: '木', 6: '金', 7: '金', 8: '土', 9: '火' };
  return {
    number: num,
    name: PALACE_SHORT_NAMES[num] || '',
    direction: DIRECTIONS[num] || '',
    type: [1, 3, 4, 9].includes(num) ? '东四命' : '西四命',
    wuxing: wx[num] || '',
  };
}

// ── 九宫页面常量 ──────────────────────────────────────────

const PALACE_NAMES: Record<number, string> = {
  1: '坎宫', 2: '坤宫', 3: '震宫', 4: '巽宫',
  5: '中宫', 6: '乾宫', 7: '兑宫', 8: '艮宫', 9: '离宫',
};

const STAR_NAMES: Record<number, string> = {
  1: '贪狼', 2: '巨门', 3: '禄存', 4: '文曲',
  5: '廉贞', 6: '武曲', 7: '破军', 8: '左辅', 9: '右弼',
};

const STAR_TYPES: Record<number, string> = {
  1: '吉', 2: '凶', 3: '凶', 4: '吉',
  5: '大凶', 6: '吉', 7: '凶', 8: '吉', 9: '吉',
};

const STAR_COLORS: Record<string, string> = {
  '吉': '#2ECC71', '大吉': '#1ABC9C',
  '凶': '#E74C3C', '大凶': '#C0392B', '中性': '#F39C12',
};

const directionNames: Record<number, string> = {
  1: '北', 2: '西南', 3: '东', 4: '东南',
  5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南',
};

function PalaceGrid({ palaces, title, colors }: { palaces: PalaceData[]; title: string; colors?: boolean }) {
  const grid = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  return (
    <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
      <h3 className="text-xs font-semibold mb-3 text-[#94a3b8]">{title}</h3>
      <div className="grid grid-cols-3 gap-1.5 max-w-[300px] mx-auto">
        {grid.map((pos) => {
          const p = palaces.find((p: any) => p.position === pos);
          if (!p) return <div key={pos} className="aspect-square rounded-lg bg-[#1a2332] border border-[#2a3a4e]" />;
          const typeColor = STAR_COLORS[p.type] || '#64748b';
          return (
            <div key={pos} className={`aspect-square rounded-lg bg-[#1a2332] border flex flex-col items-center justify-center p-1 ${
              colors ? `border-[${typeColor}]/20` : 'border-[#2a3a4e]'
            }`}>
              <div className="text-lg font-bold" style={colors ? { color: typeColor } : { color: '#f59e0b' }}>
                {p.star?.number}
              </div>
              <div className="text-[9px] text-[#94a3b8] leading-tight text-center">{PALACE_NAMES[p.position]}</div>
              {colors && (
                <div className="text-[8px] mt-0.5" style={{ color: typeColor }}>{p.type}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function JiugongPage() {
  const [baziData, setBaziData] = useState<any>(null);
  const [mode, setMode] = useState<'year' | 'month' | 'day'>('day');
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [result, setResult] = useState<{ year: PalaceData[]; month: PalaceData[]; day: PalaceData[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mingGua, setMingGua] = useState<{ number: number; name: string; direction: string; type: string; wuxing: string } | null>(null);
  const now = new Date();

  useEffect(() => {
    const stored = sessionStorage.getItem('dzs_bazi_result');
    if (stored) {
      try { setBaziData(JSON.parse(stored)); } catch {}
    }
    const inputStr = sessionStorage.getItem('dzs_bazi_input');
    if (inputStr) {
      try {
        const input = JSON.parse(inputStr);
        if (input.year && input.gender) {
          const g = input.gender === '男' || input.gender === 'male' ? 'male' : 'female';
          setMingGua(calcMingGua(input.year, g));
        }
      } catch {}
    }
    loadPalace();
  }, []);

  const loadPalace = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calculateNinePalaceApi(now.getFullYear(), now.getMonth() + 1, now.getDate());
      if (res.success) {
        setResult({
          year: res.data.year,
          month: res.data.month,
          day: res.data.day,
        });
      } else {
        setError('服务端返回错误');
      }
    } catch (e: any) {
      setError(e.message || '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 命宫计算：日干→后天八卦方位
  const MING_GONG: Record<string, number> = {
    '甲':3,'乙':3,'丙':9,'丁':9,'戊':5,'己':5,'庚':7,'辛':7,'壬':1,'癸':1,
  };
  const ELEMENT_DIR: Record<string, string> = {
    '木':'东','火':'南','土':'中','金':'西','水':'北',
  };
  const dm = baziData?.dayMaster || '';
  const mingGongNum = MING_GONG[dm] || 0;
  const yongShen = baziData?.usefulGod?.yongShen || [];
  const jiShen = baziData?.usefulGod?.jiShen || [];
  const yongDir = ELEMENT_DIR[yongShen[0]] || '';
  const jiDir = ELEMENT_DIR[jiShen[0]] || '';

  const activePalaces = result ? result[mode] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0]">
      <header className="sticky top-0 z-10 bg-[#0a0e17]/80 backdrop-blur-lg border-b border-[#1e293b]">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => window.history.back()} className="text-[#94a3b8] hover:text-[#f59e0b] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold">九宫飞星</h1>
          <span className="text-[10px] text-[#64748b] ml-auto">
            {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日
          </span>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 模式切换 */}
        <div className="flex gap-2">
          {[
            { key: 'year' as const, label: '流年' },
            { key: 'month' as const, label: '流月' },
            { key: 'day' as const, label: '日飞星' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setMode(tab.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                mode === tab.key
                  ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                  : 'bg-[#1a2332] text-[#64748b] border border-[#2a3a4e]'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 加载状态 */}
        {loading && !result && (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-[#64748b] animate-pulse">加载九宫飞星数据...</div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="rounded-2xl bg-[#1a2332] border border-[#E74C3C]/30 p-4 text-center">
            <div className="text-[#E74C3C] text-sm mb-2">{error}</div>
            <button onClick={loadPalace}
              className="px-4 py-1.5 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-xs">
              重试
            </button>
          </div>
        )}

        {/* 九宫图 */}
        {activePalaces.length > 0 && (
          <PalaceGrid palaces={activePalaces} title={`${mode === 'year' ? '流年' : mode === 'month' ? '流月' : '今日'}九宫飞星`} colors />
        )}

        {/* 吉凶方位 */}
        {activePalaces.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
              <h3 className="text-xs font-semibold mb-2 text-[#2ECC71]">吉方</h3>
              {activePalaces.filter((p: any) => p.type === '吉' || p.type === '大吉').map((p: any) => (
                <div key={p.position} className="flex items-center justify-between text-sm py-1">
                  <span>{PALACE_NAMES[p.position]}（{directionNames[p.position]}）</span>
                  <span className="text-[#2ECC71] text-xs">{p.star.number}白·{p.star.name}</span>
                </div>
              ))}
              {activePalaces.filter((p: any) => p.type === '吉' || p.type === '大吉').length === 0 && (
                <div className="text-sm text-[#64748b]">当前时段无吉星</div>
              )}
            </div>
            <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
              <h3 className="text-xs font-semibold mb-2 text-[#E74C3C]">凶方</h3>
              {activePalaces.filter((p: any) => p.type === '凶' || p.type === '大凶').map((p: any) => (
                <div key={p.position} className="flex items-center justify-between text-sm py-1">
                  <span>{PALACE_NAMES[p.position]}（{directionNames[p.position]}）</span>
                  <span className="text-[#E74C3C] text-xs">{p.star.number}·{p.star.name}</span>
                </div>
              ))}
              {activePalaces.filter((p: any) => p.type === '凶' || p.type === '大凶').length === 0 && (
                <div className="text-sm text-[#64748b]">当前时段无凶星</div>
              )}
            </div>
          </div>
        )}

        {/* 方位详解 */}
        {activePalaces.length > 0 && (
          <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
            <h3 className="text-xs font-semibold mb-3 text-[#94a3b8]">九宫方位详解</h3>
            <div className="space-y-2">
              {activePalaces.sort((a: any, b: any) => a.position - b.position).map((p: any) => (
                <div key={p.position}
                  onClick={() => setShowDetail(showDetail === p.position ? null : p.position)}
                  className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#1a2332] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      p.type === '吉' || p.type === '大吉' ? 'bg-[#2ECC71]/20 text-[#2ECC71]' :
                      p.type === '凶' || p.type === '大凶' ? 'bg-[#E74C3C]/20 text-[#E74C3C]' :
                      'bg-[#F39C12]/20 text-[#F39C12]'
                    }`}>{p.star.number}</span>
                    <div>
                      <div className="text-sm">{PALACE_NAMES[p.position]} · {p.star.name}</div>
                      <div className="text-[10px] text-[#64748b]">方位{directionNames[p.position]} · 五行{p.star.wuxing} · 能量{p.energy}%</div>
                    </div>
                  </div>
                  <Info size={14} className="text-[#4a5a6e]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 命主个人飞星 */}
        {baziData && activePalaces.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-[#0f1525] to-[#1a2332] border border-[#f59e0b]/10 p-4">
            <h3 className="text-xs font-semibold mb-3 text-[#f59e0b]">命主个人飞星</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#94a3b8]">命宫（日干）：</span>
                <span className="text-[#f59e0b] font-bold">{mingGongNum ? `${PALACE_NAMES[mingGongNum]} (${directionNames[mingGongNum]})` : '—'}</span>
                <span className="text-[#64748b] ml-1">({dm}日主)</span>
              </div>
              {mingGua && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94a3b8]">命卦（本命）：</span>
                    <span className="text-[#f59e0b] font-bold">
                      {mingGua.name}宫（{mingGua.direction}）· {mingGua.type}
                    </span>
                    <span className="text-[#64748b] ml-1">{mingGua.wuxing} · {mingGua.number}数</span>
                  </div>
                  <div className="mt-1 p-2 rounded-lg bg-[#1a2332] border border-[#2a3a4e]">
                    <div className="text-[10px] text-[#64748b] mb-1">命卦吉方（八宅风水）</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MING_GUA_DIRECTIONS[mingGua.number]?.map((d, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px]">
                          <span className={d.energy === '大吉' ? 'text-[#2ECC71]' : d.energy === '吉' ? 'text-[#1ABC9C]' : 'text-[#94a3b8]'}>
                            {d.name}
                          </span>
                          <span className="text-[#64748b]">{d.direction}方</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {yongDir && (
                <div className="flex items-center gap-2">
                  <span className="text-[#2ECC71]">用神方位：</span>
                  <span className="text-[#2ECC71] font-bold">{yongDir}方</span>
                  <span className="text-[#64748b]">（{yongShen.join('、')}）— 宜坐卧朝向</span>
                </div>
              )}
              {jiDir && (
                <div className="flex items-center gap-2">
                  <span className="text-[#E74C3C]">忌神方位：</span>
                  <span className="text-[#E74C3C] font-bold">{jiDir}方</span>
                  <span className="text-[#64748b]">（{jiShen.join('、')}）— 宜避开冲煞</span>
                </div>
              )}
              <div className="mt-2 p-2 rounded-lg bg-[#1a2332] border border-[#2a3a4e]">
                <div className="text-[10px] text-[#64748b] mb-1">当前{mode === 'year' ? '流年' : mode === 'month' ? '流月' : '今日'}吉位指向</div>
                <div className="flex gap-2 flex-wrap">
                  {activePalaces.filter((p: any) => p.type === '吉' || p.type === '大吉').slice(0, 2).map((p: any) => (
                    <span key={p.position} className="text-[10px] text-[#2ECC71]">· {PALACE_NAMES[p.position]}（{directionNames[p.position]}）</span>
                  ))}
                  {activePalaces.filter((p: any) => p.type === '吉' || p.type === '大吉').length === 0 && (
                    <span className="text-[10px] text-[#64748b]">当前时段无吉星</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 今日提示 — 基于日飞星 */}
        {result && (
          <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
            <h3 className="text-xs font-semibold mb-3 text-[#94a3b8]">今日提示</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#2ECC71] mb-2">宜往</div>
                <div className="space-y-1">
                  {result.day.filter((p: any) => p.type === '吉' || p.type === '大吉').slice(0, 3).map((p: any) => (
                    <div key={p.position} className="text-sm text-[#e2e8f0]">
                      · {directionNames[p.position]}方（{PALACE_NAMES[p.position]}）
                    </div>
                  ))}
                  {result.day.filter((p: any) => p.type === '吉' || p.type === '大吉').length === 0 && (
                    <div className="text-sm text-[#64748b]">今日无吉方</div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#E74C3C] mb-2">忌往</div>
                <div className="space-y-1">
                  {result.day.filter((p: any) => p.type === '凶' || p.type === '大凶').slice(0, 3).map((p: any) => (
                    <div key={p.position} className="text-sm text-[#e2e8f0]">
                      · {directionNames[p.position]}方（{PALACE_NAMES[p.position]}）
                    </div>
                  ))}
                  {result.day.filter((p: any) => p.type === '凶' || p.type === '大凶').length === 0 && (
                    <div className="text-sm text-[#64748b]">今日无凶方</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
