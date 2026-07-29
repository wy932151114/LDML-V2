// ============================================================
// DZS-OS 统一协议层 — 验证状态 DTO
// ============================================================

/** 验证状态结果 */
export interface ValidationStatusDTO {
  passed: boolean;
  errors: number;
  warnings: number;
  lastCheck: string;
}

/** 验证状态 API 响应 */
export interface ValidationStatusResponseDTO {
  success: true;
  data: ValidationStatusDTO;
}
