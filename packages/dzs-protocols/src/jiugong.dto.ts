// ============================================================
// DZS-OS 统一协议层 — 九宫飞星 DTO
// ============================================================

/** 九宫飞星输入 */
export interface NinePalaceInputDTO {
  year: number;
  month: number;
  day: number;
}

/** 单个宫位信息 */
export interface PalaceDTO {
  position: number;
  name: string;
  direction: string;
  star: { number: number; name: string; type: string; wuxing: string };
  energy: number;
  rating: string;
  suitable: string[];
  avoid: string[];
}

/** 空间冲突 */
export interface ConflictDTO {
  type: string;
  palaces: string[];
  severity: string;
  description: string;
  remedy?: string;
}

/** 九宫飞星结果 */
export interface NinePalaceResultDTO {
  palaces: PalaceDTO[];
  summary: {
    bestDirection: string;
    worstDirection: string;
    auspiciousStars: string[];
    inauspiciousStars: string[];
  };
  conflicts: ConflictDTO[];
}

/** 九宫飞星 API 响应 */
export interface NinePalaceResponseDTO {
  success: true;
  data: NinePalaceResultDTO;
}
