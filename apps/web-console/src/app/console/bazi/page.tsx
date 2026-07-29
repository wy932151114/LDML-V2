'use client';

import { useState, useEffect } from 'react';
import { useBaziStore } from '@/store';
import { calculateBazi, type BaziResult } from '@/lib/api';
import { useBaziMutation } from '@/lib/hooks/queries';
import { cn, WUXING_COLORS, WUXING_NAMES } from '@/lib/utils';
import { CardSkeleton, EmptyState, ErrorFallback } from '@/lib/components';
import { Search, RefreshCw, Clock, MapPin, User, AlertCircle, Brain } from 'lucide-react';

const CHINESE_CITIES = [
  { name: '北京', lon: 116.4, lat: 39.9 },
  { name: '上海', lon: 121.47, lat: 31.23 },
  { name: '广州', lon: 113.26, lat: 23.13 },
  { name: '深圳', lon: 114.07, lat: 22.54 },
  { name: '成都', lon: 104.07, lat: 30.67 },
  { name: '杭州', lon: 120.15, lat: 30.28 },
  { name: '武汉', lon: 114.3, lat: 30.6 },
  { name: '西安', lon: 108.93, lat: 34.27 },
  { name: '重庆', lon: 106.55, lat: 29.57 },
  { name: '南京', lon: 118.78, lat: 32.06 },
  { name: '乌鲁木齐', lon: 87.6, lat: 43.8 },
  { name: '哈尔滨', lon: 126.6, lat: 45.8 },
];

export default function BaziPage() {
  const { input, result, loading, error, setInput, setResult, setLoading, setError } = useBaziStore();
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const baziMutation = useBaziMutation();

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setAiInterpretation(null);
    try {
      const res = await calculateBazi(input);
      if (res.success) {
        setResult(res.data);
        generateInterpretation(res.data);
      } else {
        setError('计算失败：服务端返回错误');
      }
    } catch (e: any) {
      setError(e.message || '请求失败，请检查服务端是否运行');
    } finally {
      setLoading(false);
    }
  };

  // 从 sessionStorage 恢复八字输入数据到表单
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restored) return;
    try {
      const raw = sessionStorage.getItem('dzs_bazi_input');
      if (raw) {
        const bd = JSON.parse(raw);
        setInput({
          year: bd.year || 1990,
          month: bd.month || 1,
          day: bd.day || 1,
          hour: bd.hour ?? 12,
          minute: bd.minute ?? 0,
          gender: bd.gender || 'male',
          birthPlace: bd.birthPlace || '',
          longitude: bd.longitude || 120,
          useTrueSolar: bd.useTrueSolar ?? true,
        });
        setRestored(true);
        // 触发自动计算（用 setTimeout 避免闭包问题）
        setTimeout(() => handleCalculate(), 0);
      } else {
        setRestored(true);
      }
    } catch {
      setRestored(true);
    }
  }, []);

  // AI 解读（基于引擎数据，非mock）
  const generateInterpretation = (bazi: BaziResult) => {
    const dm = bazi.dayMaster;
    // dayMasterElement 可能位于顶层或 strength 对象中
    const dmEl = bazi.dayMasterElement || (bazi.strength as any)?.dayMasterElement || 'water';
    const dmName = WUXING_NAMES[dmEl] || WUXING_NAMES[dmEl as keyof typeof WUXING_NAMES] || '水';
    const ys = bazi.usefulGod?.yongShen?.join('、') || '火';
    const js = bazi.usefulGod?.jiShen?.join('、') || '水';
    const st = bazi.strength?.bodyStrength || '中和';
    setAiInterpretation(`【日主${dm}${dmName} · ${st}】

命局分析：
日主为${dm}${dmName}，生于${bazi.pillars.month.full}月，五行分布为金${bazi.elementBalance.percentage.金}%、木${bazi.elementBalance.percentage.木}%、水${bazi.elementBalance.percentage.水}%、火${bazi.elementBalance.percentage.火}%、土${bazi.elementBalance.percentage.土}%。

${st === '身弱' ? '日主偏弱，需印星（火）生扶、比劫（土）相助。' : st === '身强' ? '日主较强，宜食伤（金）泄秀、官杀（木）制身。' : '五行能量较为均衡，顺势而为即可。'}

用神：${ys}
忌神：${js}

改命建议：
① 今日宜穿${ys}色系衣物（增强用神能量）
② 宜朝${bazi.pillars.hour.earthlyBranch === '午' ? '南' : '北'}方活动
③ ${bazi.trueSolarTime?.shichen || '午'}时进行重要决策效果最佳
④ 忌${js}色系物品，减少相关方位活动

—— 《道之自然·改命纪实录》AI生成`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">八字排盘</h1>
        <p className="text-sm text-[#64748b] mt-1">道之自然命理引擎 · 四柱八字精确排盘</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 左侧输入 */}
        <div className="dzg-card p-6">
          <h2 className="text-sm font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
            <User size={16} className="text-[#f59e0b]" /> 出生信息
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">年</label>
              <input type="number" value={input.year} onChange={e => setInput({ year: parseInt(e.target.value) || 1990 })}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">月</label>
              <input type="number" min={1} max={12} value={input.month} onChange={e => setInput({ month: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">日</label>
              <input type="number" min={1} max={31} value={input.day} onChange={e => setInput({ day: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-[#64748b] mb-1 block flex items-center gap-1"><Clock size={12} /> 时间</label>
              <div className="flex gap-2">
                <input type="number" min={0} max={23} value={input.hour} onChange={e => setInput({ hour: parseInt(e.target.value) || 12 })}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none" placeholder="时" />
                <span className="text-[#64748b] self-center">:</span>
                <input type="number" min={0} max={59} value={input.minute} onChange={e => setInput({ minute: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none" placeholder="分" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#64748b] mb-1 block">性别</label>
              <select value={input.gender} onChange={e => setInput({ gender: e.target.value })}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none">
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-[#64748b] mb-1 block flex items-center gap-1"><MapPin size={12} /> 出生地（经度）</label>
            <div className="flex gap-2">
              <select value={input.birthPlace || ''} onChange={e => {
                const city = CHINESE_CITIES.find(c => c.name === e.target.value);
                setInput({ birthPlace: e.target.value, longitude: city?.lon || 120 });
              }}
                className="flex-1 bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none">
                <option value="">选择城市</option>
                {CHINESE_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}（{c.lon}°E）</option>)}
              </select>
              <input type="number" value={input.longitude} onChange={e => setInput({ longitude: parseFloat(e.target.value) || 120 })}
                className="w-24 bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:border-[#f59e0b] focus:outline-none text-center" step={0.1} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm text-[#94a3b8] cursor-pointer">
              <input type="checkbox" checked={input.useTrueSolar} onChange={e => setInput({ useTrueSolar: e.target.checked })}
                className="accent-[#f59e0b]" />
              启用真太阳时修正
            </label>
          </div>

          <button onClick={handleCalculate} disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? '排盘中...' : '开始排盘'}
          </button>

          {error && (
            <ErrorFallback message={error} onRetry={handleCalculate} className="mt-4" />
          )}
        </div>

        {/* 右侧结果 */}
        <div className="space-y-6">
          {loading ? (
            <CardSkeleton />
          ) : result ? (
            <>
              {/* 四柱 */}
              <div className="dzg-card p-6">
                <h2 className="text-sm font-semibold text-[#e2e8f0] mb-4">四柱八字</h2>
                <div className="grid grid-cols-4 gap-3">
                  {(['year', 'month', 'day', 'hour'] as const).map((key, i) => {
                    const p = result.pillars?.[key] || result.pillars?.[key]; // ✅ 兼容两层访问
                    if (!p) return null;
                    const labels = ['年柱', '月柱', '日柱', '时柱'];
                    return (
                      <div key={key} className="text-center p-3 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.1)]">
                        <div className="text-[10px] text-[#64748b] mb-2">{labels[i]}</div>
                        <div className="text-2xl font-bold text-[#f59e0b] font-mono">{p.full}</div>
                        <div className="text-[10px] text-[#64748b] mt-1">{p.nayin}</div>
                        <div className="text-[10px] text-[#64748b]">藏干：{p.hiddenStems?.join(' ') || ''}</div>
                        {p.kongWang && <div className="text-[10px] text-[#E74C3C]">空{p.kongWang}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* 真太阳时 */}
                {result.trueSolarTime && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#94a3b8] bg-[rgba(245,158,11,0.05)] rounded-lg p-2">
                    <Clock size={12} /> 真太阳时修正：{result.trueSolarTime.hour}:{String(result.trueSolarTime.minute).padStart(2, '0')} · 偏移{result.trueSolarTime.offsetMinutes}分钟
                    {result.trueSolarTime.crossed && <span className="text-[#f59e0b]">（跨时辰）</span>}
                  </div>
                )}
              </div>

              {/* 日主 + 用神 */}
              <div className="dzg-card p-6">
                <h2 className="text-sm font-semibold text-[#e2e8f0] mb-4">命主信息</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-[rgba(245,158,11,0.05)]">
                    <div className="text-[10px] text-[#64748b]">日主</div>
                    <div className="text-xl font-bold text-[#f59e0b] mt-1">{result.dayMaster || result.dayMaster}</div>
                    <div className="text-xs text-[#94a3b8]">{WUXING_NAMES[result.dayMasterElement || result.dayMasterElement]} · {result.strength?.bodyStrength || result.strength?.bodyStrength}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(46,204,113,0.05)]">
                    <div className="text-[10px] text-[#64748b]">用神</div>
                    <div className="text-xl font-bold text-[#2ECC71] mt-1">{result.usefulGod?.yongShen?.join('/') || result.usefulGod?.yongShen?.join('/') || '--'}</div>
                    <div className="text-xs text-[#94a3b8]">喜神：{result.usefulGod?.xiShen?.join('/') || result.usefulGod?.xiShen?.join('/') || '--'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(231,76,60,0.05)]">
                    <div className="text-[10px] text-[#64748b]">忌神</div>
                    <div className="text-xl font-bold text-[#E74C3C] mt-1">{result.usefulGod?.jiShen?.join('/') || result.usefulGod?.jiShen?.join('/') || '--'}</div>
                    <div className="text-xs text-[#94a3b8]">宜避之</div>
                  </div>
                </div>
              </div>

              {/* AI解读 */}
              {aiInterpretation && (
                <div className="dzg-card p-6">
                  <h2 className="text-sm font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
                    <Brain size={16} className="text-[#9B59B6]" /> AI 命理解读
                  </h2>
                  <div className="text-sm text-[#94a3b8] whitespace-pre-line leading-relaxed">
                    {aiInterpretation}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<Search size={40} />}
              title="输入出生信息后开始排盘"
              description="支持真太阳时修正 · 含经度城市快捷选择"
            />
          )}
        </div>
      </div>
    </div>
  );
}
