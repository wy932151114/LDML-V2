// ============================================================
// DZS-OS V2 — Workflow Engine HTTP API
// 工作流引擎控制器
// ============================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';

import { WorkflowService } from './services/workflow.service';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/utils/user.interface';

import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
  StopWorkflowDto,
  QueryWorkflowDto,
  QueryExecutionDto,
  ValidateWorkflowDto,
  CreateTemplateDto,
  ImportExportDto,
  WorkflowResponseDto,
  WorkflowStatsResponseDto,
  WorkflowExecutionResponseDto,
  WorkflowTemplateResponseDto,
  ValidateResultDto,
} from './interface/workflow.dto';

import type {
  WorkflowData,
  WorkflowExecutionData,
  WorkflowTemplateData,
  WorkflowStats,
  ImportExportData,
} from './interface/workflow.interface';

@ApiTags('Workflow Engine')
@ApiBearerAuth('JWT-auth')
@Controller('v2/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /* =================================================================
   * 工作流 CRUD
   * ================================================================= */

  @Post()
  @ApiOperation({ summary: 'Create workflow', description: '创建新工作流，可包含节点和边定义' })
  @ApiResponse({ status: 201, description: '工作流创建成功', type: WorkflowResponseDto })
  @ApiBody({ type: CreateWorkflowDto })
  async create(
    @Body() dto: CreateWorkflowDto,
    @CurrentUser('id') userId?: string,
  ): Promise<WorkflowData> {
    return this.workflowService.create({
      workflowId: '',
      name: dto.name,
      description: dto.description,
      nodes: (dto.nodes ?? []) as any,
      edges: (dto.edges ?? []) as any,
      status: dto.status ?? 'draft',
      tags: dto.tags ?? [],
      category: dto.category,
      createdBy: dto.createdBy ?? userId ?? 'system',
      updatedBy: userId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List workflows', description: '分页查询工作流列表，支持状态、关键词、分类筛选' })
  @ApiResponse({ status: 200, description: '返回工作流分页列表' })
  async list(@Query() query: QueryWorkflowDto) {
    return this.workflowService.list({
      status: query.status,
      keyword: query.keyword,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get workflow statistics', description: '获取工作流全局统计数据' })
  @ApiResponse({ status: 200, description: '统计数据', type: WorkflowStatsResponseDto })
  async getStats(): Promise<WorkflowStats> {
    return this.workflowService.getStats();
  }

  @Get(':workflowId')
  @ApiOperation({ summary: 'Get workflow detail', description: '获取单个工作流详细信息' })
  @ApiParam({ name: 'workflowId', description: '工作流 ID' })
  @ApiResponse({ status: 200, description: '工作流详情', type: WorkflowResponseDto })
  @ApiResponse({ status: 404, description: '工作流不存在' })
  async get(@Param('workflowId') workflowId: string): Promise<WorkflowData> {
    const workflow = await this.workflowService.get(workflowId);
    if (!workflow) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }
    return workflow;
  }

  @Put(':workflowId')
  @ApiOperation({ summary: 'Update workflow', description: '更新工作流名称、描述、节点、边、状态等' })
  @ApiParam({ name: 'workflowId', description: '工作流 ID' })
  @ApiResponse({ status: 200, description: '更新成功', type: WorkflowResponseDto })
  @ApiBody({ type: UpdateWorkflowDto })
  async update(
    @Param('workflowId') workflowId: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser('id') userId?: string,
  ): Promise<WorkflowData> {
    return this.workflowService.update(workflowId, {
      ...dto,
      updatedBy: dto.updatedBy ?? userId,
    } as any);
  }

  @Delete(':workflowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow', description: '删除指定工作流' })
  @ApiParam({ name: 'workflowId', description: '工作流 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '工作流不存在' })
  async delete(@Param('workflowId') workflowId: string): Promise<void> {
    await this.workflowService.delete(workflowId);
  }

  /* =================================================================
   * 验证
   * ================================================================= */

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate workflow', description: '校验工作流拓扑及字段完整性。可通过 workflowId 查库校验，或直接传入节点/边校验' })
  @ApiResponse({ status: 200, description: '校验结果', type: ValidateResultDto })
  @ApiBody({ type: ValidateWorkflowDto })
  async validate(
    @Body() dto: ValidateWorkflowDto,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    if (dto.workflowId) {
      return this.workflowService.validate(dto.workflowId);
    }
    if (dto.nodes && dto.edges) {
      return this.workflowService.validateNodes(dto.nodes as any, dto.edges as any);
    }
    const { BadRequestException } = await import('@nestjs/common');
    throw new BadRequestException('Must provide either workflowId or nodes+edges');
  }

  /* =================================================================
   * 执行
   * ================================================================= */

  @Post(':workflowId/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute workflow', description: '执行指定工作流，可传入输入参数' })
  @ApiParam({ name: 'workflowId', description: '工作流 ID' })
  @ApiResponse({ status: 200, description: '执行结果', type: WorkflowExecutionResponseDto })
  @ApiBody({ type: ExecuteWorkflowDto })
  async execute(
    @Param('workflowId') workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
    @CurrentUser('id') userId?: string,
  ): Promise<WorkflowExecutionData> {
    return this.workflowService.execute(workflowId, dto.input);
  }

  @Post(':workflowId/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop workflow execution', description: '停止正在执行的工作流' })
  @ApiParam({ name: 'workflowId', description: '工作流 ID' })
  @ApiResponse({ status: 200, description: '已发送停止指令' })
  @ApiBody({ type: StopWorkflowDto })
  async stop(
    @Param('workflowId') _workflowId: string,
    @Body() dto: StopWorkflowDto,
  ): Promise<void> {
    await this.workflowService.stopExecution(dto.executionId);
  }

  @Get(':workflowId/executions')
  @ApiOperation({ summary: 'Get execution history', description: '获取指定工作流的执行记录列表' })
  @ApiParam({ name: 'workflowId', description: '工作流 ID' })
  @ApiResponse({ status: 200, description: '执行记录分页列表' })
  async getExecutions(
    @Param('workflowId') workflowId: string,
    @Query() query: QueryExecutionDto,
  ) {
    return this.workflowService.getExecutions({
      workflowId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get execution detail', description: '获取单条执行记录详情' })
  @ApiParam({ name: 'executionId', description: '执行记录 ID' })
  @ApiResponse({ status: 200, description: '执行记录详情', type: WorkflowExecutionResponseDto })
  @ApiResponse({ status: 404, description: '执行记录不存在' })
  async getExecution(
    @Param('executionId') executionId: string,
  ): Promise<WorkflowExecutionData> {
    return this.workflowService.getExecutionDetail(executionId);
  }

  /* =================================================================
   * 导入 / 导出
   * ================================================================= */

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export workflow', description: '导出工作流为 JSON 格式' })
  @ApiResponse({ status: 200, description: '导出数据' })
  async exportWorkflow(
    @Body('workflowId') workflowId: string,
  ): Promise<ImportExportData> {
    return this.workflowService.export(workflowId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import workflow', description: '从 JSON 数据导入工作流' })
  @ApiResponse({ status: 201, description: '导入成功', type: WorkflowResponseDto })
  @ApiBody({ type: ImportExportDto })
  async importWorkflow(
    @Body() dto: ImportExportDto,
  ): Promise<WorkflowData> {
    return this.workflowService.import({
      version: dto.version,
      type: dto.type,
      data: dto.data,
      exportedAt: new Date(),
      exportedBy: 'system',
    });
  }

  /* =================================================================
   * 模板管理
   * ================================================================= */

  @Get('templates')
  @ApiOperation({ summary: 'Get workflow templates', description: '获取工作流模板列表' })
  @ApiResponse({ status: 200, description: '模板分页列表' })
  @ApiQuery({ name: 'category', required: false, description: '按分类筛选' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词搜索' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页条数' })
  async getTemplates(
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.workflowService.getTemplates({
      category,
      keyword,
      page: page ?? 1,
      limit: limit ?? 20,
    });
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create workflow template', description: '创建工作流模板。可从现有工作流创建（传入 sourceWorkflowId），也可直接传入节点/边定义' })
  @ApiResponse({ status: 201, description: '模板创建成功', type: WorkflowTemplateResponseDto })
  @ApiBody({ type: CreateTemplateDto })
  @Roles(UserRole.ADMIN)
  async createTemplate(
    @Body() dto: CreateTemplateDto,
  ): Promise<WorkflowTemplateData> {
    if (dto.sourceWorkflowId) {
      return this.workflowService.createFromWorkflow(dto.sourceWorkflowId, {
        name: dto.name,
        description: dto.description,
        category: dto.category,
      });
    }
    return this.workflowService.createTemplate('', {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      tags: dto.tags ?? [],
      variables: dto.variables ?? [],
      createdBy: 'system',
    });
  }

  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow template', description: '删除指定工作流模板' })
  @ApiParam({ name: 'templateId', description: '模板 ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @Roles(UserRole.ADMIN)
  async deleteTemplate(
    @Param('templateId') templateId: string,
  ): Promise<void> {
    await this.workflowService.deleteTemplate(templateId);
  }

  @Post(':workflowId/apply-template/:templateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply template to workflow', description: '将模板的节点和边应用到已有工作流' })
  @ApiParam({ name: 'workflowId', description: '工作流 ID' })
  @ApiParam({ name: 'templateId', description: '模板 ID' })
  @ApiResponse({ status: 200, description: '应用成功', type: WorkflowResponseDto })
  @ApiResponse({ status: 404, description: '工作流或模板不存在' })
  async applyTemplate(
    @Param('workflowId') workflowId: string,
    @Param('templateId') templateId: string,
  ): Promise<WorkflowData> {
    return this.workflowService.applyTemplate(workflowId, templateId);
  }
}
