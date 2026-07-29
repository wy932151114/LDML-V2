'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { reportApi, Report, ReportJobStatus } from './report-api';
import ReportForm from './report-form';
import ReportHistory from './report-history';
import ReportPreview from './report-preview';
import JobProgress from './job-progress';

type TabType = 'generate' | 'history' | 'preview';

const REPORT_TYPES = [
  { value: 'bazi', label: '八字分析' },
  { value: 'wuxing', label: '五行分析' },
  { value: 'dayun', label: '大运流年' },
  { value: 'jiugong', label: '九宫飞星' },
  { value: 'fengshui', label: '风水扫描' },
  { value: 'ai_comprehensive', label: 'AI综合命理' },
  { value: 'enterprise', label: '企业风水' },
  { value: 'daily', label: '每日运势' },
  { value: 'weekly', label: '周运' },
  { value: 'monthly', label: '月运' },
  { value: 'yearly', label: '年运' },
];

export default function ReportCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [jobStatus, setJobStatus] = useState<ReportJobStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadReports = useCallback(async (p: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportApi.list(p);
      setReports(data.items || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch (err: any) {
      setError(err.message || '加载报告列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadReports();
  }, [activeTab, loadReports]);

  const handleGenerate = async (type: string, baziData?: any) => {
    setLoading(true);
    setError(null);
    try {
      // 如果没有明确传 baziData，尝试从 sessionStorage 读取当前排盘数据
      let effectiveBazi = baziData;
      if (!effectiveBazi) {
        try {
          const stored = sessionStorage.getItem('dzs_bazi_result');
          if (stored) {
            const parsed = JSON.parse(stored);
            effectiveBazi = parsed.data || parsed;
          }
        } catch {}
      }

      // 从首页输入数据获取用户姓名和出生信息
      let userName = '';
      let birthInfo = '';
      try {
        const baziInput = sessionStorage.getItem('dzs_bazi_input');
        if (baziInput) {
          const inputData = JSON.parse(baziInput);
          userName = inputData.userName || inputData.name || '';
          // 构建出生信息字符串（含时辰和性别）
          const hourStr = inputData.hour !== undefined && inputData.hour !== null
            ? `${String(inputData.hour).padStart(2, '0')}:${String(inputData.minute || 0).padStart(2, '0')}`
            : '未知时辰';
          const genderStr = inputData.gender === '男' || inputData.gender === 'male' ? '男' :
                            inputData.gender === '女' || inputData.gender === 'female' ? '女' : '未知';
          birthInfo = `${inputData.year}年${inputData.month}月${inputData.day}日 ${hourStr}，${genderStr}性`;
          if (inputData.birthPlace) birthInfo += `，出生地${inputData.birthPlace}`;
        }
      } catch {}

      // 如果 effectiveBazi 中有姓名信息也提取
      if (!userName && effectiveBazi?.userName) {
        userName = effectiveBazi.userName;
      }
      if (!userName && effectiveBazi?.name) {
        userName = effectiveBazi.name;
      }

      // 构建完整的 baziData 包（含 userName、birthInfo、性别和全量算法数据）
      const payloadBazi = effectiveBazi ? {
        ...effectiveBazi,
        userName: userName || undefined,
        birthInfo: birthInfo || effectiveBazi.birthInfo || '',
        gender: effectiveBazi.gender || undefined,
      } : undefined;

      const result = await reportApi.generate(type, payloadBazi);
      setJobStatus(result);
      // 轮询进度
      pollJobProgress(result.jobId);
    } catch (err: any) {
      setError(err.message || '提交任务失败');
    } finally {
      setLoading(false);
    }
  };

  const pollJobProgress = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await reportApi.getJobProgress(jobId);
        setJobStatus(status);
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          if (status.status === 'completed') loadReports();
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleSelectReport = async (report: Report) => {
    try {
      const detail = await reportApi.get(report.id);
      setSelectedReport(detail);
      setActiveTab('preview');
    } catch (err: any) {
      setError(err.message || '加载报告详情失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await reportApi.delete(id);
      loadReports();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const handleExport = async (id: string, format: 'html' | 'pdf' | 'markdown') => {
    try {
      const blob = await reportApi.export(id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.${format === 'markdown' ? 'md' : format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || '导出失败');
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'generate', label: '生成报告' },
    { key: 'history', label: '历史报告' },
    { key: 'preview', label: '报告预览' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">AI 报告中心</h1>
            <p className="text-gray-400 text-sm mt-1">智能命理分析报告生成与管理</p>
          </div>
          <div className="flex gap-2">
            {REPORT_TYPES.slice(0, 4).map((t) => (
              <button
                key={t.value}
                onClick={() => { setActiveTab('generate'); handleGenerate(t.value); }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-200 hover:text-white">×</button>
          </div>
        )}

        {/* Content */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReportForm
                reportTypes={REPORT_TYPES}
                onGenerate={handleGenerate}
                loading={loading}
              />
            </div>
            <div>
              {jobStatus && <JobProgress status={jobStatus} />}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <ReportHistory
            reports={reports}
            loading={loading}
            total={total}
            page={page}
            onPageChange={loadReports}
            onSelect={handleSelectReport}
            onDelete={handleDelete}
            onExport={handleExport}
          />
        )}

        {activeTab === 'preview' && selectedReport && (
          <ReportPreview
            report={selectedReport}
            onExport={handleExport}
            onBack={() => { setSelectedReport(null); setActiveTab('history'); }}
          />
        )}
      </div>
    </div>
  );
}
