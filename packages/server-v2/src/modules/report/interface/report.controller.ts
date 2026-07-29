// ============================================================
// DZS-OS V2 — Report Controller
// ============================================================

import {
  Controller, Post, Get, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
  UseGuards, Header, Res, Logger, StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from '../domain/report.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateReportDto,
  QueryReportDto,
  ExportReportDto,
  BatchDeleteReportDto,
} from './report.dto';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('v2/report')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(private readonly report: ReportService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '生成报告',
    description: '提交报告生成任务，返回 jobId，报告通过 BullMQ 异步生成',
  })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({ status: 202, description: '任务已提交，返回 jobId 和任务状态' })
  async generateReport(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.report.create(userId, dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取报告详情', description: '根据报告 ID 获取完整报告内容' })
  @ApiParam({ name: 'id', description: '报告 ID' })
  @ApiResponse({ status: 200, description: '报告详情' })
  @ApiResponse({ status: 404, description: '报告不存在' })
  async getReport(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.report.findById(id, userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取报告列表', description: '获取用户的历史报告列表，支持分页和类型筛选' })
  @ApiQuery({ name: 'type', required: false, description: '报告类型筛选' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页条数', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选' })
  @ApiResponse({ status: 200, description: '报告列表（分页）' })
  async listReports(
    @CurrentUser('id') userId: string,
    @Query() query: QueryReportDto,
  ) {
    return this.report.findUserReports(userId, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除报告', description: '软删除指定报告' })
  @ApiParam({ name: 'id', description: '报告 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteReport(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.report.softDelete(id, userId);
    return { success: true };
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量删除报告', description: '批量软删除多个报告' })
  @ApiBody({ type: BatchDeleteReportDto })
  @ApiResponse({ status: 200, description: '批量删除成功' })
  async batchDeleteReports(
    @CurrentUser('id') userId: string,
    @Body() dto: BatchDeleteReportDto,
  ) {
    const count = await this.report.batchSoftDelete(userId, dto.ids);
    return { success: true, deleted: count };
  }

  @Post('export/html')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: '导出 HTML', description: '将报告导出为 HTML 格式' })
  @ApiBody({ type: ExportReportDto })
  async exportHtml(
    @CurrentUser('id') userId: string,
    @Body() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    const html = await this.report.exportReport(userId, dto.reportId, 'html');
    res.setHeader('Content-Disposition', `attachment; filename="report-${dto.reportId}.html"`);
    res.send(html);
  }

  @Post('export/pdf')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: '导出 PDF', description: '将报告导出为 PDF 格式' })
  @ApiBody({ type: ExportReportDto })
  async exportPdf(
    @CurrentUser('id') userId: string,
    @Body() dto: ExportReportDto,
  ): Promise<StreamableFile> {
    const pdfBase64 = await this.report.exportReport(userId, dto.reportId, 'pdf');
    if (!pdfBase64 || pdfBase64.length < 10) {
      throw new NotFoundException(`PDF base64 too short: len=${pdfBase64?.length}`);
    }
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="report-${dto.reportId}.pdf"`,
      length: pdfBuffer.length,
    });
  }

  /** 诊断：返回PDF的详情（非二进制） */
  @Post('export/pdf-debug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PDF诊断' })
  async exportPdfDebug(
    @CurrentUser('id') userId: string,
    @Body() dto: ExportReportDto,
  ) {
    const pdfBase64 = await this.report.exportReport(userId, dto.reportId, 'pdf');
    return {
      base64Len: pdfBase64?.length || 0,
      base64First50: pdfBase64?.substring(0, 50),
      base64Last20: pdfBase64?.substring(pdfBase64.length - 20),
      decodedLen: pdfBase64 ? Buffer.from(pdfBase64, 'base64').length : 0,
      startsWithPdf: pdfBase64?.startsWith('JVBERi0'),
    };
  }

  @Post('export/markdown')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @ApiOperation({ summary: '导出 Markdown', description: '将报告导出为 Markdown 格式' })
  @ApiBody({ type: ExportReportDto })
  async exportMarkdown(
    @CurrentUser('id') userId: string,
    @Body() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    const md = await this.report.exportReport(userId, dto.reportId, 'markdown');
    res.setHeader('Content-Disposition', `attachment; filename="report-${dto.reportId}.md"`);
    res.send(md);
  }

  @Get('job/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取任务进度', description: '获取异步生成任务的当前进度' })
  @ApiParam({ name: 'jobId', description: 'BullMQ 任务 ID' })
  @ApiResponse({ status: 200, description: '任务进度信息' })
  async getJobProgress(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.report.getJobProgress(userId, jobId);
  }
}
