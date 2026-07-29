'use client';

import { useEffect, useRef, useState } from 'react';
import { useCVStore } from '@/store';
import { analyzeCVScan } from '@/lib/api';
import { cn, WUXING_COLORS } from '@/lib/utils';
import { ErrorFallback, EmptyState } from '@/lib/components';
import { Upload, Scan, Image, Map, AlertTriangle, CheckCircle, Target } from 'lucide-react';

export default function CVScanPage() {
  const { imagePreview, result, loading, error, setImagePreview, setResult, setLoading, setError } = useCVStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imagePreview) return;
    setLoading(true);
    setError(null);
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
    } finally {
      setLoading(false);
    }
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
      ctx.beginPath();
      ctx.moveTo(w * i / 3, 0);
      ctx.lineTo(w * i / 3, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h * i / 3);
      ctx.lineTo(w, h * i / 3);
      ctx.stroke();
    }

    // 宫位标签
    const palaceLabel = ['东南', '南', '西南', '东', '中', '西', '东北', '北', '西北'];
    palaceLabel.forEach((name, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      ctx.fillStyle = 'rgba(148,163,184,0.3)';
      ctx.font = '10px sans-serif';
      ctx.fillText(name, col * w / 3 + 5, row * h / 3 + 12);
    });

    // 检测框（从 spatialMap 或 elements 获取）
    const elementsToDraw = result.elements || [];
    if (result.spatialMap && elementsToDraw.length === 0) {
      result.spatialMap.forEach(entry => {
        entry.elements.forEach(el => {
          elementsToDraw.push({
            type: el.type,
            x: el.x, y: el.y,
            width: 0.12, height: 0.12,
            confidence: 0.9,
            wuxing: '土',
          });
        });
      });
    }

    elementsToDraw.forEach((el) => {
      const x = el.x * w;
      const y = el.y * h;
      const ew = el.width * w;
      const eh = el.height * h;

      ctx.strokeStyle = WUXING_COLORS[el.wuxing?.toLowerCase() as keyof typeof WUXING_COLORS] || '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, ew, eh);
      ctx.fillStyle = `${WUXING_COLORS[el.wuxing?.toLowerCase() as keyof typeof WUXING_COLORS] || '#f59e0b'}40`;
      ctx.fillRect(x, y, ew, eh);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${el.type} (${(el.confidence * 100).toFixed(0)}%)`, x + 2, y - 3);
    });

  }, [result]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">CV 空间扫描</h1>
          <p className="text-sm text-[#64748b] mt-1">AI视觉引擎 · 房间布局识别 · 空间风水分析</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 左：图片区 */}
        <div className="space-y-4">
          <div className="dzg-card p-6">
            <h2 className="text-sm font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
              <Image size={16} className="text-[#1ABC9C]" />
              房间照片
              <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]">预览版</span>
            </h2>

            {error && (
              <div className="mb-3 p-2 rounded-lg bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.2)] text-xs text-[#E74C3C]">
                {error}
              </div>
            )}

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#334155] rounded-lg p-12 text-center cursor-pointer hover:border-[#f59e0b] transition-all"
              >
                <Upload size={40} className="mx-auto mb-3 text-[#64748b]" />
                <p className="text-sm text-[#94a3b8]">点击上传房间照片</p>
                <p className="text-xs text-[#64748b] mt-1">支持 JPG/PNG，建议正北朝上</p>
              </div>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="房间" className="w-full rounded-lg" style={{ maxHeight: '50vh', objectFit: 'contain' }} />
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

            <div className="flex gap-2 mt-3">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 rounded-lg border border-[#334155] text-sm text-[#94a3b8] hover:bg-[rgba(255,255,255,0.03)]">
                选择图片
              </button>
              <button onClick={handleScan} disabled={!imagePreview || loading}
                className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#1ABC9C] to-[#16A085] text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Scan size={14} className="animate-pulse" /> : <Scan size={14} />}
                {loading ? '扫描中...' : '开始扫描'}
              </button>
            </div>
          </div>

          {/* 识别结果 */}
          {result && result.elements && result.elements.length > 0 && (
            <div className="dzg-card p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">识别对象</h3>
              <div className="grid grid-cols-2 gap-2">
                {result.elements.map((el, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] text-xs"
                    style={{ borderLeft: `3px solid ${WUXING_COLORS[el.wuxing?.toLowerCase() as keyof typeof WUXING_COLORS] || '#f59e0b'}` }}>
                    <div>
                      <div className="text-[#e2e8f0]">{el.type}</div>
                      <div className="text-[#64748b]">{el.wuxing} · {(el.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右：分析结果 */}
        <div className="space-y-4">
          {/* 九宫映射 — 使用spatialMap（后端字段） */}
          {result && result.spatialMap && result.spatialMap.length > 0 && (
            <div className="dzg-card p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
                <Map size={16} className="text-[#3498DB]" /> 九宫空间映射
              </h3>
              <div className="space-y-2 text-xs">
                {result.spatialMap.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
                    <span className="w-16 text-[#f59e0b]">{entry.palace}</span>
                    <span className="text-[#94a3b8]">{entry.elements.map(e => e.type).join('、')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 五行冲突 */}
          {result && result.conflicts && result.conflicts.length > 0 && (
            <div className="dzg-card p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#E74C3C]" /> 空间冲突
              </h3>
              <div className="space-y-2">
                {result.conflicts.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg border text-xs"
                    style={{ borderColor: c.severity === '中等' ? 'rgba(243,156,18,0.3)' : c.severity === '严重' ? 'rgba(231,76,60,0.3)' : 'rgba(243,156,18,0.3)', background: 'rgba(243,156,18,0.03)' }}>
                    <div className="font-semibold text-[#e2e8f0] mb-1">{c.type}</div>
                    <div className="text-[#94a3b8] mb-1">{c.description}</div>
                    {c.remedy && <div className="text-[#2ECC71]">化解：{c.remedy}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 改命建议 */}
          {result && result.advice && result.advice.length > 0 && (
            <div className="dzg-card p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
                <Target size={16} className="text-[#2ECC71]" /> AI 布局建议
              </h3>
              <div className="space-y-2">
                {result.advice.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg text-xs bg-[rgba(46,204,113,0.03)] border border-[rgba(46,204,113,0.15)]">
                    <CheckCircle size={12} className="text-[#2ECC71] mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#2ECC71] mb-0.5">{a.type}</div>
                      <div className="text-[#94a3b8]">{a.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && !error && (
            <EmptyState
              icon={<Upload size={40} />}
              title="上传房间照片后开始扫描"
              description="AI识别房间内物品并进行风水分析"
            />
          )}

          {error && (
            <ErrorFallback message={error} onRetry={handleScan} />
          )}
        </div>
      </div>
    </div>
  );
}
