'use client';

import React, { useState } from 'react';

interface ReportFormProps {
  reportTypes: { value: string; label: string }[];
  onGenerate: (type: string, baziData?: any) => void;
  loading: boolean;
}

export default function ReportForm({ reportTypes, onGenerate, loading }: ReportFormProps) {
  const [selectedType, setSelectedType] = useState('bazi');
  const [userQuery, setUserQuery] = useState('');
  const [baziData, setBaziData] = useState('');
  const [useSessionData, setUseSessionData] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = useSessionData
      ? undefined
      : (baziData ? JSON.parse(baziData) : undefined);
    onGenerate(selectedType, data);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-lg font-semibold mb-4">生成新报告</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 报告类型 */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">报告类型</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {reportTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedType(t.value)}
                className={`px-3 py-2 rounded text-sm border transition-colors ${
                  selectedType === t.value
                    ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 使用当前排盘数据 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useSession"
            checked={useSessionData}
            onChange={(e) => setUseSessionData(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          <label htmlFor="useSession" className="text-sm text-gray-300">
            使用当前排盘数据
          </label>
        </div>

        {/* 用户问题 */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">关注问题（可选）</label>
          <textarea
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="例如：想知道近期事业运势..."
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 提交 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
        >
          {loading ? '提交中...' : '生成报告'}
        </button>
      </form>
    </div>
  );
}
