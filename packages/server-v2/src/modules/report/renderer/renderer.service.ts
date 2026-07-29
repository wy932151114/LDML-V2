// ============================================================
// DZS-OS V2 — 渲染调度服务
// ============================================================

import { Injectable } from '@nestjs/common';
import { ExportFormat } from '../../../database/mongoose/schemas/report.schema';
import { IReportRenderer } from './renderer.interface';
import { HTMLReportRenderer } from './html.renderer';
import { MarkdownReportRenderer } from './markdown.renderer';
import { PDFReportRenderer } from './pdf.renderer';
import { RenderContext, RenderResult, RenderOptions } from './types';

/**
 * RendererService — 渲染器注册与调度中心
 *
 * 根据 ExportFormat 自动选择对应的渲染器，统一暴露渲染入口。
 * 支持注册自定义渲染器。
 */
@Injectable()
export class RendererService {
  /** 渲染器注册表 */
  private renderers: Map<ExportFormat, IReportRenderer> = new Map();

  constructor() {
    // 注册内置渲染器
    this.register(new HTMLReportRenderer());
    this.register(new MarkdownReportRenderer());
    this.register(new PDFReportRenderer());
  }

  /**
   * 注册渲染器
   */
  register(renderer: IReportRenderer): void {
    this.renderers.set(renderer.format, renderer);
  }

  /**
   * 根据格式获取渲染器
   */
  getRenderer(format: ExportFormat): IReportRenderer | undefined {
    return this.renderers.get(format);
  }

  /**
   * 列出所有已注册的渲染器
   */
  listRenderers(): { format: ExportFormat; name: string; description: string; version: string }[] {
    return Array.from(this.renderers.values()).map((r) => ({
      format: r.format,
      name: r.meta.name,
      description: r.meta.description,
      version: r.meta.version,
    }));
  }

  /**
   * 渲染报告
   * @param format 目标导出格式
   * @param context 渲染上下文
   * @param options 渲染选项
   * @throws 若指定格式的渲染器未注册则抛错
   */
  async render(format: ExportFormat, context: RenderContext, options?: RenderOptions): Promise<RenderResult> {
    const renderer = this.renderers.get(format);
    if (!renderer) {
      throw new Error(`未注册渲染器：${format}。可用格式：${Array.from(this.renderers.keys()).join(', ')}`);
    }
    return renderer.render(context, options);
  }

  /**
   * 批量渲染 — 同一上下文输出多种格式
   */
  async renderMultiple(
    formats: ExportFormat[],
    context: RenderContext,
    options?: RenderOptions,
  ): Promise<Map<ExportFormat, RenderResult>> {
    const results = new Map<ExportFormat, RenderResult>();
    const entries = await Promise.allSettled(
      formats.map(async (fmt) => {
        const result = await this.render(fmt, context, options);
        return { format: fmt, result };
      }),
    );

    for (const entry of entries) {
      if (entry.status === 'fulfilled') {
        results.set(entry.value.format, entry.value.result);
      }
      // 失败项跳过，调用方可检查 Map 是否有对应键
    }

    return results;
  }

  /**
   * 检查某格式是否支持
   */
  supports(format: ExportFormat): boolean {
    return this.renderers.has(format);
  }
}
