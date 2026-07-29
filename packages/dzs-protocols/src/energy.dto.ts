// ============================================================
// DZS-OS 统一协议层 — 五行能量 DTO
// ============================================================

/** 五行能量输入 */
export interface EnergyInputDTO {
  baziResult: {
    elementBalance: { scores: Record<string, number> };
  };
  monthBranch: string;
  currentYear?: number;
}

/** 单个五行能量项 */
export interface ElementEnergyDTO {
  base: number;
  seasonalBoost: number;
  finalScore: number;
  finalPercent: number;
}

/** 能量场 */
export interface EnergyFieldDTO {
  wood: ElementEnergyDTO;
  fire: ElementEnergyDTO;
  earth: ElementEnergyDTO;
  metal: ElementEnergyDTO;
  water: ElementEnergyDTO;
}

/** 五行能量分析结果 */
export interface EnergyResultDTO {
  energyField: EnergyFieldDTO;
  totalEnergy: number;
  dominantElement: string;
  balanceState: string;
  stability: number;
}

/** 五行能量 API 响应 */
export interface EnergyResponseDTO {
  success: true;
  data: EnergyResultDTO;
}
