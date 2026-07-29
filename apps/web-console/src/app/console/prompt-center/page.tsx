'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Send, RefreshCw, FileText, Terminal, Code,
  ChevronDown, Plus, Trash2, Eye,
} from 'lucide-react';

type PromptData = {
  promptId: string;
  name: string;
  category: string;
  tags: string[];
  provider: string;
  model: string;
  version: string;
  status: string;
  description: string;
  variables: string[];
  template: string;
  maxTokens: number;
};

type PromptListResponse = {
  prompts: PromptData[];
  total: number;
  page: number;
  limit: number;
};

export default function PromptCenterPage() {
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [renderedPrompt, setRenderedPrompt] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testTokenUsage, setTestTokenUsage] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number } | null>(null);
  const [testDuration, setTestDuration] = useState<number | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'render' | 'test'>('render');
  const [overrideProvider, setOverrideProvider] = useState('');
  const [overrideModel, setOverrideModel] = useState('');
  const [overrideTemperature, setOverrideTemperature] = useState('0.7');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('dzs_v2_token');
    return token ? { ...headers, 'Authorization': `Bearer ${token}` } : headers;
  }, []);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/prompts?limit=100', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data?.prompts) setPrompts(data.prompts);
      else if (Array.isArray(data)) setPrompts(data);
      else setPrompts([]);
    } catch (e) {
      setError('加载 Prompt 列表失败');
    }
    setLoading(false);
  };

  const selectPrompt = (p: PromptData) => {
    setSelectedPrompt(p);
    setRenderedPrompt('');
    setTestResult('');
    setTestTokenUsage(null);
    setTestDuration(null);
    setOverrideProvider(p.provider || '');
    setOverrideModel(p.model || '');

    const vars: Record<string, string> = {};
    (p.variables || []).forEach(v => {
      if (v === 'language') vars[v] = 'zh-CN';
      else if (v === 'today') vars[v] = new Date().toISOString().split('T')[0];
      else vars[v] = '';
    });
    setVariableValues(vars);
  };

  const handleRender = async () => {
    if (!selectedPrompt) return;
    setRenderLoading(true);
    setActiveTab('render');
    try {
      const res = await fetch('/api/v2/prompts/playground/render', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          promptId: selectedPrompt.promptId,
          variables: variableValues,
          overrides: {
            ...(overrideProvider ? { provider: overrideProvider } : {}),
            ...(overrideModel ? { model: overrideModel } : {}),
          },
        }),
      });
      const data = await res.json();
      if (data?.rendered) setRenderedPrompt(data.rendered);
      else if (data?.messages) setRenderedPrompt(JSON.stringify(data.messages, null, 2));
      else setRenderedPrompt(JSON.stringify(data, null, 2));
    } catch {
      setRenderedPrompt('渲染失败');
    }
    setRenderLoading(false);
  };

  const handleTest = async () => {
    if (!selectedPrompt) return;
    setTestLoading(true);
    setActiveTab('test');
    setTestResult('');
    setTestTokenUsage(null);
    setTestDuration(null);
    try {
      const res = await fetch('/api/v2/prompts/playground/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          promptId: selectedPrompt.promptId,
          variables: variableValues,
          overrides: {
            ...(overrideProvider ? { provider: overrideProvider } : {}),
            ...(overrideModel ? { model: overrideModel } : {}),
            ...(overrideTemperature ? { temperature: parseFloat(overrideTemperature) } : {}),
          },
        }),
      });
      const data = await res.json();
      setTestResult(data?.content || data?.result || JSON.stringify(data, null, 2));
      if (data?.tokenUsage) setTestTokenUsage(data.tokenUsage);
      if (data?.processingTimeMs != null) setTestDuration(data.processingTimeMs);
      else if (data?.durationMs != null) setTestDuration(data.durationMs);
    } catch {
      setTestResult('测试调用失败');
    }
    setTestLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Prompt Center · 提示词中心</h1>
        <button onClick={loadPrompts} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm">
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      {/* Error */}
      {error && <div className="text-xs text-[#E74C3C] text-center">{error}</div>}

      {/* Main Layout: Left Panel (Registry) + Right Panel (Playground) */}
      <div className="grid grid-cols-[360px_1fr] gap-6">
        {/* ── Left Panel: Prompt Registry ── */}
        <div className="dzg-card p-4 h-[calc(100vh-200px)] overflow-y-auto">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
            <FileText size={14} className="text-[#f59e0b]" />
            Prompt 注册表
            <span className="text-xs text-[#64748b] ml-auto">{prompts.length} 个</span>
          </h3>

          {loading ? (
            <div className="text-xs text-[#64748b] text-center py-8">加载中...</div>
          ) : prompts.length === 0 ? (
            <div className="text-xs text-[#64748b] text-center py-8">暂无 Prompt，开始注册</div>
          ) : (
            <div className="space-y-1">
              {prompts.map(p => (
                <button
                  key={p.promptId}
                  onClick={() => selectPrompt(p)}
                  className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                    selectedPrompt?.promptId === p.promptId
                      ? 'bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)]'
                      : 'hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#e2e8f0] font-medium">{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      p.status === 'active' ? 'bg-[rgba(46,204,113,0.15)] text-[#2ECC71]' :
                      p.status === 'inactive' ? 'bg-[rgba(231,76,60,0.15)] text-[#E74C3C]' :
                      'bg-[rgba(148,163,184,0.15)] text-[#94a3b8]'
                    }`}>
                      {p.status === 'active' ? '启用' : p.status === 'inactive' ? '停用' : '弃用'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(139,92,246,0.15)] text-[#a78bfa]">{p.category}</span>
                    <span className="text-[10px] text-[#64748b]">v{p.version}</span>
                    <span className="text-[10px] text-[#64748b]">{p.model}</span>
                  </div>
                  {p.description && (
                    <div className="text-[11px] text-[#64748b] mt-1 line-clamp-1">{p.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Panel: Playground ── */}
        <div className="dzg-card p-4 h-[calc(100vh-200px)] overflow-y-auto">
          {!selectedPrompt ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-[#64748b]">
                <Code size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">从左侧选择一个 Prompt</p>
                <p className="text-xs mt-1">即可在 Playground 中渲染和测试</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Prompt Header */}
              <div>
                <h2 className="text-lg font-semibold text-[#e2e8f0]">{selectedPrompt.name}</h2>
                <p className="text-xs text-[#64748b] mt-1">
                  {selectedPrompt.promptId} · v{selectedPrompt.version} · {selectedPrompt.category}
                  {(selectedPrompt.tags || []).map(t => (
                    <span key={t} className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[rgba(52,152,219,0.15)] text-[#3498DB]">{t}</span>
                  ))}
                </p>
                {selectedPrompt.description && (
                  <p className="text-xs text-[#94a3b8] mt-1">{selectedPrompt.description}</p>
                )}
              </div>

              {/* Variables Input */}
              {(selectedPrompt.variables || []).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#e2e8f0] mb-2 flex items-center gap-1">
                    <Terminal size={12} /> 变量 {selectedPrompt.variables.length}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(selectedPrompt.variables || []).map(v => (
                      <div key={v} className="flex items-center gap-2">
                        <label className="text-[11px] text-[#94a3b8] w-20 shrink-0 text-right">
                          {'{{'}{v}{'}}'}
                        </label>
                        <input
                          className="flex-1 bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)]"
                          value={variableValues[v] || ''}
                          onChange={e => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                          placeholder={`输入 ${v}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overrides */}
              <div>
                <h3 className="text-xs font-semibold text-[#e2e8f0] mb-2">运行时覆盖</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#64748b] block mb-1">Provider</label>
                    <input className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)]"
                      value={overrideProvider} onChange={e => setOverrideProvider(e.target.value)}
                      placeholder="留空用默认" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748b] block mb-1">Model</label>
                    <input className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)]"
                      value={overrideModel} onChange={e => setOverrideModel(e.target.value)}
                      placeholder="留空用默认" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748b] block mb-1">Temperature</label>
                    <input className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)]"
                      value={overrideTemperature} onChange={e => setOverrideTemperature(e.target.value)}
                      placeholder="0.7" type="number" step="0.1" min="0" max="2" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button onClick={handleRender} disabled={renderLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-xs hover:bg-[rgba(245,158,11,0.2)]">
                  <Eye size={14} /> {renderLoading ? '渲染中...' : '渲染预览'}
                </button>
                <button onClick={handleTest} disabled={testLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(46,204,113,0.1)] border border-[rgba(46,204,113,0.2)] text-[#2ECC71] text-xs hover:bg-[rgba(46,204,113,0.2)]">
                  <Send size={14} /> {testLoading ? '测试中...' : '一键测试'}
                </button>
              </div>

              {/* Tab: Render / Test */}
              <div className="flex border-b border-[#1e293b]">
                <button onClick={() => setActiveTab('render')}
                  className={`px-4 py-2 text-xs ${activeTab === 'render' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b]' : 'text-[#64748b]'}`}>
                  渲染结果
                </button>
                <button onClick={() => setActiveTab('test')}
                  className={`px-4 py-2 text-xs ${activeTab === 'test' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b]' : 'text-[#64748b]'}`}>
                  测试结果
                  {testTokenUsage && ` · ${testTokenUsage.totalTokens} tokens`}
                  {testDuration != null && ` · ${testDuration.toFixed(0)}ms`}
                </button>
              </div>

              {/* Result Display */}
              {activeTab === 'render' && renderedPrompt && (
                <pre className="text-xs text-[#e2e8f0] bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 max-h-[400px] overflow-auto whitespace-pre-wrap font-mono">
                  {renderedPrompt}
                </pre>
              )}

              {activeTab === 'test' && testResult && (
                <div>
                  {testTokenUsage && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] rounded-lg p-2 text-center">
                        <div className="text-[10px] text-[#64748b]">提示词 Token</div>
                        <div className="text-sm font-bold text-[#f59e0b]">{testTokenUsage.promptTokens}</div>
                      </div>
                      <div className="bg-[rgba(46,204,113,0.08)] border border-[rgba(46,204,113,0.15)] rounded-lg p-2 text-center">
                        <div className="text-[10px] text-[#64748b]">生成 Token</div>
                        <div className="text-sm font-bold text-[#2ECC71]">{testTokenUsage.completionTokens}</div>
                      </div>
                      <div className="bg-[rgba(52,152,219,0.08)] border border-[rgba(52,152,219,0.15)] rounded-lg p-2 text-center">
                        <div className="text-[10px] text-[#64748b]">总耗时</div>
                        <div className="text-sm font-bold text-[#3498DB]">{testDuration?.toFixed(0)}ms</div>
                      </div>
                    </div>
                  )}
                  <pre className="text-xs text-[#e2e8f0] bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 max-h-[500px] overflow-auto whitespace-pre-wrap font-mono">
                    {testResult}
                  </pre>
                </div>
              )}

              {!renderLoading && !testLoading && !renderedPrompt && !testResult && (
                <div className="text-center text-[#64748b] text-xs py-8">
                  点击「渲染预览」或「一键测试」查看结果
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
