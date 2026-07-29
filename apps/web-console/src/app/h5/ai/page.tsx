'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, PlusCircle, Send } from 'lucide-react';
import { generateAI } from '@/lib/api';

// ✨ 辅助：生成用户友好的八字摘要
function buildBaziContext(bazi: any): string {
  if (!bazi) return '';
  const dm = bazi.dayMaster || bazi.dayMaster || '--';
  const dmEl = bazi.dayMasterElement || '水';
  const strength = bazi.strength?.bodyStrength || bazi.strength?.bodyStrength || '中和';
  const ys = bazi.usefulGod?.yongShen || bazi.usefulGod?.yongShen || [];
  const js = bazi.usefulGod?.jiShen || bazi.usefulGod?.jiShen || [];
  const balance = bazi.elementBalance || bazi.elementBalance || {};
  const pct = balance.percentage || {};

  return JSON.stringify({
    dayMaster: dm,
    dayMasterElement: dmEl,  // 如 壬 → 水, 丙 → 火
    bodyStrength: strength,   // 身强/身弱/中和
    yongShen: ys,             // 用神
    jiShen: js,               // 忌神
    elementBalance: {
      wood: pct.木 || 0, fire: pct.火 || 0, earth: pct.土 || 0,
      metal: pct.金 || 0, water: pct.水 || 0,
    },
    pillars: bazi.pillars || bazi.pillars,
    tenGods: bazi.tenGods || bazi.tenGods,     // 十神
    nayan: bazi.pillars?.year?.nayin || null,
  }, null, 2);
}

/** 快速建议按钮 */
const SUGGESTIONS = [
  { text: '今日运势', icon: '🔮' },
  { text: '感情姻缘', icon: '💕' },
  { text: '事业财运', icon: '💼' },
  { text: '健康养生', icon: '🏥' },
  { text: '学业考试', icon: '📚' },
  { text: '择日出行', icon: '🚗' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AiPage() {
  const router = useRouter();
  const [baziData, setBaziData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从首页排盘获取八字完整数据
  useEffect(() => {
    const stored = sessionStorage.getItem('dzs_bazi_result');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 兼容两种格式：直接 result 或 { data: result }
        setBaziData(parsed.data || parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      // 构建完整的系统提示词 — 包含道之自然引擎的全部计算结果
      const sysPrompt = [
        `你是「道之自然」命理AI助手，当前日期：${today}。严格依据系统提供的八字计算结果给出分析和建议。`,
        '',
        '## ⚠️ 核心规则（必须遵守）',
        '1. 严禁自行推算或修改八字数据 — 必须完全使用下面提供的 {八字数据}',
        '2. 日主+五行元素（如壬水、丙火）必须对应正确，不得写错',
        '3. 所有命理分析必须基于系统已计算完成的用神、忌神、五行平衡',
        '4. 用神和忌神是系统的精确计算结果，AI不得重新判断',
        '5. 行文风格：简练、实用、有温度，体现道之自然的改命哲学',
        '',
        '## 道之自然·改命纪实录 核心规范',
        '',
        '### 认知框架',
        '1. 命理是基础，改命是目的 — 禁止只做预测不提供解决方案',
        '2. 五行生克是动态过程 — 必须结合流年、时辰、方位三重影响',
        '',
        '### 输出要求',
        '1. 每条建议必须注明经典出处（如《改命纪实录》卷三）',
        '2. 建议必须包含具体可执行的行动（时辰、方位、对应物品）',
        '3. 标注效果周期（如：7日内见效）',
        '',
        '### 禁忌',
        '1. 禁止"命中注定"等绝对化表述',
        '2. 禁止单纯算命不提供解决方案',
        '3. 操作建议必须简单到可立即执行',
        '4. 避免纯理论，用生活化语言',
        '',
        '## 回答结构',
        '- 先总结今日/当前的五行能量基调',
        '- 基于八字的用神忌神给出具体行动建议',
        '- 给出贴合实际的调整方案（颜色、方位、时辰等）',
        '- 附可执行的具体小仪式或操作',
        '',
      ].join('\n');

      const res = await generateAI({
        type: 'daily',
        prompt: msg,
        systemPrompt: sysPrompt,
        // 传递完整八字数据（不是只传部分字段）
        baziData: baziData ? (() => {
          const d = baziData;
          return {
            pillars: d.pillars || d.pillars,
            dayMaster: d.dayMaster || d.dayMaster,
            dayMasterElement: d.dayMasterElement || d.dayMasterElement,
            usefulGod: d.usefulGod || d.usefulGod,
            strength: d.strength || d.strength,
            elementBalance: d.elementBalance || d.elementBalance,
            tenGods: d.tenGods || d.tenGods,
            // 把计算出的八字摘要也作为用户名传递进去
            userName: `用户（${d.dayMaster || d.dayMaster}${d.dayMasterElement || d.dayMasterElement || ''}命）`,
          };
        })() : undefined,
      });

      // ✅ 核心判断依据：只要成功返回了内容就展示，不依赖 tokenUsage
      // (缓存命中也可能有 totalTokens=0, 但有内容就是成功的)
      if (res.success && res.data?.output) {
        const aiMsg: Message = { role: 'assistant', content: res.data.output, timestamp: new Date() };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // 降级：用本地规则引擎做兜底（但此时后端应该正常了）
        await new Promise(r => setTimeout(r, 600));
        const dm = baziData?.dayMaster || baziData?.dayMaster || '未知';
        const ys = baziData?.usefulGod?.yongShen || baziData?.usefulGod?.yongShen || [];
        const js = baziData?.usefulGod?.jiShen || baziData?.usefulGod?.jiShen || [];
        const response = [
          `【道之自然·命理提示】`,
          '',
          `您的日主为【${dm}】，命格分析如下：`,
          '',

          ...(ys.length > 0 ? [`✨ 用神：${ys.join('、')}`] : []),
          ...(js.length > 0 ? [`⚠️ 忌神：${js.join('、')}`] : []),
          '',
          `关于「${msg.slice(0, 30)}」的问题：`,
          '',
          '命理不是宿命，而是能量地图。知道自己的五行强弱、用神忌神，就能在关键节点做出更好的选择。',
          '',
          '核心建议：',
          ys.length > 0 ? `1. 善用用神（${ys.join('、')}）的力量` : '1. 结合自身五行能量顺势而为',
          js.length > 0 ? `2. 避开忌神（${js.join('、')}）的干扰` : '2. 保持能量平衡',
          '3. 平衡五行能量，顺势而为',
          '',
          '—— 道之自然·AI改命',
        ].join('\n');
        const aiMsg: Message = { role: 'assistant', content: response, timestamp: new Date() };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch {
      // 网络异常降级
      await new Promise(r => setTimeout(r, 600));
      const fallback = '抱歉，AI服务暂时不可用，请稍后重试。';
      const aiMsg: Message = { role: 'assistant', content: fallback, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0] flex flex-col">
      <header className="sticky top-0 z-10 bg-[#0a0e17]/80 backdrop-blur-lg border-b border-[#1e293b]">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => router.back()} className="text-[#94a3b8] hover:text-[#f59e0b] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold">AI改命</h1>
          <span className="text-[10px] text-[#64748b] ml-auto">
            {baziData ? `日主${baziData.dayMaster || baziData.dayMaster}${baziData.dayMasterElement || baziData.dayMasterElement || ''}` : '未排盘'}
          </span>
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); }}
              className="text-[10px] px-2 py-1 rounded-lg bg-[rgba(245,158,11,0.1)] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.2)] flex items-center gap-1 transition-all">
              <PlusCircle size={12} /> 新对话
            </button>
          )}
        </div>
      </header>

      {/* 建议栏 */}
      <div className="sticky top-12 z-10 bg-[#0a0e17]/90 backdrop-blur-sm border-b border-[#1e293b] px-3 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => handleSend(s.text)}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0f1525] border border-[#1e293b] text-xs text-[#94a3b8] hover:border-[#f59e0b]/30 hover:text-[#e2e8f0] transition-all active:scale-95">
              <span>{s.icon}</span>
              <span>{s.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3 space-y-4">
        {messages.length === 0 ? (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-[#0f1525] to-[#1a2332] border border-[#f59e0b]/10 p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-black font-bold text-lg">
                道
              </div>
              <h2 className="text-base font-semibold text-[#f59e0b]">道之自然·AI改命</h2>
              <p className="text-xs text-[#64748b] mt-2 leading-relaxed">
                知命不认命，改运先改心。{'\n'}
                点击上方功能按钮或直接输入问题。
              </p>
              {!baziData && (
                <div className="mt-3 p-3 rounded-xl bg-[#1a2332] border border-[#2a3a4e] text-xs text-[#64748b]">
                  建议先<a href="/" className="text-[#f59e0b] underline">返回首页排盘</a>，获得更精准分析
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                  msg.role === 'user'
                    ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/20'
                    : 'bg-[#0f1525] border border-[#1e293b]'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={12} className="text-[#f59e0b]" />
                      <span className="text-[10px] text-[#f59e0b] font-medium">道之自然AI</span>
                    </div>
                  )}
                  <div className="text-sm text-[#e2e8f0] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  <div className="text-[9px] text-[#4a5a6e] mt-2 text-right">
                    {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="sticky bottom-0 z-10 bg-[#0a0e17]/90 backdrop-blur-lg border-t border-[#1e293b] px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(''); } }}
            placeholder={baziData ? '输入你的问题...' : '请先排盘以获取更精准的分析...'}
            disabled={loading}
            className="flex-1 bg-[#0f1525] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-[#e2e8f0] placeholder-[#4a5a6e] focus:outline-none focus:border-[#f59e0b]/50 disabled:opacity-50"
          />
          <button onClick={() => handleSend('')} disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-black disabled:opacity-40 transition-all active:scale-90">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
