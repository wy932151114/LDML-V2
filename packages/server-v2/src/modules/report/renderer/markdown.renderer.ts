// ============================================================
// DZS-OS V2 — Markdown 渲染器
// ============================================================

import { ExportFormat, ReportSection } from '../../../database/mongoose/schemas/report.schema';
import { IReportRenderer } from './renderer.interface';
import { RenderContext, RenderResult, RenderOptions, RendererMeta } from './types';

/**
 * MarkdownReportRenderer — 将报告渲染为 Markdown 格式
 */
export class MarkdownReportRenderer implements IReportRenderer {
  readonly meta: RendererMeta = {
    format: ExportFormat.MARKDOWN,
    name: 'Markdown 渲染器',
    description: '将报告渲染为标准 Markdown 文档，保留结构与可读性',
    version: '1.0.0',
  };

  readonly format = ExportFormat.MARKDOWN;

  async render(context: RenderContext, options?: RenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const content = this.buildDocument(context, options);

    return {
      content,
      format: ExportFormat.MARKDOWN,
      size: Buffer.byteLength(content, 'utf-8'),
      duration: Date.now() - startTime,
      mimeType: this.getMimeType(),
    };
  }

  /**
   * 构建完整 Markdown 文档
   */
  private buildDocument(context: RenderContext, options?: RenderOptions): string {
    const brand = { appName: '道之自然', appNameEn: 'DaoZhiNatural', ...context.branding };
    const lines: string[] = [];

    // 标题区
    lines.push(`# ${context.title}`);
    lines.push('');
    lines.push(`> **${brand.appName}** · ${brand.appNameEn}`);
    lines.push('');
    lines.push(`- **报告类型**：${context.reportType}`);
    if (context.userName) {
      lines.push(`- **用户**：${context.userName}`);
    }
    lines.push(`- **生成时间**：${(context.generatedAt ?? new Date()).toLocaleString('zh-CN')}`);
    if (context.aiModelVersion) {
      lines.push(`- **AI 模型**：${context.aiModelVersion}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // 目录
    if (options?.tableOfContents) {
      lines.push('## 目录');
      lines.push('');
      for (const section of context.sections.sort((a, b) => a.order - b.order)) {
        lines.push(`- [${section.title}](#${this.slugify(section.title)})`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // 章节正文
    for (const section of context.sections.sort((a, b) => a.order - b.order)) {
      lines.push(...this.renderSection(section));
      lines.push('');
    }

    // 页脚
    lines.push('---');
    lines.push('');
    if (context.tokenUsage) {
      lines.push(`> Token 消耗：**${context.tokenUsage.totalTokens}**（提示词 ${context.tokenUsage.promptTokens} / 生成 ${context.tokenUsage.completionTokens}）`);
      lines.push('');
    }
    lines.push(`*${brand.footerText ?? '道之自然 · 顺应天道，自然而生'}*`);
    lines.push('');
    lines.push(`© ${new Date().getFullYear()} ${brand.appName} · 由 AI 生成，仅供参考`);

    return lines.join('\n');
  }

  /**
   * 渲染单个章节为 Markdown
   */
  private renderSection(section: ReportSection): string[] {
    const lines: string[] = [];

    switch (section.type) {
      case 'warning':
        lines.push(`> ⚠️ **${section.title}**`);
        lines.push('>');
        lines.push(...section.content.split('\n').map((l) => `> ${l}`));
        break;

      case 'tip':
        lines.push(`> 💡 **${section.title}**`);
        lines.push('>');
        lines.push(...section.content.split('\n').map((l) => `> ${l}`));
        break;

      case 'table': {
        const rows = section.content.split('\n').filter((l) => l.trim());
        if (rows.length >= 2) {
          const header = rows[0].split('|').map((h) => h.trim());
          lines.push(`### ${section.title}`);
          lines.push('');
          lines.push(`| ${header.join(' | ')} |`);
          lines.push(`| ${header.map(() => '---').join(' | ')} |`);
          for (const row of rows.slice(1)) {
            const cols = row.split('|').map((c) => c.trim());
            lines.push(`| ${cols.join(' | ')} |`);
          }
        }
        break;
      }

      case 'chart':
        lines.push(`### ${section.title}`);
        lines.push('');
        lines.push('```');
        lines.push(section.content);
        lines.push('```');
        break;

      default:
        lines.push(`## ${section.title}`);
        lines.push('');
        lines.push(section.content);
        break;
    }

    return lines;
  }

  /**
   * 生成 slug 用于 Markdown 锚点链接
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async toBuffer(content: string): Promise<Buffer> {
    return Buffer.from(content, 'utf-8');
  }

  getMimeType(): string {
    return 'text/markdown; charset=utf-8';
  }

  getFileExtension(): string {
    return '.md';
  }
}
