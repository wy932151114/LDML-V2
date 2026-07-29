// ============================================================
// DZS-OS 统一协议层 — AI 生成 DTO
// ============================================================

/** AI生成输入 */
export interface AiInputDTO {
  type: 'daily' | 'bazi' | 'fengshui' | 'ritual';
  prompt: string;
  systemPrompt: string;
  baziData?: any;
  energyData?: any;
}

/** Token用量 */
export interface TokenUsageDTO {
  prompt: number;
  completion: number;
  total: number;
}

/** 验证报告 */
export interface ValidationReportDTO {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/** 风险检测 */
export interface RiskCheckDTO {
  passed: boolean;
  warnings: string[];
}

/** AI生成结果 */
export interface AiResultDTO {
  output: string;
  validation: ValidationReportDTO;
  tokenUsage: TokenUsageDTO;
  riskCheck: RiskCheckDTO;
}

/** AI生成 API 响应 */
export interface AiResponseDTO {
  success: true;
  data: AiResultDTO;
}
