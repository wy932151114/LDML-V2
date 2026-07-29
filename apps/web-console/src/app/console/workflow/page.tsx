'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Plus, Play, Save, Trash2, Square, FileText,
  Server, GitBranch, Clock, Globe, Database, Code2,
  Box, ArrowRight, Zap, Loader2,
} from 'lucide-react';

// ── Types (mirrors API contract) ──
type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
type WorkflowNodeType =
  | 'START' | 'END' | 'AI_RUNTIME' | 'PROMPT' | 'REPORT'
  | 'CONDITION' | 'DELAY' | 'HTTP' | 'DATABASE' | 'CUSTOM';

interface WorkflowData {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: string;
  status: WorkflowStatus;
  nodeCount?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkflowNode {
  nodeId: string;
  type: WorkflowNodeType;
  label: string;
  config?: Record<string, any>;
  next?: string[];
}

interface WorkflowDetail {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: { edgeId: string; source: string; target: string; label?: string }[];
  variables?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ExecutionRecord {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  triggeredBy: string;
  error?: string;
}

// ── Node type metadata ──
const NODE_TYPE_META: Record<WorkflowNodeType, { icon: any; label: string; color: string; description: string }> = {
  START:       { icon: Play,     label: '开始',     color: '#2ECC71',  description: '工作流起点，触发执行' },
  END:         { icon: Square,   label: '结束',     color: '#E74C3C',  description: '工作流终点，返回结果' },
  AI_RUNTIME:  { icon: Server,   label: 'AI 调用',  color: '#8B5CF6',  description: '调用 AI Runtime 生成内容' },
  PROMPT:      { icon: FileText, label: 'Prompt',   color: '#f59e0b',  description: '渲染 Prompt 模板' },
  REPORT:      { icon: Box,      label: '报告生成',  color: '#F39C12',  description: '生成结构化报告' },
  CONDITION:   { icon: GitBranch,label: '条件分支',  color: '#3498DB',  description: '条件判断路由' },
  DELAY:       { icon: Clock,    label: '延迟',     color: '#1ABC9C',  description: '等待指定时长' },
  HTTP:        { icon: Globe,    label: 'HTTP',     color: '#9B59B6',  description: '发送 HTTP 请求' },
  DATABASE:    { icon: Database, label: '数据库',    color: '#E67E22',  description: '查询/写入数据库' },
  CUSTOM:      { icon: Code2,    label: '自定义',    color: '#94a3b8',  description: '自定义 JS 脚本' },
};

const STATUS_META: Record<WorkflowStatus, { label: string; color: string; bg: string }> = {
  draft:   { label: '草稿',   color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  active:  { label: '运行中', color: '#2ECC71', bg: 'rgba(46,204,113,0.15)' },
  paused:  { label: '已暂停', color: '#F39C12', bg: 'rgba(243,156,18,0.15)' },
  archived:{ label: '归档',  color: '#E74C3C', bg: 'rgba(231,76,60,0.15)' },
};

// ── Default config for new workflow nodes ──
function getDefaultConfig(type: WorkflowNodeType): Record<string, any> {
  switch (type) {
    case 'AI_RUNTIME': return { provider: '', model: '', temperature: 0.7, systemPrompt: '', maxTokens: 2048 };
    case 'PROMPT':     return { promptId: '', variables: {} };
    case 'REPORT':     return { template: '' };
    case 'CONDITION':  return { expression: '', branches: [{ label: '是', next: null }, { label: '否', next: null }] };
    case 'DELAY':      return { durationMs: 1000 };
    case 'HTTP':       return { url: '', method: 'GET', headers: {}, body: '' };
    case 'DATABASE':   return { query: '', collection: '' };
    case 'CUSTOM':     return { script: '', timeout: 30000 };
    default:           return {};
  }
}

// ── Default workflow ──
function createDefaultWorkflow(): WorkflowDetail {
  return {
    workflowId: '',
    name: '新工作流',
    description: '',
    version: '1.0.0',
    status: 'draft',
    nodes: [
      { nodeId: 'start', type: 'START', label: '开始', config: {}, next: ['end'] },
      { nodeId: 'end', type: 'END', label: '结束', config: {}, next: [] },
    ],
    edges: [
      { edgeId: 'e-start-end', source: 'start', target: 'end' },
    ],
    variables: [],
  };
}

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Workflow designer state
  const [editing, setEditing] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDetail | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState('');
  const [saving, setSaving] = useState(false);

  const getHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('dzs_v2_token');
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  // ── Load workflow list ──
  useEffect(() => { loadWorkflows(); }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    setError('');
    try {
      const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '?limit=100';
      const res = await fetch(`/api/v2/workflows${params}`, { headers: getHeaders() });
      const data = await res.json();
      if (data?.workflows) setWorkflows(data.workflows);
      else if (Array.isArray(data)) setWorkflows(data);
      else setWorkflows([]);
    } catch {
      setError('加载工作流列表失败');
    }
    setLoading(false);
  };

  // ── Select & load a workflow ──
  const selectWorkflow = async (w: WorkflowData) => {
    setEditing(true);
    setSelectedNode(null);
    setExecutions([]);
    setExecutionResult('');
    try {
      const res = await fetch(`/api/v2/workflows/${w.workflowId}`, { headers: getHeaders() });
      const data = await res.json();
      const detail: WorkflowDetail = data?.workflow || data || { ...w, nodes: [], edges: [] };
      setCurrentWorkflow(detail);

      // Load executions
      const exRes = await fetch(`/api/v2/workflows/${w.workflowId}/executions?limit=20`, { headers: getHeaders() });
      const exData = await exRes.json();
      if (exData?.executions) setExecutions(exData.executions);
      else if (Array.isArray(exData)) setExecutions(exData);
    } catch {
      setCurrentWorkflow({ ...w, nodes: [], edges: [], variables: [] });
    }
  };

  // ── New workflow ──
  const handleNew = () => {
    setEditing(true);
    setCurrentWorkflow(createDefaultWorkflow());
    setSelectedNode(null);
    setExecutions([]);
    setExecutionResult('');
  };

  // ── Save workflow ──
  const handleSave = async () => {
    if (!currentWorkflow) return;
    setSaving(true);
    try {
      const isNew = !currentWorkflow.workflowId;
      const url = isNew
        ? '/api/v2/workflows'
        : `/api/v2/workflows/${currentWorkflow.workflowId}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name: currentWorkflow.name,
          description: currentWorkflow.description,
          nodes: currentWorkflow.nodes,
          edges: currentWorkflow.edges,
          variables: currentWorkflow.variables,
        }),
      });
      const data = await res.json();
      if (data?.workflow) setCurrentWorkflow(data.workflow);
      loadWorkflows();
    } catch {
      setError('保存失败');
    }
    setSaving(false);
  };

  // ── Execute workflow ──
  const handleExecute = async () => {
    if (!currentWorkflow?.workflowId) return;
    setExecuting(true);
    setExecutionResult('');
    try {
      const res = await fetch(`/api/v2/workflows/${currentWorkflow.workflowId}/execute`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ input: {} }),
      });
      const data = await res.json();
      setExecutionResult(JSON.stringify(data, null, 2));
      // reload executions
      const exRes = await fetch(`/api/v2/workflows/${currentWorkflow.workflowId}/executions?limit=20`, { headers: getHeaders() });
      const exData = await exRes.json();
      if (exData?.executions) setExecutions(exData.executions);
      else if (Array.isArray(exData)) setExecutions(exData);
    } catch (e: any) {
      setExecutionResult(`执行失败: ${e.message}`);
    }
    setExecuting(false);
  };

  // ── Add node ──
  const handleAddNode = (type: WorkflowNodeType) => {
    if (!currentWorkflow) return;
    const meta = NODE_TYPE_META[type];
    const nodeId = `${type.toLowerCase()}-${Date.now()}`;
    const newNode: WorkflowNode = {
      nodeId,
      type,
      label: meta.label,
      config: getDefaultConfig(type),
      next: [],
    };
    // Link from last START-type node to this new node, and from this node to END
    const startNode = currentWorkflow.nodes.find(n => n.type === 'START');
    const endNode = currentWorkflow.nodes.find(n => n.type === 'END');
    const lastNonEnd = [...currentWorkflow.nodes.filter(n => n.type !== 'END' && n.type !== 'START'), newNode].slice(-1)[0];

    setCurrentWorkflow(prev => {
      if (!prev) return prev;
      const newNodes = [...prev.nodes, newNode];
      let newEdges = [...prev.edges];

      // Remove old edge from start→end, connect start→newNode, newNode→end
      if (startNode && endNode) {
        newEdges = newEdges.filter(e => !(e.source === startNode.nodeId && e.target === endNode.nodeId));
        newEdges.push({ edgeId: `e-${startNode.nodeId}-${nodeId}`, source: startNode.nodeId, target: nodeId });
        newEdges.push({ edgeId: `e-${nodeId}-${endNode.nodeId}`, source: nodeId, target: endNode.nodeId });
      }
      return { ...prev, nodes: newNodes, edges: newEdges };
    });
  };

  // ── Remove node ──
  const handleRemoveNode = (nodeId: string) => {
    if (!currentWorkflow) return;
    const meta = NODE_TYPE_META[currentWorkflow.nodes.find(n => n.nodeId === nodeId)?.type || 'CUSTOM'];
    if (meta && (meta.label === '开始' || meta.label === '结束')) return; // can't remove START/END
    setCurrentWorkflow(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.filter(n => n.nodeId !== nodeId),
        edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      };
    });
    if (selectedNode?.nodeId === nodeId) setSelectedNode(null);
  };

  // ── Update node config ──
  const updateNodeConfig = (nodeId: string, key: string, value: any) => {
    setCurrentWorkflow(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n =>
          n.nodeId === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n
        ),
      };
    });
    setSelectedNode(prev => prev && prev.nodeId === nodeId ? { ...prev, config: { ...prev.config, [key]: value } } : prev);
  };

  // ── Delete workflow ──
  const handleDelete = async (w: WorkflowData) => {
    if (!confirm(`确定删除工作流 "${w.name}"？`)) return;
    try {
      await fetch(`/api/v2/workflows/${w.workflowId}`, { method: 'DELETE', headers: getHeaders() });
      if (currentWorkflow?.workflowId === w.workflowId) {
        setEditing(false);
        setCurrentWorkflow(null);
        setSelectedNode(null);
      }
      loadWorkflows();
    } catch {
      setError('删除失败');
    }
  };

  // ── Render node config editor ──
  const renderNodeConfig = (node: WorkflowNode) => {
    const config = node.config || {};
    switch (node.type) {
      case 'AI_RUNTIME':
        return (
          <div className="space-y-2">
            <ConfigField label="Provider" value={config.provider || ''} onChange={v => updateNodeConfig(node.nodeId, 'provider', v)} placeholder="留空用默认" />
            <ConfigField label="Model" value={config.model || ''} onChange={v => updateNodeConfig(node.nodeId, 'model', v)} placeholder="留空用默认" />
            <ConfigField label="Temperature" value={String(config.temperature ?? 0.7)} onChange={v => updateNodeConfig(node.nodeId, 'temperature', parseFloat(v) || 0.7)} type="number" step="0.1" />
            <div>
              <label className="text-[10px] text-[#64748b] block mb-1">System Prompt</label>
              <textarea className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)] h-20 resize-none font-mono"
                value={config.systemPrompt || ''} onChange={e => updateNodeConfig(node.nodeId, 'systemPrompt', e.target.value)} />
            </div>
            <ConfigField label="Max Tokens" value={String(config.maxTokens ?? 2048)} onChange={v => updateNodeConfig(node.nodeId, 'maxTokens', parseInt(v) || 2048)} type="number" />
          </div>
        );
      case 'PROMPT':
        return (
          <div className="space-y-2">
            <ConfigField label="Prompt ID" value={config.promptId || ''} onChange={v => updateNodeConfig(node.nodeId, 'promptId', v)} placeholder="选择 Prompt" />
          </div>
        );
      case 'CONDITION':
        return (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-[#64748b] block mb-1">条件表达式</label>
              <textarea className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)] h-16 resize-none font-mono"
                value={config.expression || ''} onChange={e => updateNodeConfig(node.nodeId, 'expression', e.target.value)} placeholder="e.g. result.score > 0.5" />
            </div>
          </div>
        );
      case 'DELAY':
        return (
          <ConfigField label="延迟 (ms)" value={String(config.durationMs ?? 1000)} onChange={v => updateNodeConfig(node.nodeId, 'durationMs', parseInt(v) || 1000)} type="number" />
        );
      case 'HTTP':
        return (
          <div className="space-y-2">
            <ConfigField label="URL" value={config.url || ''} onChange={v => updateNodeConfig(node.nodeId, 'url', v)} placeholder="https://..." />
            <div>
              <label className="text-[10px] text-[#64748b] block mb-1">Method</label>
              <select className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)]"
                value={config.method || 'GET'} onChange={e => updateNodeConfig(node.nodeId, 'method', e.target.value)}>
                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
              </select>
            </div>
            {config.method !== 'GET' && (
              <div>
                <label className="text-[10px] text-[#64748b] block mb-1">Body</label>
                <textarea className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)] h-16 resize-none font-mono"
                  value={config.body || ''} onChange={e => updateNodeConfig(node.nodeId, 'body', e.target.value)} />
              </div>
            )}
          </div>
        );
      case 'DATABASE':
        return (
          <div className="space-y-2">
            <ConfigField label="集合/表" value={config.collection || ''} onChange={v => updateNodeConfig(node.nodeId, 'collection', v)} placeholder="collection name" />
            <div>
              <label className="text-[10px] text-[#64748b] block mb-1">查询</label>
              <textarea className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)] h-16 resize-none font-mono"
                value={config.query || ''} onChange={e => updateNodeConfig(node.nodeId, 'query', e.target.value)} placeholder='{ "field": "value" }' />
            </div>
          </div>
        );
      case 'REPORT':
        return (
          <div className="space-y-2">
            <ConfigField label="报告模板" value={config.template || ''} onChange={v => updateNodeConfig(node.nodeId, 'template', v)} placeholder="template name" />
          </div>
        );
      case 'CUSTOM':
        return (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-[#64748b] block mb-1">脚本 (JS)</label>
              <textarea className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)] h-24 resize-none font-mono"
                value={config.script || ''} onChange={e => updateNodeConfig(node.nodeId, 'script', e.target.value)}
                placeholder="// return { result: ctx.data };" />
            </div>
            <ConfigField label="超时 (ms)" value={String(config.timeout ?? 30000)} onChange={v => updateNodeConfig(node.nodeId, 'timeout', parseInt(v) || 30000)} type="number" />
          </div>
        );
      default:
        return <div className="text-xs text-[#64748b]">此节点无配置项</div>;
    }
  };

  const statusBadge = (status: WorkflowStatus) => {
    const m = STATUS_META[status];
    return <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: m.bg, color: m.color }}>{m.label}</span>;
  };

  // ── Main render ──
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Workflow Center · 工作流中心</h1>
        <div className="flex items-center gap-2">
          {editing && currentWorkflow && (
            <>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-xs hover:bg-[rgba(245,158,11,0.2)]">
                <Save size={14} /> {saving ? '保存中...' : '保存'}
              </button>
              {currentWorkflow.workflowId && (
                <button onClick={handleExecute} disabled={executing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(46,204,113,0.1)] border border-[rgba(46,204,113,0.2)] text-[#2ECC71] text-xs hover:bg-[rgba(46,204,113,0.2)]">
                  <Play size={14} /> {executing ? '执行中...' : '执行'}
                </button>
              )}
            </>
          )}
          <button onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(52,152,219,0.1)] border border-[rgba(52,152,219,0.2)] text-[#3498DB] text-xs hover:bg-[rgba(52,152,219,0.2)]">
            <Plus size={14} /> 新建
          </button>
          <button onClick={loadWorkflows} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm">
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="text-xs text-[#E74C3C] text-center">{error}</div>}

      {/* Main Layout */}
      <div className="grid grid-cols-[360px_1fr] gap-6">
        {/* ── Left Panel: Workflow Registry ── */}
        <div className="dzg-card p-4 h-[calc(100vh-200px)] overflow-y-auto flex flex-col">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
            <GitBranch size={14} className="text-[#f59e0b]" />
            工作流注册表
            <span className="text-xs text-[#64748b] ml-auto">{workflows.length} 个</span>
          </h3>

          {/* Search */}
          <div className="mb-3">
            <input
              className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-3 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)]"
              placeholder="搜索工作流..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') loadWorkflows(); }}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              <div className="text-xs text-[#64748b] text-center py-8">加载中...</div>
            ) : workflows.length === 0 ? (
              <div className="text-xs text-[#64748b] text-center py-8">
                暂无工作流
                <br />
                <button onClick={handleNew} className="text-[#f59e0b] mt-2 underline">新建一个</button>
              </div>
            ) : (
              workflows.map(w => (
                <div key={w.workflowId}
                  onClick={() => selectWorkflow(w)}
                  className={`w-full p-3 rounded-lg transition-colors text-sm cursor-pointer ${
                    currentWorkflow?.workflowId === w.workflowId
                      ? 'bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)]'
                      : 'hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#e2e8f0] font-medium">{w.name}</span>
                    <div className="flex items-center gap-1.5">
                      {statusBadge(w.status)}
                      <button onClick={e => { e.stopPropagation(); handleDelete(w); }}
                        className="text-[#64748b] hover:text-[#E74C3C] transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {w.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(139,92,246,0.15)] text-[#a78bfa]">{w.category}</span>
                    )}
                    <span className="text-[10px] text-[#64748b]">v{w.version}</span>
                    {w.nodeCount != null && (
                      <span className="text-[10px] text-[#64748b]">{w.nodeCount} 节点</span>
                    )}
                  </div>
                  {w.description && (
                    <div className="text-[11px] text-[#64748b] mt-1 line-clamp-1">{w.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel: Designer / Viewer ── */}
        <div className="dzg-card p-4 h-[calc(100vh-200px)] overflow-y-auto">
          {!editing || !currentWorkflow ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-[#64748b]">
                <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">选择一个工作流或新建</p>
                <p className="text-xs mt-1">在右侧设计器中进行可视化编排</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workflow Header */}
              <div>
                <input
                  className="text-lg font-semibold text-[#e2e8f0] bg-transparent border-none outline-none w-full"
                  value={currentWorkflow.name}
                  onChange={e => setCurrentWorkflow(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  placeholder="工作流名称"
                />
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#64748b]">{currentWorkflow.workflowId || '(新工作流)'}</span>
                  <span className="text-[10px] text-[#64748b]">v{currentWorkflow.version}</span>
                  {statusBadge(currentWorkflow.status)}
                </div>
                <input
                  className="w-full bg-transparent border-none text-xs text-[#64748b] outline-none mt-1 placeholder:text-[#475569]"
                  value={currentWorkflow.description || ''}
                  onChange={e => setCurrentWorkflow(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  placeholder="添加描述..."
                />
              </div>

              {/* Tabs: Node Palette / Canvas / Execution */}
              <div className="grid grid-cols-[220px_1fr] gap-4">
                {/* Left: Node Palette */}
                <div>
                  <h3 className="text-xs font-semibold text-[#e2e8f0] mb-2">节点面板</h3>
                  <div className="space-y-1">
                    {Object.entries(NODE_TYPE_META).map(([type, meta]) => {
                      const Icon = meta.icon;
                      const disabled = type === 'START' || type === 'END';
                      return (
                        <button key={type}
                          disabled={disabled}
                          onClick={() => handleAddNode(type as WorkflowNodeType)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                            disabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-[rgba(255,255,255,0.05)] cursor-pointer'
                          }`}
                        >
                          <Icon size={14} style={{ color: meta.color }} />
                          <span className="text-[#94a3b8]">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Canvas + Config */}
                <div className="space-y-4">
                  {/* Canvas — node list */}
                  <div>
                    <h3 className="text-xs font-semibold text-[#e2e8f0] mb-2">节点画布</h3>
                    <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-3 min-h-[180px] space-y-1">
                      {currentWorkflow.nodes.length === 0 ? (
                        <div className="text-xs text-[#64748b] text-center py-4">从左侧添加节点</div>
                      ) : (
                        currentWorkflow.nodes.map((node, i) => {
                          const meta = NODE_TYPE_META[node.type];
                          const Icon = meta.icon;
                          return (
                            <div key={node.nodeId}
                              onClick={() => setSelectedNode(node)}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors ${
                                selectedNode?.nodeId === node.nodeId
                                  ? 'bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)]'
                                  : 'hover:bg-[rgba(255,255,255,0.03)]'
                              }`}
                            >
                              <Icon size={14} style={{ color: meta.color }} />
                              <span className="text-[#e2e8f0] flex-1">{node.label}</span>
                              <span className="text-[10px] text-[#64748b]">{node.nodeId}</span>
                              {i < currentWorkflow.nodes.length - 1 && (
                                <ArrowRight size={12} className="text-[#1e293b]" />
                              )}
                              {node.type !== 'START' && node.type !== 'END' && (
                                <button onClick={e => { e.stopPropagation(); handleRemoveNode(node.nodeId); }}
                                  className="text-[#64748b] hover:text-[#E74C3C]">
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Node Config */}
                  {selectedNode && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#e2e8f0] mb-2 flex items-center gap-1">
                        <Zap size={12} className="text-[#f59e0b]" />
                        节点配置 — {selectedNode.label}
                        <span className="text-[10px] text-[#64748b] ml-auto">{selectedNode.type}</span>
                      </h3>
                      <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-3">
                        <ConfigField label="节点名称" value={selectedNode.label}
                          onChange={v => {
                            setCurrentWorkflow(prev => prev ? {
                              ...prev,
                              nodes: prev.nodes.map(n => n.nodeId === selectedNode.nodeId ? { ...n, label: v } : n),
                            } : prev);
                            setSelectedNode(prev => prev ? { ...prev, label: v } : prev);
                          }}
                        />
                        {renderNodeConfig(selectedNode)}
                      </div>
                    </div>
                  )}

                  {/* Execution results */}
                  {executionResult && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#e2e8f0] mb-2 flex items-center gap-1">
                        <Play size={12} className="text-[#2ECC71]" />
                        执行结果
                      </h3>
                      <pre className="text-xs text-[#e2e8f0] bg-[#0d1117] border border-[#1e293b] rounded-lg p-3 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono">
                        {executionResult}
                      </pre>
                    </div>
                  )}

                  {/* Execution history */}
                  {executions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#e2e8f0] mb-2 flex items-center gap-1">
                        <Clock size={12} className="text-[#94a3b8]" />
                        执行记录 ({executions.length})
                      </h3>
                      <div className="bg-[#0d1117] border border-[#1e293b] rounded-lg max-h-[200px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#1e293b] text-[#64748b]">
                              <th className="text-left py-2 px-2">状态</th>
                              <th className="text-left py-2 px-2">触发方式</th>
                              <th className="text-right py-2 px-2">耗时</th>
                            </tr>
                          </thead>
                          <tbody>
                            {executions.map(ex => (
                              <tr key={ex.executionId} className="border-b border-[#1e293b]">
                                <td className="py-2 px-2">
                                  <ExecutionStatusBadge status={ex.status} />
                                </td>
                                <td className="py-2 px-2 text-[#94a3b8]">{ex.triggeredBy}</td>
                                <td className="py-2 px-2 text-right text-[#94a3b8]">
                                  {ex.durationMs != null ? `${ex.durationMs}ms` : '--'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ──

function ConfigField({ label, value, onChange, placeholder, type, step }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-[#64748b] block mb-1">{label}</label>
      <input
        className="w-full bg-[#0d1117] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[rgba(245,158,11,0.3)]"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type={type || 'text'}
        step={step}
      />
    </div>
  );
}

const EXEC_STATUS_META: Record<string, { color: string; label: string }> = {
  running:    { color: '#3498DB', label: '运行中' },
  completed:  { color: '#2ECC71', label: '完成' },
  failed:     { color: '#E74C3C', label: '失败' },
  cancelled:  { color: '#94a3b8', label: '已取消' },
  pending:    { color: '#F39C12', label: '排队中' },
};

function ExecutionStatusBadge({ status }: { status: string }) {
  const m = EXEC_STATUS_META[status] || { color: '#94a3b8', label: status };
  return <span style={{ color: m.color }}>{m.label}</span>;
}
