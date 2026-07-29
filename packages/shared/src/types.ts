/** 分页参数 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** 分页响应 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 筛选条件 */
export interface FilterParams {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
