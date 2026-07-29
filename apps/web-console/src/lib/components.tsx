// ============================================================
// DZS Web Console — 共享UI组件
// LoadingSkeleton / ErrorFallback / EmptyState
// ============================================================

import { cn } from './utils';
import { AlertTriangle, RefreshCw, Upload } from 'lucide-react';

// ============================================================
// Loading Skeleton
// ============================================================
export function LoadingSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-12 h-4 rounded bg-[#1e293b]" />
          <div className="flex-1 h-4 rounded bg-[#1e293b]" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('dzg-card p-6 animate-pulse', className)}>
      <div className="w-32 h-5 rounded bg-[#1e293b] mb-4" />
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-[#1e293b]" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-[#1e293b]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Error Fallback
// ============================================================
export function ErrorFallback({
  message = '请求失败',
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('dzg-card p-6 flex flex-col items-center justify-center min-h-[200px]', className)}>
      <AlertTriangle size={40} className="text-[#E74C3C] mb-3 opacity-60" />
      <p className="text-sm text-[#94a3b8] mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm hover:bg-[rgba(245,158,11,0.2)] transition-all"
        >
          <RefreshCw size={14} />
          重试
        </button>
      )}
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('dzg-card p-6 flex flex-col items-center justify-center min-h-[200px]', className)}>
      {icon || <Upload size={40} className="text-[#64748b] mb-3 opacity-30" />}
      <p className="text-sm text-[#94a3b8] mb-1">{title}</p>
      {description && <p className="text-xs text-[#64748b] mb-3">{description}</p>}
      {action}
    </div>
  );
}
