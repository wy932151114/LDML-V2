'use client';

import React from 'react';
import { Report } from './report-api';

interface ReportPreviewProps {
  report: Report;
  onExport: (id: string, format: 'html' | 'pdf' | 'markdown') => void;
  onBack: () => void;
}

export default function ReportPreview({ report, onExport, onBack }: ReportPreviewProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← 返回
          </button>
          <div>
            <h2 className="text-lg font-semibold">报告预览</h2>
            <p className="text-xs text-gray-400">
              {new Date(report.createdAt).toLocaleString('zh-CN')}
              {report.tokenUsage && ` · ${report.tokenUsage.totalTokens} tokens`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onExport(report.id, 'html')} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">HTML</button>
          <button onClick={() => onExport(report.id, 'pdf')} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">PDF</button>
          <button onClick={() => onExport(report.id, 'markdown')} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">MD</button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {report.status !== 'completed' ? (
          <div className="text-center py-12 text-gray-400">
            <p>报告尚未完成</p>
            <p className="text-sm mt-2">状态: {report.status}</p>
          </div>
        ) : report.sections && report.sections.length > 0 ? (
          <div className="space-y-6">
            {report.sections
              .sort((a, b) => a.order - b.order)
              .map((section, idx) => (
                <div key={idx} className="border-b border-gray-700 pb-4 last:border-0">
                  <h3 className="text-lg font-semibold text-blue-300 mb-3">
                    {section.title}
                  </h3>
                  <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                  {section.type === 'warning' && (
                    <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-yellow-300 text-xs">
                      ⚠ 注意事项
                    </div>
                  )}
                  {section.type === 'tip' && (
                    <div className="mt-2 p-2 bg-blue-900/30 border border-blue-700 rounded text-blue-300 text-xs">
                      💡 建议
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>报告内容为空</p>
          </div>
        )}
      </div>
    </div>
  );
}
