// ============================================================
// 道之自然核心协议 — 报告协议 (Report Protocol)
// 
// 所有AI报告的标准输出格式
// 报告是 规则引擎结果 + AI语言组织 的产物
// AI层不得改变其中的数据事实
// ============================================================

import type { BaziProtocol } from './bazi.protocol';
import type { WuXingProtocol } from './wuxing.protocol';
import type { SolarProtocol } from './solar.protocol';
import type { FengShuiProtocol } from './fengshui.protocol';
import type { DailyRitualProtocol } from './ritual.protocol';

/** 报告板块 */
export interface ReportSection {
  /** 板块标题 */
  title: string;
  /** 板块内容（AI生成的文案） */
  content: string;
  /** 数据引用 */
  dataRef: string;
}

/** 完整报告协议 */
export interface ReportProtocol {
  /** 报告ID */
  reportId: string;
  /** 报告类型 */
  type: 'daily' | 'bazi' | 'fengshui' | 'ritual' | 'comprehensive';
  /** 时间戳 */
  timestamp: Date;
  /** 用户摘要 */
  userSummary: string;
  /** 数据来源 */
  dataSources: string[];
  /** 报告板块 */
  sections: ReportSection[];
  /** 五行协议（只读引用） */
  wuxingData: WuXingProtocol;
  /** 八字协议（只读引用） */
  baziData?: BaziProtocol;
  /** 节气协议 */
  solarData?: SolarProtocol;
  /** 风水协议 */
  fengshuiData?: FengShuiProtocol;
  /** 仪式协议 */
  ritualData?: DailyRitualProtocol;
  /** 风险提醒 */
  riskWarnings: string[];
  /** 免责声明 */
  disclaimer: string;
  /** 合规检查 */
  violations: string[];
}

/** 日报协议（经常使用的快捷类型） */
export interface DailyReportProtocol {
  date: Date;
  bazi: BaziProtocol;
  wuxing: WuXingProtocol;
  fengshui: FengShuiProtocol;
  rituals: DailyRitualProtocol;
  summary: string;
  riskWarnings: string[];
}

/** 协议栈版本 */
export const PROTOCOL_VERSION = '2.3';
export const PROTOCOL_SOURCE = '《道之自然·改命纪实录》';
