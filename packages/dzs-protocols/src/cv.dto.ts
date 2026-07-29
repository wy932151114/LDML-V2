// ============================================================
// DZS-OS 统一协议层 — CV 空间扫描 DTO
// ============================================================

/** 检测到的元素 */
export interface CVElementDTO {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  wuxing: string;
}

/** 空间映射（位置 → 元素） */
export interface SpatialMapDTO {
  palace: string;
  elements: Array<{ type: string; x: number; y: number }>;
}

/** 空间冲突 */
export interface CVConflictDTO {
  type: string;
  description: string;
  severity: string;
  remedy?: string;
}

/** 布局建议 */
export interface CVAdviceDTO {
  type: string;
  content: string;
}

/** CV扫描结果 */
export interface CVScanResultDTO {
  elements: CVElementDTO[];
  spatialMap: SpatialMapDTO[];
  confidence: number;
  conflicts: CVConflictDTO[];
  advice: CVAdviceDTO[];
}

/** CV扫描 API 响应 */
export interface CVScanResponseDTO {
  success: true;
  data: CVScanResultDTO;
}
