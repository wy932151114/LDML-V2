export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
  timestamp: string;
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    statusCode: 200,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(error: string, statusCode: number = 400): ApiResponse {
  return {
    success: false,
    error,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}
