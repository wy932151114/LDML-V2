// ============================================================
// DZS-OS V2 — 渲染层类型定义
// ============================================================

import { ExportFormat, ReportSection } from '../../../database/mongoose/schemas/report.schema';

/** 渲染上下文 — 报告渲染的完整输入 */
export interface RenderContext {
  /** 报告标题 */
  title: string;
  /** 报告章节列表 */
  sections: ReportSection[];
  /** 报告类型 */
  reportType: string;
  /** 用户名（可选） */
  userName?: string;
  /** 生成时间 */
  generatedAt?: Date;
  /** 自定义 CSS / 样式覆盖 */
  customStyles?: string;
  /** 品牌配置 */
  branding?: BrandConfig;
  /** AI 模型版本 */
  aiModelVersion?: string;
  /** Token 消耗 */
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/** 品牌配置 */
export interface BrandConfig {
  appName: string;
  appNameEn: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
}

/** 渲染结果 */
export interface RenderResult {
  /** 渲染后的内容 */
  content: string;
  /** 输出格式 */
  format: ExportFormat;
  /** 文件大小（字节） */
  size: number;
  /** 生成耗时（毫秒） */
  duration: number;
  /** MIME 类型 */
  mimeType: string;
}

/** 渲染选项 — 控制渲染行为 */
export interface RenderOptions {
  /** 是否启用语法高亮 */
  highlight?: boolean;
  /** 是否包含目录 */
  tableOfContents?: boolean;
  /** 是否压缩空白 */
  minify?: boolean;
  /** PDF 特有选项 */
  pdfOptions?: {
    pageSize?: 'A4' | 'Letter' | 'A3';
    margin?: { top: number; right: number; bottom: number; left: number };
    landscape?: boolean;
    printBackground?: boolean;
  };
}

/** 渲染器注册元数据 */
export interface RendererMeta {
  format: ExportFormat;
  name: string;
  description: string;
  version: string;
}
