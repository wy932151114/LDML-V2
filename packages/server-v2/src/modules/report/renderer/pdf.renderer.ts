// ============================================================
// DZS-OS V2 — PDF 渲染器（基于 HTML 转换）
// ============================================================

import { ExportFormat } from '../../../database/mongoose/schemas/report.schema';
import { HTMLReportRenderer } from './html.renderer';
import { IReportRenderer } from './renderer.interface';
import { RenderContext, RenderResult, RenderOptions, RendererMeta } from './types';

/**
 * PDFReportRenderer — 将报告渲染为 PDF 格式
 *
 * 基于 HTML 渲染结果 + puppeteer 无头浏览器转换为 PDF。
 * 使用动态 import() 加载 puppeteer-core（ESM 包，不支持 require）。
 */
export class PDFReportRenderer implements IReportRenderer {
  readonly meta: RendererMeta = {
    format: ExportFormat.PDF,
    name: 'PDF 渲染器',
    description: '基于 HTML 渲染 + Puppeteer 无头浏览器生成 PDF',
    version: '1.0.0',
  };

  readonly format = ExportFormat.PDF;

  /** 内部 HTML 渲染委托 */
  private htmlRenderer: HTMLReportRenderer;

  constructor() {
    this.htmlRenderer = new HTMLReportRenderer();
  }

  async render(context: RenderContext, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();

    // 先生成HTML内容
    const htmlContent = (await this.htmlRenderer.render(context, options)).content;

    // 使用 puppeteer 生成 PDF（eval 绕过 TS 对 import() 的 commonjs 编译）
    const puppeteer: any = await eval('import("puppeteer-core")');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/google-chrome-stable',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle2' as any });

      const pdfOpts = options?.pdfOptions ?? {};
      const pdfBuffer = await page.pdf({
        format: pdfOpts.pageSize ?? 'A4',
        margin: pdfOpts.margin ?? { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        landscape: pdfOpts.landscape ?? false,
        printBackground: pdfOpts.printBackground ?? true,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size:9px;color:#999;padding:10px;width:100%;text-align:center;"><span class="title"></span></div>',
        footerTemplate: '<div style="font-size:9px;color:#999;padding:10px;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      });

      const pdfContent = Buffer.from(pdfBuffer).toString('base64');

      return {
        content: pdfContent,
        format: ExportFormat.PDF,
        size: pdfBuffer.length,
        duration: Date.now() - startTime,
        mimeType: this.getMimeType(),
      };
    } finally {
      await browser.close();
    }
  }

  async toBuffer(content: string): Promise<Buffer> {
    return Buffer.from(content, 'base64');
  }

  getMimeType(): string {
    return 'application/pdf';
  }

  getFileExtension(): string {
    return '.pdf';
  }
}
