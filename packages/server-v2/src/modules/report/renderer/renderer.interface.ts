// ============================================================
// DZS-OS V2 — 渲染器抽象接口
// ============================================================

import { ExportFormat } from '../../../database/mongoose/schemas/report.schema';
import { RenderContext, RenderResult, RenderOptions, RendererMeta } from './types';

/**
 * ReportRenderer — 报告渲染器接口
 * 所有输出格式渲染器需实现此接口
 */
export interface IReportRenderer {
  /** 渲染器元信息 */
  readonly meta: RendererMeta;

  /** 支持的导出格式 */
  readonly format: ExportFormat;

  /**
   * 渲染报告
   * @param context 渲染上下文（标题、章节、类型、样式等）
   * @param options 渲染选项
   * @returns 渲染结果
   */
  render(context: RenderContext, options?: RenderOptions): Promise<RenderResult>;

  /**
   * 将已渲染内容导出为文件流
   * @param content 渲染后的字符串内容
   * @returns Buffer 数据
   */
  toBuffer(content: string): Promise<Buffer>;

  /**
   * 获取内容 MIME 类型
   */
  getMimeType(): string;

  /**
   * 获取文件扩展名（含点号，如 '.html'）
   */
  getFileExtension(): string;
}
