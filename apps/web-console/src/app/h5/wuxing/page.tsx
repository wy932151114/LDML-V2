'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/app/h5/_components/BottomNav';

/**
 * 道之自然 · H5 五行能量可视化页面
 * 基于八字排盘结果的五行能量展示
 */

const WUXING_COLORS: Record<string, string> = {
  '木': '#2ECC71', '火': '#E74C3C', '土': '#F39C12',
  '金': '#f59e0b', '水': '#3498DB',
};

const WUXING_ORDER = ['木', '火', '土', '金', '水'];

const WUXING_RELATIONS = {
  sheng: [
    { from: '木', to: '火', desc: '木生火' },
    { from: '火', to: '土', desc: '火生土' },
    { from: '土', to: '金', desc: '土生金' },
    { from: '金', to: '水', desc: '金生水' },
    { from: '水', to: '木', desc: '水生木' },
  ],
  ke: [
    { from: '木', to: '土', desc: '木克土' },
    { from: '土', to: '水', desc: '土克水' },
    { from: '水', to: '火', desc: '水克火' },
    { from: '火', to: '金', desc: '火克金' },
    { from: '金', to: '木', desc: '金克木' },
  ],
};

const WUXING_TRAITS: Record<string, { season: string; direction: string; organ: string; emotion: string; color: string; taste: string }> = {
  '木': { season: '春', direction: '东', organ: '肝', emotion: '怒', color: '青', taste: '酸' },
  '火': { season: '夏', direction: '南', organ: '心', emotion: '喜', color: '赤', taste: '苦' },
  '土': { season: '长夏', direction: '中', organ: '脾', emotion: '思', color: '黄', taste: '甘' },
  '金': { season: '秋', direction: '西', organ: '肺', emotion: '悲', color: '白', taste: '辛' },
  '水': { season: '冬', direction: '北', organ: '肾', emotion: '恐', color: '黑', taste: '咸' },
};

function getBalanceAdvice(percentages: Record<string, number>, yongShen: string[], jiShen: string[]): string[] {
  const advice: string[] = [];
  const sorted = [...WUXING_ORDER].sort((a, b) => (percentages[b] || 0) - (percentages[a] || 0));
  const max = sorted[0];
  const min = sorted[sorted.length - 1];

  if (percentages[max] > 40) {
    advice.push(`${max}过旺（${percentages[max]}%），宜泄不宜补。建议佩戴${max === '木' ? '金' : max === '火' ? '水' : max === '土' ? '木' : max === '金' ? '火' : '土'}属性饰品。`);
  }
  if (percentages[min] < 10) {
    advice.push(`${min}过弱（${percentages[min]}%），需补充${min}能量。多接触${WUXING_TRAITS[min].direction}方、${WUXING_TRAITS[min].color}色物品。`);
  }
  if (yongShen?.length) {
    advice.push(`用神为${yongShen.join('、')}，日常多运用${yongShen.map(s => WUXING_TRAITS[s]?.direction + '方' + WUXING_TRAITS[s]?.color + '色').join('、')}。`);
  }
  return advice;
}

export default function WuxingPage() {
  const [baziData, setBaziData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'advice' | 'relation'>('chart');

  useEffect(() => {
    const stored = sessionStorage.getItem('dzs_bazi_result');
    if (stored) {
      try { setBaziData(JSON.parse(stored)); } catch {}
    }
  }, []);

  const percentage = baziData?.elementBalance?.percentage || {};
  const details = baziData?.elementBalance?.scores || {};
  const total = baziData?.elementBalance?.totalScore || 0;
  const yongShen = baziData?.usefulGod?.yongShen || [];
  const jiShen = baziData?.usefulGod?.jiShen || [];
  const dominant = baziData?.elementBalance?.dominantElement || WUXING_ORDER.reduce((a, b) => (percentage[a] || 0) > (percentage[b] || 0) ? a : b);
  const advice = getBalanceAdvice(percentage, yongShen, jiShen);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-[#0a0e17]/80 backdrop-blur-lg border-b border-[#1e293b]">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => window.history.back()} className="text-[#94a3b8] hover:text-[#f59e0b] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold">五行能量</h1>
          <span className="text-[10px] text-[#64748b] ml-auto">
            {baziData?.dayMaster ? `日主${baziData.dayMaster} · ${baziData.strength?.bodyStrength || ''}` : ''}
          </span>
        </div>
      </header>

      {!baziData ? (
        <div className="px-4 pt-20 text-center">
          <div className="text-6xl mb-4 opacity-30">🔥</div>
          <p className="text-[#64748b] text-sm">请先进行八字排盘</p>
          <a href="/" className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-[#f59e0b] text-black font-semibold text-sm">去排盘</a>
        </div>
      ) : (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {/* 能量总值 */}
          <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-xs text-[#64748b]">能量总值</div>
                <div className="text-2xl font-bold text-[#f59e0b]">{total}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#64748b]">主导五行</div>
                <div className="text-lg font-bold" style={{ color: WUXING_COLORS[dominant] }}>{dominant}</div>
              </div>
            </div>

            {/* 五行能量条 */}
            <div className="space-y-3">
              {WUXING_ORDER.map((wx) => {
                const pct = percentage[wx] || 0;
                return (
                  <div key={wx}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: WUXING_COLORS[wx] }} />
                        {wx}
                      </span>
                      <span className={pct < 10 ? 'text-[#E74C3C]' : pct > 40 ? 'text-[#f59e0b]' : 'text-[#94a3b8]'}>
                        {details[wx] || 0} ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 bg-[#1a2332] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: WUXING_COLORS[wx], opacity: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'chart', label: '能量图' },
              { key: 'advice', label: '调养建议' },
              { key: 'relation', label: '生克关系' },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'
                    : 'bg-[#1a2332] text-[#64748b] border border-[#2a3a4e]'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 能量图 Tab */}
          {activeTab === 'chart' && (
            <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-5">
              <h3 className="text-xs font-semibold mb-4 text-[#94a3b8]">五行能量雷达</h3>
              <div className="flex justify-center">
                <svg viewBox="0 0 240 240" className="w-56 h-56">
                  {[1, 2, 3, 4, 5].map((ring) => (
                    <polygon key={ring}
                      points={WUXING_ORDER.map((_, i) => {
                        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                        const r = (ring / 5) * 90;
                        return `${120 + r * Math.cos(angle)},${120 + r * Math.sin(angle)}`;
                      }).join(' ')}
                      fill="none" stroke="#1e293b" strokeWidth="0.5"
                    />
                  ))}
                  {WUXING_ORDER.map((_, i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    return (
                      <line key={i} x1={120} y1={120}
                        x2={120 + 90 * Math.cos(angle)} y2={120 + 90 * Math.sin(angle)}
                        stroke="#1e293b" strokeWidth="0.5"
                      />
                    );
                  })}
                  <polygon
                    points={WUXING_ORDER.map((wx, i) => {
                      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                      const pct = Math.min(1, (percentage[wx] || 0) / 50);
                      const r = pct * 90;
                      return `${120 + r * Math.cos(angle)},${120 + r * Math.sin(angle)}`;
                    }).join(' ')}
                    fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5"
                  />
                  {WUXING_ORDER.map((wx, i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const pct = Math.min(1, (percentage[wx] || 0) / 50);
                    const r = pct * 90;
                    return (
                      <g key={wx}>
                        <circle cx={120 + r * Math.cos(angle)} cy={120 + r * Math.sin(angle)} r="3" fill={WUXING_COLORS[wx]} />
                        <text x={120 + 105 * Math.cos(angle)} y={120 + 105 * Math.sin(angle)}
                          textAnchor="middle" dominantBaseline="central"
                          fontSize="11" fill={WUXING_COLORS[wx]} fontWeight="bold">{wx}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* 调养建议 Tab */}
          {activeTab === 'advice' && (
            <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-5 space-y-3">
              <h3 className="text-xs font-semibold mb-2 text-[#94a3b8]">能量调养建议</h3>
              {advice.map((a, i) => (
                <div key={i} className="flex gap-2 text-sm text-[#e2e8f0] leading-relaxed">
                  <span className="text-[#f59e0b] shrink-0">{['①', '②', '③', '④', '⑤'][i] || '•'}</span>
                  <span>{a}</span>
                </div>
              ))}
              {advice.length === 0 && (
                <p className="text-sm text-[#64748b]">五行能量较为平衡，保持现状即可。</p>
              )}
            </div>
          )}

          {/* 生克关系 Tab */}
          {activeTab === 'relation' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-5">
                <h3 className="text-xs font-semibold mb-3 text-[#2ECC71]">相生关系</h3>
                <div className="space-y-2">
                  {WUXING_RELATIONS.sheng.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span style={{ color: WUXING_COLORS[r.from] }}>{r.from}</span>
                      <span className="text-[#64748b]">→</span>
                      <span style={{ color: WUXING_COLORS[r.to] }}>{r.to}</span>
                      <span className="text-[10px] text-[#64748b] ml-auto">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-5">
                <h3 className="text-xs font-semibold mb-3 text-[#E74C3C]">相克关系</h3>
                <div className="space-y-2">
                  {WUXING_RELATIONS.ke.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span style={{ color: WUXING_COLORS[r.from] }}>{r.from}</span>
                      <span className="text-[#64748b]">✕</span>
                      <span style={{ color: WUXING_COLORS[r.to] }}>{r.to}</span>
                      <span className="text-[10px] text-[#64748b] ml-auto">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-5">
                <h3 className="text-xs font-semibold mb-3 text-[#94a3b8]">五行对应</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1e293b]">
                        <th className="py-2 text-left text-[#64748b]">五行</th>
                        <th className="py-2 text-left text-[#64748b]">季节</th>
                        <th className="py-2 text-left text-[#64748b]">方位</th>
                        <th className="py-2 text-left text-[#64748b]">脏腑</th>
                        <th className="py-2 text-left text-[#64748b]">情志</th>
                        <th className="py-2 text-left text-[#64748b]">五味</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WUXING_ORDER.map((wx) => {
                        const t = WUXING_TRAITS[wx];
                        return (
                          <tr key={wx} className="border-b border-[#1e293b]/50">
                            <td className="py-2 font-medium" style={{ color: WUXING_COLORS[wx] }}>{wx}</td>
                            <td className="py-2 text-[#94a3b8]">{t.season}</td>
                            <td className="py-2 text-[#94a3b8]">{t.direction}</td>
                            <td className="py-2 text-[#94a3b8]">{t.organ}</td>
                            <td className="py-2 text-[#94a3b8]">{t.emotion}</td>
                            <td className="py-2 text-[#94a3b8]">{t.taste}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
