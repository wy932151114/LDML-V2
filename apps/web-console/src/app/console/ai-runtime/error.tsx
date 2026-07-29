'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-[#e2e8f0] mb-2">页面加载异常</h2>
        <p className="text-sm text-[#64748b] mb-6">
          {error.message || 'AI Runtime 页面出现未处理的错误'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-black font-semibold text-sm hover:brightness-110 transition-all"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
