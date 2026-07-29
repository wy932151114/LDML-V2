'use client';

import React, { useEffect, useState } from 'react';

interface JobProgressProps {
  status: {
    jobId: string;
    status: string;
    progressPercent: number;
    progressMessage?: string;
  };
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  waiting: { color: 'yellow', label: '排队中' },
  active: { color: 'blue', label: '生成中' },
  completed: { color: 'green', label: '已完成' },
  failed: { color: 'red', label: '生成失败' },
  delayed: { color: 'yellow', label: '延迟中' },
  cancelled: { color: 'gray', label: '已取消' },
};

export default function JobProgress({ status }: JobProgressProps) {
  const info = STATUS_MAP[status.status] || { color: 'gray', label: status.status };
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const start = Date.now();
    const interval = setInterval(() => {
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(interval);
        return;
      }
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status.jobId, status.status]);

  const isComplete = status.status === 'completed';
  const isFailed = status.status === 'failed';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold mb-3">任务进度</h3>

      {/* 状态指示 */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full bg-${info.color}-500`} />
        <span className="text-sm text-gray-200">{info.label}</span>
        <span className="text-xs text-gray-500 ml-auto">{elapsed}s</span>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            isComplete ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(status.progressPercent, 100)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>{status.progressPercent}%</span>
        <span>{status.jobId.slice(0, 8)}...</span>
      </div>

      {status.progressMessage && (
        <p className="mt-2 text-xs text-gray-400">{status.progressMessage}</p>
      )}

      {isComplete && (
        <p className="mt-2 text-xs text-green-400">报告生成完成！请在历史报告查看。</p>
      )}

      {isFailed && (
        <p className="mt-2 text-xs text-red-400">生成失败，请重试。</p>
      )}
    </div>
  );
}
