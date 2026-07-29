'use client';

import React from 'react';
import { Report } from './report-api';

interface ReportHistoryProps {
  reports: Report[];
  loading: boolean;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onSelect: (report: Report) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, format: 'html' | 'pdf' | 'markdown') => void;
}

const TYPE_LABELS: Record<string, string> = {
  bazi: '八字分析', wuxing: '五行分析', dayun: '大运流年',
  jiugong: '九宫飞星', fengshui: '风水扫描', ai_comprehensive: 'AI综合命理',
  enterprise: '企业风水', daily: '每日运势', weekly: '周运',
  monthly: '月运', yearly: '年运',
};

const STATUS_BADGES: Record<string, string> = {
  completed: 'bg-green-600', failed: 'bg-red-600',
  processing: 'bg-blue-600', pending: 'bg-yellow-600', cancelled: 'bg-gray-600',
};

export default function ReportHistory({
  reports, loading, total, page, onPageChange, onSelect, onDelete, onExport,
}: ReportHistoryProps) {
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold">历史报告</h2>
        <span className="text-sm text-gray-400">共 {total} 条</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="p-8 text-center text-gray-400">暂无历史报告</div>
      ) : (
        <div className="divide-y divide-gray-700">
          {reports.map((report) => (
            <div key={report.id} className="p-4 hover:bg-gray-750 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => onSelect(report)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {TYPE_LABELS[report.type] || report.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${STATUS_BADGES[report.status] || 'bg-gray-600'}`}>
                      {report.status}
                    </span>
                    {report.tokenUsage && (
                      <span className="text-xs text-gray-500">
                        {report.tokenUsage.totalTokens} tokens
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(report.createdAt).toLocaleString('zh-CN')}
                    {report.sections?.length > 0 && ` · ${report.sections.length} 章节`}
                  </p>
                </div>

                {/* 操作按钮 */}
                {report.status === 'completed' && (
                  <div className="flex gap-1 ml-4">
                    <button onClick={() => onExport(report.id, 'html')} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">HTML</button>
                    <button onClick={() => onExport(report.id, 'pdf')} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">PDF</button>
                    <button onClick={() => onExport(report.id, 'markdown')} className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs">MD</button>
                    <button onClick={() => onDelete(report.id)} className="px-2 py-1 bg-gray-600 hover:bg-red-600 rounded text-xs">删除</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 p-4 border-t border-gray-700">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
          >
            上一页
          </button>
          <span className="px-3 py-1 text-sm text-gray-400">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
