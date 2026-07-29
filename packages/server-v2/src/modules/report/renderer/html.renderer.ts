// ============================================================
// DZS-OS V2 — HTML 渲染器
// ============================================================

import { ExportFormat, ReportSection } from '../../../database/mongoose/schemas/report.schema';
import { IReportRenderer } from './renderer.interface';
import { RenderContext, RenderResult, RenderOptions, RendererMeta } from './types';

/** 默认品牌配置 */
const DEFAULT_BRAND = {
  appName: '道之自然',
  appNameEn: 'DaoZhiNatural',
  primaryColor: '#1a73e8',
  secondaryColor: '#34a853',
  footerText: '道之自然 · 顺应天道，自然而生',
};

/**
 * HTMLReportRenderer — 将报告渲染为 HTML 格式
 */
export class HTMLReportRenderer implements IReportRenderer {
  readonly meta: RendererMeta = {
    format: ExportFormat.HTML,
    name: 'HTML 渲染器',
    description: '将报告渲染为标准 HTML 文档，支持目录、语法高亮与自定义样式',
    version: '1.0.0',
  };

  readonly format = ExportFormat.HTML;

  /**
   * 渲染完整 HTML 文档
   */
  async render(context: RenderContext, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const html = this.buildDocument(context, options);
    const content = options?.minify ? this.minify(html) : html;

    return {
      content,
      format: ExportFormat.HTML,
      size: Buffer.byteLength(content, 'utf-8'),
      duration: Date.now() - startTime,
      mimeType: this.getMimeType(),
    };
  }

  /**
   * 构建完整 HTML 文档
   */
  private buildDocument(context: RenderContext, options?: RenderOptions): string {
    const brand = { ...DEFAULT_BRAND, ...context.branding };
    const toc = options?.tableOfContents ? this.buildToc(context.sections) : '';
    const sectionsHtml = context.sections
      .sort((a, b) => a.order - b.order)
      .map((s) => this.renderSection(s))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(context.title)} — ${brand.appName}</title>
  <style>
${this.getBaseStyles(brand)}
${context.customStyles || ''}
  </style>
</head>
<body>
  <div class="report-container">
    <header class="report-header">
      <div class="brand">
        <h1 class="app-name">${brand.appName}</h1>
        <span class="app-name-en">${brand.appNameEn}</span>
      </div>
      <h2 class="report-title">${this.escapeHtml(context.title)}</h2>
      <div class="report-meta">
        <span class="meta-item">类型：${context.reportType}</span>
        ${context.userName ? `<span class="meta-item">用户：${this.escapeHtml(context.userName)}</span>` : ''}
        <span class="meta-item">生成时间：${(context.generatedAt ?? new Date()).toLocaleString('zh-CN')}</span>
        ${context.aiModelVersion ? `<span class="meta-item">模型：${this.escapeHtml(context.aiModelVersion)}</span>` : ''}
      </div>
    </header>

    ${toc ? `<nav class="report-toc"><h3>目录</h3>${toc}</nav>` : ''}

    <main class="report-body">
${sectionsHtml}
    </main>

    <footer class="report-footer">
      <p class="footer-tagline">${brand.footerText}</p>
      ${context.tokenUsage ? `<p class="footer-tokens">Token 消耗：${context.tokenUsage.totalTokens}（提示词 ${context.tokenUsage.promptTokens} / 生成 ${context.tokenUsage.completionTokens}）</p>` : ''}
      <p class="footer-copyright">© ${new Date().getFullYear()} ${brand.appName} · 由 AI 生成，仅供参考</p>
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * 渲染单个章节
   */
  private renderSection(section: ReportSection): string {
    const typeClass = section.type ? `section-${section.type}` : 'section-text';

    switch (section.type) {
      case 'table':
        return `<section class="report-section ${typeClass}">
  <h3 class="section-title">${this.escapeHtml(section.title)}</h3>
  <div class="section-content">${this.renderTable(section.content)}</div>
</section>`;

      case 'chart':
        return `<section class="report-section ${typeClass}">
  <h3 class="section-title">${this.escapeHtml(section.title)}</h3>
  <div class="section-content chart-placeholder">${this.escapeHtml(section.content)}</div>
</section>`;

      case 'warning':
        return `<section class="report-section ${typeClass}">
  <div class="warning-icon">⚠️</div>
  <div class="section-content">${this.escapeHtml(section.content)}</div>
</section>`;

      case 'tip':
        return `<section class="report-section ${typeClass}">
  <div class="tip-icon">💡</div>
  <div class="section-content">${this.escapeHtml(section.content)}</div>
</section>`;

      default:
        return `<section class="report-section ${typeClass}">
  <h3 class="section-title">${this.escapeHtml(section.title)}</h3>
  <div class="section-content">${this.renderMarkdownLike(section.content)}</div>
</section>`;
    }
  }

  /**
   * 将简单 Markdown 风格内容转换为 HTML
   */
  private renderMarkdownLike(content: string): string {
    return content
      .split('\n')
      .map((line) => {
        if (line.startsWith('### ')) return `<h4>${this.escapeHtml(line.slice(4))}</h4>`;
        if (line.startsWith('## ')) return `<h3>${this.escapeHtml(line.slice(3))}</h3>`;
        if (line.startsWith('- ')) return `<li>${this.escapeHtml(line.slice(2))}</li>`;
        if (line.startsWith('> ')) return `<blockquote>${this.escapeHtml(line.slice(2))}</blockquote>`;
        if (line.trim() === '') return '<br>';
        return `<p>${this.escapeHtml(line)}</p>`;
      })
      .join('\n');
  }

  /**
   * 将表格风格内容转为 HTML 表格
   */
  private renderTable(content: string): string {
    const rows = content.split('\n').filter((l) => l.trim());
    if (rows.length < 2) return `<pre>${this.escapeHtml(content)}</pre>`;

    const headers = rows[0].split('|').map((h) => h.trim());
    const bodyRows = rows.slice(1).map((r) => r.split('|').map((c) => c.trim()));

    return `<table>
  <thead>
    <tr>${headers.map((h) => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr>
  </thead>
  <tbody>
    ${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${this.escapeHtml(c)}</td>`).join('')}</tr>`).join('\n    ')}
  </tbody>
</table>`;
  }

  /**
   * 生成目录 HTML
   */
  private buildToc(sections: ReportSection[]): string {
    const items = sections
      .sort((a, b) => a.order - b.order)
      .map((s) => `<li><a href="#section-${s.order}">${this.escapeHtml(s.title)}</a></li>`)
      .join('\n');
    return `<ul class="toc-list">${items}</ul>`;
  }

  /**
   * 基础 CSS 样式
   */
  private getBaseStyles(brand: typeof DEFAULT_BRAND): string {
    return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif; background: #f5f5f5; color: #333; line-height: 1.8; }
.report-container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
.report-header { background: linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor}); color: #fff; padding: 40px; border-radius: 12px; margin-bottom: 30px; }
.brand { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; }
.app-name { font-size: 20px; font-weight: 700; }
.app-name-en { font-size: 14px; opacity: 0.8; }
.report-title { font-size: 28px; font-weight: 700; margin-bottom: 16px; }
.report-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; opacity: 0.9; }
.meta-item { background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 20px; }
.report-toc { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.report-toc h3 { font-size: 18px; margin-bottom: 12px; color: ${brand.primaryColor}; }
.toc-list { list-style: none; }
.toc-list li { padding: 6px 0; }
.toc-list a { color: #555; text-decoration: none; transition: color 0.2s; }
.toc-list a:hover { color: ${brand.primaryColor}; }
.report-body { }
.report-section { background: #fff; border-radius: 12px; padding: 24px 28px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.section-title { font-size: 20px; font-weight: 600; color: #222; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid ${brand.primaryColor}; }
.section-content p { margin-bottom: 12px; }
.section-content li { margin-left: 20px; margin-bottom: 6px; }
.section-content h3 { font-size: 18px; margin: 20px 0 10px; color: #444; }
.section-content h4 { font-size: 16px; margin: 16px 0 8px; color: #555; }
.section-content blockquote { border-left: 4px solid ${brand.primaryColor}; padding: 12px 16px; margin: 12px 0; background: #f8f9ff; border-radius: 4px; color: #555; }
.section-content table { width: 100%; border-collapse: collapse; margin: 12px 0; }
.section-content th, .section-content td { border: 1px solid #e0e0e0; padding: 10px 14px; text-align: left; }
.section-content th { background: #f0f4ff; font-weight: 600; color: #333; }
.section-content pre { background: #f8f8f8; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
.section-warning { border-left: 4px solid #f59e0b; background: #fffbeb; }
.section-tip { border-left: 4px solid ${brand.secondaryColor}; background: #f0fdf4; }
.warning-icon, .tip-icon { font-size: 24px; margin-bottom: 8px; }
.chart-placeholder { background: #fafafa; border: 2px dashed #ddd; border-radius: 8px; padding: 40px; text-align: center; color: #999; }
.report-footer { text-align: center; padding: 32px 20px; color: #999; font-size: 13px; }
.footer-tagline { font-size: 15px; color: #777; margin-bottom: 8px; }
.footer-tokens { color: #aaa; margin-bottom: 4px; }
.footer-copyright { }
`;
  }

  /**
   * 简易 HTML 转义
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 简易 HTML 压缩
   */
  private minify(html: string): string {
    return html
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/<!--.*?-->/g, '')
      .trim();
  }

  async toBuffer(content: string): Promise<Buffer> {
    return Buffer.from(content, 'utf-8');
  }

  getMimeType(): string {
    return 'text/html; charset=utf-8';
  }

  getFileExtension(): string {
    return '.html';
  }
}
