'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useProviderConfigs, useUpdateProviderConfig, useTestProviderConnection } from '@/lib/hooks/queries';
import type { ProviderConfigItem } from '@/lib/hooks/queries';
import { cn } from '@/lib/utils';

// ============================================================
// AI Provider 配置管理页面
// 简体中文 · 支持加密存储、连接测试、运行时热加载
// ============================================================

/** Provider 对应的 Emoji 图标 */
const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  deepseek: '🧠',
  gemini: '✨',
  qwen: '🐉',
  claude: '🌿',
  mcp: '🔌',
};

/** 状态对应的 Tailwind 颜色 */
const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
};

/** 状态中文标签 */
const STATUS_LABELS: Record<string, string> = {
  healthy: '正常',
  degraded: '降级',
  unhealthy: '异常',
};

export default function ProviderConfigPage() {
  const { data: providers, isLoading, error, refetch } = useProviderConfigs(true);
  const updateConfig = useUpdateProviderConfig();
  const testConnection = useTestProviderConnection();
  const [editingProvider, setEditingProvider] = useState<ProviderConfigItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 数据为空且无错误时（认证可能还在进行中），定期自动重试
  const retryCount = useRef(0);
  useEffect(() => {
    if (!isLoading && providers && providers.length === 0 && !error && retryCount.current < 10) {
      const timer = setTimeout(() => {
        retryCount.current += 1;
        refetch();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [providers, isLoading, error, refetch]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleToggle = async (p: ProviderConfigItem) => {
    try {
      await updateConfig.mutateAsync({ name: p.name, enabled: !p.enabled });
      showToast(`「${p.displayName}」${p.enabled ? '已停用' : '已启用'}`);
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleTest = async (name: string) => {
    try {
      const result = await testConnection.mutateAsync(name);
      const statusText = STATUS_LABELS[result.status] || result.status;
      showToast(`${name}: ${statusText}（${result.latency}ms）`);
    } catch (err: any) {
      showToast(err.message || '测试失败', 'error');
    }
  };

  const handleSave = async (form: Record<string, any>) => {
    try {
      await updateConfig.mutateAsync(form as any);
      setEditingProvider(null);
      showToast(`「${form.displayName || form.name}」配置已更新`);
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#64748b] animate-pulse">加载 Provider 配置...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 text-red-400 text-sm">
          加载失败：{(error as any)?.message || '未知错误'}
          <button
            onClick={() => refetch()}
            className="ml-3 underline hover:text-red-300"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 提示条 */}
      {toast && (
        <div className={cn(
          'fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg transition-all text-sm font-medium',
          toast.type === 'success'
            ? 'bg-green-900/80 text-green-300 border border-green-700/50'
            : 'bg-red-900/80 text-red-300 border border-red-700/50',
        )}>
          {toast.message}
        </div>
      )}

      {/* 页头 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#e2e8f0]">AI Provider 配置</h1>
        <p className="text-[#64748b] text-sm mt-2">
          管理所有 AI 服务提供商的连接配置。API Key 经 AES-256 加密存储于数据库，修改后立即生效，无需重启服务。
        </p>
      </div>

      {/* Provider 卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(providers || []).map((p) => (
          <ProviderCard
            key={p.name}
            provider={p}
            onToggle={() => handleToggle(p)}
            onTest={() => handleTest(p.name)}
            onEdit={() => setEditingProvider(p)}
            isTesting={testConnection.isPending && testConnection.variables === p.name}
          />
        ))}
      </div>

      {/* 空状态 */}
      {(!providers || providers.length === 0) && (
        <div className="text-center py-16 text-[#64748b]">
          <div className="text-4xl mb-3">🔌</div>
          <p className="text-sm">暂无 Provider 配置</p>
          <p className="text-xs mt-1">系统将在首次启动时自动创建内置 Provider</p>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingProvider && (
        <EditModal
          provider={editingProvider}
          onSave={handleSave}
          onClose={() => setEditingProvider(null)}
          isSaving={updateConfig.isPending}
          testResult={editingProvider.lastTestResult}
        />
      )}
    </div>
  );
}

// ============================================================
// Provider 卡片
// ============================================================
function ProviderCard({
  provider,
  onToggle,
  onTest,
  onEdit,
  isTesting,
}: {
  provider: ProviderConfigItem;
  onToggle: () => void;
  onTest: () => void;
  onEdit: () => void;
  isTesting: boolean;
}) {
  const testResult = provider.lastTestResult;
  const statusColor = testResult ? STATUS_COLORS[testResult.status] : 'bg-gray-500';
  const statusLabel = testResult ? STATUS_LABELS[testResult.status] : '未测试';
  const latency = testResult ? `${testResult.latency}ms` : '';

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      provider.enabled
        ? 'border-[#1e293b] bg-[#0f1525]'
        : 'border-[#1e293b]/50 bg-[#0a0f1e] opacity-70',
    )}>
      {/* 卡片头：图标 + 名称 + 开关 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{PROVIDER_ICONS[provider.name] || '🔌'}</span>
          <div>
            <div className="font-semibold text-sm text-[#e2e8f0]">{provider.displayName}</div>
            <div className="text-xs text-[#64748b] mt-0.5">{provider.name}</div>
          </div>
        </div>
        {/* 启停开关 */}
        <button
          onClick={onToggle}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            provider.enabled ? 'bg-[#2ECC71]' : 'bg-[#334155]',
          )}
          title={provider.enabled ? '点击停用' : '点击启用'}
        >
          <div className={cn(
            'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow',
            provider.enabled ? 'translate-x-5' : 'translate-x-0.5',
          )} />
        </button>
      </div>

      {/* 配置详情 */}
      <div className="px-4 py-3 space-y-2 text-xs">
        <div className="flex justify-between text-[#94a3b8]">
          <span>API 地址</span>
          <span className="text-[#e2e8f0] max-w-[200px] truncate">{provider.baseUrl || '—'}</span>
        </div>
        <div className="flex justify-between text-[#94a3b8]">
          <span>默认模型</span>
          <span className="text-[#e2e8f0]">{provider.defaultModel || '—'}</span>
        </div>
        <div className="flex justify-between text-[#94a3b8]">
          <span>API 密钥</span>
          <span className="text-[#e2e8f0] font-mono text-[10px]">
            {provider.hasApiKey ? provider.apiKeyMasked : '未配置'}
          </span>
        </div>
        <div className="flex justify-between text-[#94a3b8]">
          <span>优先级 / 超时</span>
          <span className="text-[#e2e8f0]">{provider.priority} / {provider.timeout}ms</span>
        </div>
        <div className="flex justify-between text-[#94a3b8]">
          <span>请求上限</span>
          <span className="text-[#e2e8f0]">{provider.rpm} RPM / {provider.tpm} TPM</span>
        </div>
        <div className="flex justify-between text-[#94a3b8]">
          <span>重试策略</span>
          <span className="text-[#e2e8f0]">{provider.maxRetries} 次 / {provider.retryDelay}ms</span>
        </div>
      </div>

      {/* 状态 + 操作按钮 */}
      <div className="px-4 pb-4 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', statusColor)} />
          <span className="text-xs text-[#64748b]">{statusLabel}</span>
          {latency && <span className="text-xs text-[#475569]">（{latency}）</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTest}
            disabled={isTesting}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#334155] transition-colors disabled:opacity-50"
          >
            {isTesting ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={onEdit}
            className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(245,158,11,0.1)] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.2)] transition-colors"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 编辑弹窗
// ============================================================
function EditModal({
  provider,
  onSave,
  onClose,
  isSaving,
  testResult,
}: {
  provider: ProviderConfigItem;
  onSave: (data: Record<string, any>) => void;
  onClose: () => void;
  isSaving: boolean;
  testResult?: any;
}) {
  const [form, setForm] = useState({
    name: provider.name,
    displayName: provider.displayName,
    baseUrl: provider.baseUrl || '',
    defaultModel: provider.defaultModel || '',
    apiKey: '',
    enabled: provider.enabled,
    priority: provider.priority,
    timeout: provider.timeout,
    rpm: provider.rpm,
    tpm: provider.tpm,
    maxRetries: provider.maxRetries,
    retryDelay: provider.retryDelay,
    organization: provider.organization || '',
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = { ...form };
    delete payload.name; // name 不可修改，由 URL 参数传递
    // 如果 API Key 为空则不上传（不修改）
    if (!payload.apiKey) delete payload.apiKey;
    // 需要带上 name 用于 mutation
    (payload as any).name = provider.name;
    onSave(payload);
  };

  const testInfo = testResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f1525] border border-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
          <div>
            <h2 className="text-lg font-bold text-[#e2e8f0]">
              {PROVIDER_ICONS[provider.name]} {form.displayName}
            </h2>
            <div className="text-xs text-[#64748b] mt-0.5">{form.name}</div>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#e2e8f0] text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="显示名称" value={form.displayName} onChange={(v) => update('displayName', v)} />
            <FormField label="默认模型" value={form.defaultModel} onChange={(v) => update('defaultModel', v)} placeholder="gpt-4o" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">API 地址</label>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => update('baseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#f59e0b]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">
                API 密钥
                {provider.hasApiKey && (
                  <span className="text-[#475569] ml-1">（留空则不修改）</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => update('apiKey', e.target.value)}
                  placeholder={provider.hasApiKey ? '••••••••' : 'sk-...'}
                  className="w-full bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#f59e0b]/50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#e2e8f0] text-xs"
                >
                  {showApiKey ? '隐藏' : '显示'}
                </button>
              </div>
            </div>
          </div>

          {/* 优先级与性能 */}
          <div>
            <h3 className="text-sm font-medium text-[#94a3b8] mb-3">优先级与性能</h3>
            <div className="grid grid-cols-4 gap-4">
              <NumberField label="优先级" value={form.priority} onChange={(v) => update('priority', v)} min={0} max={1000} />
              <NumberField label="超时(ms)" value={form.timeout} onChange={(v) => update('timeout', v)} min={1000} max={300000} step={1000} />
              <NumberField label="RPM" value={form.rpm} onChange={(v) => update('rpm', v)} min={1} />
              <NumberField label="TPM" value={form.tpm} onChange={(v) => update('tpm', v)} min={1} />
            </div>
          </div>

          {/* 重试策略 */}
          <div>
            <h3 className="text-sm font-medium text-[#94a3b8] mb-3">重试策略</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="最大重试次数" value={form.maxRetries} onChange={(v) => update('maxRetries', v)} min={0} max={10} />
              <NumberField label="重试延迟(ms)" value={form.retryDelay} onChange={(v) => update('retryDelay', v)} min={100} step={100} />
            </div>
          </div>

          {/* OpenAI 组织 ID */}
          {provider.name === 'openai' && (
            <div>
              <label className="block text-xs text-[#94a3b8] mb-1.5">组织 ID（Organization ID）</label>
              <input
                type="text"
                value={form.organization}
                onChange={(e) => update('organization', e.target.value)}
                placeholder="org-..."
                className="w-full bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#f59e0b]/50"
              />
            </div>
          )}

          {/* 上次测试结果 */}
          {testInfo && (
            <div className="bg-[#0a0f1e] border border-[#1e293b] rounded-lg p-3">
              <h4 className="text-xs font-medium text-[#94a3b8] mb-2">上次连接测试</h4>
              <div className="flex items-center gap-2 text-xs">
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-white',
                  testInfo.status === 'healthy' ? 'bg-green-600' :
                  testInfo.status === 'degraded' ? 'bg-yellow-600' : 'bg-red-600',
                )}>
                  {STATUS_LABELS[testInfo.status] || testInfo.status}
                </span>
                <span className="text-[#64748b]">{testInfo.latency}ms</span>
                {testInfo.error && (
                  <span className="text-red-400/70 ml-1">{testInfo.error}</span>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black hover:from-[#d97706] hover:to-[#b45309] transition-all disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// 表单组件
// ============================================================

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-[#94a3b8] mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#f59e0b]/50"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-[#94a3b8] mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#f59e0b]/50"
      />
    </div>
  );
}
