export interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  duration?: number;
  status: 'success' | 'failure';
  createdAt: Date;
}
