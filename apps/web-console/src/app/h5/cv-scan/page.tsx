'use client';

import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Upload, Scan, Image, Map, AlertTriangle, CheckCircle } from 'lucide-react';
import BottomNav from '@/app/h5/_components/BottomNav';
import { analyzeCVScan } from '@/lib/api';
import type { CVScanResult } from '@/lib/api';
import { WUXING_COLORS } from '@/lib/utils';

export default function H5CVScanPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<CVScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imagePreview) return;
    setLoading(true);
    setError('');
    try {
      // 只发图片长度作为种子（后端不真实识别图片），避免413 Payload Too Large
      const payload = { image: `scan_${Date.now()}_${imagePreview.length}` };
      const res = await analyzeCVScan(payload);
      if (res.success) {
        setResult(res.data);
      } else {
        setError('扫描失败，请重试');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '网络连接失败';
      setError(`扫描请求失败：${msg}`);
    } finally { setLoading(false); }
  };

  // 绘制标注
  useEffect(() => {
    if (!canvasRef.current || !result) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.clearRect(0, 0, w, h);

    // 九宫格
    ctx.strokeStyle = 'rgba(245,158,11,0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(w * i / 3, 0); ctx.lineTo(w * i / 3, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h * i / 3); ctx.lineTo(w, h * i / 3); ctx.stroke();
    }

    // 检测框
    const els = result.elements || [];
    const labels = ['东南', '南', '西南', '东', '中', '西', '东北', '北', '西北'];
    labels.forEach((name, i) => {
      ctx.fillStyle = 'rgba(148,163,184,0.3)';
      ctx.font = '10px sans-serif';
      ctx.fillText(name, (i % 3) * w / 3 + 5, Math.floor(i / 3) * h / 3 + 12);
    });

    els.forEach((el) => {
      const x = el.x * w, y = el.y * h, ew = el.width * w, eh = el.height * h;
      const color = WUXING_COLORS[el.wuxing?.toLowerCase() as keyof typeof WUXING_COLORS] || '#f59e0b';
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, ew, eh);
      ctx.fillStyle = `${color}40`; ctx.fillRect(x, y, ew, eh);
      ctx.fillStyle = '#e2e8f0'; ctx.font = '11px sans-serif';
      ctx.fillText(`${el.type} (${(el.confidence * 100).toFixed(0)}%)`, x + 2, y - 3);
    });
  }, [result]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0] pb-20">
      <header className="sticky top-0 z-10 bg-[#0a0e17]/80 backdrop-blur-lg border-b border-[#1e293b]">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => window.history.back()} className="text-[#94a3b8] hover:text-[#f59e0b]"><ArrowLeft size={20} /></button>
          <h1 className="text-sm font-semibold">CV 空间扫描</h1>
        </div>
      </header>

      <div className="px-4 py-5 space-y-4">
        {/* 上传区 */}
        <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Image size={16} className="text-[#1ABC9C]" /> 房间照片
            <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]">预览版</span>
          </h2>
          {!imagePreview ? (
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#334155] rounded-xl p-10 text-center cursor-pointer hover:border-[#f59e0b] transition-all">
              <Upload size={36} className="mx-auto mb-2 text-[#64748b]" />
              <p className="text-sm text-[#94a3b8]">点击上传房间照片</p>
              <p className="text-xs text-[#64748b] mt-1">支持 JPG/PNG</p>
            </div>
          ) : (
            <div className="relative">
              <img src={imagePreview} alt="房间" className="w-full rounded-xl" style={{ maxHeight: '40vh', objectFit: 'contain' }} />
              <canvas ref={canvasRef} width={400} height={300}
                className="absolute inset-0 w-full h-full pointer-events-none" />
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <div className="flex gap-2 mt-3">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 rounded-xl border border-[#334155] text-sm text-[#94a3b8]">选择图片</button>
            <button onClick={handleScan} disabled={!imagePreview || loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#1ABC9C] to-[#16A085] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Scan size={14} className="animate-pulse" /> : <Scan size={14} />}
              {loading ? '扫描中...' : '开始扫描'}
            </button>
          </div>
          {error && <p className="text-xs text-[#E74C3C] mt-2">{error}</p>}
        </div>

        {/* 结果区 */}
        {result && (
          <>
            {result.elements.length > 0 && (
              <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
                <h3 className="text-xs font-semibold mb-2">识别对象</h3>
                <div className="flex flex-wrap gap-2">
                  {result.elements.map((el, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.03)]"
                      style={{ borderLeft: `3px solid ${WUXING_COLORS[el.wuxing?.toLowerCase() as keyof typeof WUXING_COLORS] || '#f59e0b'}` }}>
                      {el.type} · {el.wuxing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.spatialMap.length > 0 && (
              <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Map size={12} className="text-[#3498DB]" /> 九宫空间映射
                </h3>
                <div className="space-y-1.5 text-xs text-[#94a3b8]">
                  {result.spatialMap.map((entry, i) => (
                    <div key={i} className="flex justify-between p-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
                      <span className="text-[#f59e0b]">{entry.palace}</span>
                      <span>{entry.elements.map(e => e.type).join('、')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.conflicts.length > 0 && (
              <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-[#E74C3C]" /> 空间冲突
                </h3>
                <div className="space-y-2">
                  {result.conflicts.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl border text-xs"
                      style={{ borderColor: c.severity === '严重' ? 'rgba(231,76,60,0.3)' : 'rgba(243,156,18,0.3)' }}>
                      <div className="font-semibold text-[#e2e8f0] mb-0.5">{c.type}</div>
                      <div className="text-[#94a3b8]">{c.description}</div>
                      {c.remedy && <div className="text-[#2ECC71] mt-1">化解：{c.remedy}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.advice.length > 0 && (
              <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <CheckCircle size={12} className="text-[#2ECC71]" /> 布局建议
                </h3>
                <div className="space-y-2">
                  {result.advice.map((a, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-[rgba(46,204,113,0.03)] border border-[rgba(46,204,113,0.15)] text-xs">
                      <div className="font-semibold text-[#2ECC71] mb-0.5">{a.type}</div>
                      <div className="text-[#94a3b8]">{a.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!result && !imagePreview && (
          <div className="text-center py-10 text-xs text-[#64748b]">
            上传房间照片，AI自动识别布局并进行风水分析
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
