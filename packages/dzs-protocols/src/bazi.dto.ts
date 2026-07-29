// ============================================================
// DZS-OS 统一协议层 — 八字 DTO
// ============================================================

/** 八字排盘输入 */
export interface BaziInputDTO {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  longitude?: number;
  birthPlace?: string;
  useTrueSolar?: boolean;
}

/** 单一柱 */
export interface BaziPillarDTO {
  heavenlyStem: string;
  earthlyBranch: string;
  full: string;
  nayin: string;
  hiddenStems: string[];
  kongWang: string[];
  tenGod?: string;
}

/** 五行分数 */
export interface ElementBalanceDTO {
  scores: Record<string, number>;
  percentage: Record<string, number>;
  totalScore: number;
}

/** 身强/用神 */
export interface StrengthDTO {
  dayMasterElement: string;
  deLing: boolean;
  deDi: boolean;
  rootBranches: string[];
  deShi: boolean;
  supportPower: number;
  opposePower: number;
  strengthScore: number;
  bodyStrength: string;
  description: string;
}

export interface UsefulGodDTO {
  yongShen: string[];
  xiShen: string[];
  jiShen: string[];
  balanceState: string;
  missing: string[];
  excess: string[];
}

/** 真太阳时修正 */
export interface TrueSolarTimeDTO {
  hour: number;
  minute: number;
  shichen: string;
  crossed: boolean;
  offsetMinutes: number;
}

/** 八字排盘结果（rules-engine计算，无AI） */
export interface BaziResultDTO {
  pillars: {
    year: BaziPillarDTO;
    month: BaziPillarDTO;
    day: BaziPillarDTO;
    hour: BaziPillarDTO;
  };
  dayMaster: string;
  dayMasterElement: string;
  gender: string;
  elementBalance: ElementBalanceDTO;
  strength: StrengthDTO;
  usefulGod: UsefulGodDTO;
  trueSolarTime?: TrueSolarTimeDTO;
  calculatedAt: string;
}

/** 八字排盘 API 响应 */
export interface BaziResponseDTO {
  success: true;
  data: BaziResultDTO;
}
