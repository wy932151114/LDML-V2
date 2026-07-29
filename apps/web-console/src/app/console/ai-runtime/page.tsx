'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Server, Database, CheckCircle, AlertTriangle, XCircle, Play } from 'lucide-react';

type ProviderStatus = { provider: string; status: string; latency: number; model: string };

export default function AIRuntimePage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem('dzs_v2_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const h = await (await fetch('/api/v2/ai-runtime/health', { headers })).json();
      setProviders(Object.entries(h.providers || {}).map(([k, v]: [string, any]) => ({ provider: k, ...v })));
    } catch {}
    try {
      const m = await (await fetch('/api/v2/ai-runtime/models', { headers })).json();
      setModels(Array.isArray(m) ? m : m?.models || []);
    } catch {}
    try {
      const c = await (await fetch('/api/v2/ai-runtime/config', { headers })).json();
      setConfig(c);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className="p-6 text-[#e2e8f0]">加载中...</div>;

  const healthyCount = providers.filter(p => p.status === 'healthy').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">AI 运行引擎</h1>
        <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm">
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <OverviewCard icon={Server} label="Provider 在线" value={`${healthyCount}/${providers.length}`} color="#8B5CF6" />
        <OverviewCard icon={Database} label="模型数量" value={models.length > 0 ? `${models.length}` : '--'} color="#f59e0b" />
        <OverviewCard icon={CheckCircle} label="默认 Provider" value={config?.defaultProvider || '--'} color="#2ECC71" />
        <OverviewCard icon={CheckCircle} label="默认模型" value={config?.defaultModel || '--'} color="#3498DB" />
      </div>

      <div className="dzg-card p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Provider 状态</h3>
        {providers.length === 0 ? (
          <div className="text-xs text-[#64748b] text-center py-8">暂无数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b] text-[#64748b] text-xs uppercase">
                <th className="text-left py-3 px-2">名称</th>
                <th className="text-left py-3 px-2">状态</th>
                <th className="text-left py-3 px-2">延迟</th>
                <th className="text-left py-3 px-2">模型</th>
              </tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p.provider} className="border-b border-[#1e293b]">
                  <td className="py-3 px-2 text-[#e2e8f0]">{p.provider}</td>
                  <td className="py-3 px-2"><StatusBadge status={p.status} /></td>
                  <td className="py-3 px-2 text-[#94a3b8]">{p.latency > 0 ? `${p.latency}ms` : '--'}</td>
                  <td className="py-3 px-2 text-[#94a3b8]">{p.model || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="dzg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-[#64748b] mb-1">{label}</div>
          <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any; label: string }> = {
    healthy: { color: '#2ECC71', icon: CheckCircle, label: '正常' },
    degraded: { color: '#F39C12', icon: AlertTriangle, label: '降级' },
    unhealthy: { color: '#E74C3C', icon: XCircle, label: '异常' },
  };
  const c = map[status] || map.unhealthy; const Icon = c.icon;
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={14} style={{ color: c.color }} />
      <span style={{ color: c.color }}>{c.label}</span>
    </div>
  );
}
