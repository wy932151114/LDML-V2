/* =========================================================================
 * PromptCenterController — Prompt Center HTTP API
 *
 * Exposes REST endpoints for prompt CRUD, version management, variable
 * handling, rendering, preview, and execution.
 * ========================================================================= */

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
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@/common/utils/user.interface';

import { PromptCenterService } from './services/prompt-center.service';
import { PromptRegistryService } from './services/prompt-registry.service';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptVariableService } from './services/prompt-variable.service';
import { PromptPlaygroundService } from './prompt-playground.service';

import {
  CreatePromptDto,
  UpdatePromptDto,
  QueryPromptDto,
  ExecutePromptDto,
  CreatePromptVersionDto,
  BatchDeletePromptDto,
} from './interface/prompt.dto';
import type { PromptCategory } from './interface/prompt.interface';

@ApiTags('Prompt Center')
@ApiBearerAuth('JWT-auth')
@Controller('v2/prompts')
export class PromptCenterController {
  constructor(
    private readonly promptCenter: PromptCenterService,
    private readonly registryService: PromptRegistryService,
    private readonly versionService: PromptVersionService,
    private readonly variableService: PromptVariableService,
    private readonly playgroundService: PromptPlaygroundService,
  ) {}

  /* =====================================================================
   *  Prompt CRUD
   * ===================================================================== */

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new prompt' })
  @ApiResponse({ status: 201, description: 'Prompt created' })
  @ApiResponse({ status: 409, description: 'Prompt already exists' })
  async register(@Body() dto: CreatePromptDto) {
    return this.promptCenter.register({
      promptId: dto.promptId,
      name: dto.name,
      category: dto.category,
      template: dto.template,
      provider: dto.provider ?? 'openai',
      model: dto.model ?? 'gpt-4o',
      tags: dto.tags ?? [],
      variables: dto.variables ?? [],
      description: dto.description ?? '',
      maxTokens: dto.maxTokens ?? 4096,
      sortOrder: dto.sortOrder ?? 0,
      createdBy: dto.createdBy ?? 'user',
      status: 'active',
      isLatest: true,
      version: '1.0.0',
    });
  }

  @Get()
  @ApiOperation({ summary: 'List prompts (all or filtered/search)' })
  @ApiResponse({ status: 200, description: 'Prompt list' })
  async list(@Query() query: QueryPromptDto) {
    const { keyword, category, status, tags, page, limit } = query;
    if (keyword) {
      return this.promptCenter.search(keyword, {
        category,
        status,
        tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
        page,
        limit,
      });
    }
    if (category) {
      return this.promptCenter.listByCategory(category as PromptCategory);
    }
    return this.promptCenter.getAll();
  }

  @Get('grouped')
  @ApiOperation({ summary: 'List prompts grouped by category' })
  @ApiResponse({ status: 200, description: 'Grouped prompts' })
  async listGrouped() {
    return this.registryService.listGroupedByCategory();
  }

  @Get(':promptId')
  @ApiOperation({ summary: 'Get a single prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 200, description: 'Prompt data' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  async get(@Param('promptId') promptId: string) {
    return this.promptCenter.get(promptId);
  }

  @Put(':promptId')
  @ApiOperation({ summary: 'Update a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 200, description: 'Updated prompt' })
  async update(
    @Param('promptId') promptId: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptCenter.update(promptId, dto);
  }

  @Delete(':promptId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a prompt and all its versions' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async remove(@Param('promptId') promptId: string) {
    await this.promptCenter.remove(promptId);
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Batch delete prompts (admin only)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async batchRemove(@Body() dto: BatchDeletePromptDto) {
    await this.registryService.batchRemove(dto.ids);
  }

  /* =====================================================================
   *  Built-in templates
   * ===================================================================== */

  @Get('built-in')
  @ApiOperation({ summary: 'List all built-in template definitions' })
  @ApiResponse({ status: 200, description: 'Built-in templates' })
  async getBuiltInTemplates() {
    return this.registryService.getAllBuiltInTemplates();
  }

  @Get('built-in/:id')
  @ApiOperation({ summary: 'Get a built-in template definition' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Built-in template' })
  async getBuiltInTemplate(@Param('id') id: string) {
    return this.registryService.getBuiltInTemplate(id);
  }

  /* =====================================================================
   *  Version Management
   * ===================================================================== */

  @Post(':promptId/versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new version for a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 201, description: 'Version created' })
  async createVersion(
    @Param('promptId') promptId: string,
    @Body() dto: CreatePromptVersionDto,
  ) {
    return this.versionService.createVersion({ ...dto, promptId });
  }

  @Get(':promptId/versions')
  @ApiOperation({ summary: 'List all versions of a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 200, description: 'Version list' })
  async listVersions(
    @Param('promptId') promptId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.versionService.listVersions(promptId, {
      status: status as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':promptId/versions/latest')
  @ApiOperation({ summary: 'Get the latest version of a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 200, description: 'Latest version' })
  async getLatestVersion(@Param('promptId') promptId: string) {
    return this.promptCenter.getLatestVersion(promptId);
  }

  @Get(':promptId/versions/:version')
  @ApiOperation({ summary: 'Get a specific version' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiParam({ name: 'version', description: 'Semver version string' })
  @ApiResponse({ status: 200, description: 'Version data' })
  async getVersion(
    @Param('promptId') promptId: string,
    @Param('version') version: string,
  ) {
    return this.versionService.getVersion(promptId, version);
  }

  @Post(':promptId/versions/:version/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a version (draft → published)' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiParam({ name: 'version', description: 'Semver version string' })
  @ApiResponse({ status: 200, description: 'Published version' })
  async publishVersion(
    @Param('promptId') promptId: string,
    @Param('version') version: string,
  ) {
    return this.versionService.publishVersion(promptId, version);
  }

  @Post(':promptId/versions/:version/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a version (published/draft → archived)' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiParam({ name: 'version', description: 'Semver version string' })
  @ApiResponse({ status: 200, description: 'Archived version' })
  async archiveVersion(
    @Param('promptId') promptId: string,
    @Param('version') version: string,
  ) {
    return this.versionService.archiveVersion(promptId, version);
  }

  @Delete(':promptId/versions/:version')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft version' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiParam({ name: 'version', description: 'Semver version string' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async deleteVersion(
    @Param('promptId') promptId: string,
    @Param('version') version: string,
  ) {
    await this.versionService.deleteVersion(promptId, version);
  }

  @Post(':promptId/versions/bump')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Auto-bump version and create new draft' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['major', 'minor', 'patch'] },
        template: { type: 'string' },
        description: { type: 'string' },
        changelog: { type: 'string' },
        publishedBy: { type: 'string' },
      },
      required: ['level'],
    },
  })
  @ApiResponse({ status: 201, description: 'New version created' })
  async bumpVersion(
    @Param('promptId') promptId: string,
    @Body() body: {
      level: 'major' | 'minor' | 'patch';
      template?: string;
      variables?: string[];
      description?: string;
      changelog?: string;
      publishedBy?: string;
    },
  ) {
    return this.promptCenter.bumpVersion(promptId, body.level, {
      template: body.template,
      variables: body.variables,
      description: body.description,
      changelog: body.changelog,
      publishedBy: body.publishedBy,
    });
  }

  @Get(':promptId/versions/:baseVersion/compare/:targetVersion')
  @ApiOperation({ summary: 'Compare two versions' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiParam({ name: 'baseVersion', description: 'Base version' })
  @ApiParam({ name: 'targetVersion', description: 'Target version' })
  @ApiResponse({ status: 200, description: 'Comparison result' })
  async compareVersions(
    @Param('promptId') promptId: string,
    @Param('baseVersion') baseVersion: string,
    @Param('targetVersion') targetVersion: string,
  ) {
    return this.versionService.compareVersions(promptId, baseVersion, targetVersion);
  }

  /* =====================================================================
   *  Variable Management
   * ===================================================================== */

  @Post('variables/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate variables against a template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        template: { type: 'string' },
        declared: { type: 'array', items: { type: 'string' } },
      },
      required: ['template', 'declared'],
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateVariables(
    @Body() body: { template: string; declared: string[] },
  ) {
    return this.variableService.validateVariables(body.template, body.declared);
  }

  @Post('variables/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract {{variable}} placeholders from template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        template: { type: 'string' },
      },
      required: ['template'],
    },
  })
  @ApiResponse({ status: 200, description: 'Extracted variable names' })
  async extractVariables(@Body() body: { template: string }) {
    return this.variableService.extractVariables(body.template);
  }

  @Post('variables/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve variables in a template with values' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        template: { type: 'string' },
        values: { type: 'object' },
      },
      required: ['template', 'values'],
    },
  })
  @ApiResponse({ status: 200, description: 'Resolved result' })
  async resolveVariables(
    @Body() body: { template: string; values: Record<string, string> },
  ) {
    return this.variableService.resolveVariables(body.template, body.values);
  }

  @Post(':promptId/variables')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a variable declaration to a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { variable: { type: 'string' } },
      required: ['variable'],
    },
  })
  @ApiResponse({ status: 201, description: 'Updated variable list' })
  async addVariable(
    @Param('promptId') promptId: string,
    @Body() body: { variable: string },
  ) {
    return this.variableService.addVariable(promptId, body.variable);
  }

  @Delete(':promptId/variables/:variable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a variable declaration' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiParam({ name: 'variable', description: 'Variable name' })
  @ApiResponse({ status: 200, description: 'Updated variable list' })
  async removeVariable(
    @Param('promptId') promptId: string,
    @Param('variable') variable: string,
  ) {
    return this.variableService.removeVariable(promptId, variable);
  }

  @Put(':promptId/variables')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace all variable declarations' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variables: { type: 'array', items: { type: 'string' } },
      },
      required: ['variables'],
    },
  })
  @ApiResponse({ status: 200, description: 'Updated variable list' })
  async setVariables(
    @Param('promptId') promptId: string,
    @Body() body: { variables: string[] },
  ) {
    return this.variableService.setVariables(promptId, body.variables);
  }

  @Get(':promptId/variables')
  @ApiOperation({ summary: 'Get variable declarations for a prompt' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 200, description: 'Variable list' })
  async getPromptVariables(@Param('promptId') promptId: string) {
    return this.variableService.getPromptVariables(promptId);
  }

  @Get(':promptId/variables/analyze')
  @ApiOperation({ summary: 'Full variable analysis (placeholders vs declared)' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 200, description: 'Analysis report' })
  async analyzeVariables(@Param('promptId') promptId: string) {
    return this.variableService.analyze(promptId);
  }

  @Post(':promptId/variables/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync template variables to declared list' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async syncVariables(@Param('promptId') promptId: string) {
    return this.variableService.syncVariables(promptId);
  }

  /* =====================================================================
   *  Render & Execute
   * ===================================================================== */

  @Post('render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render a prompt (template + variables, no LLM call)' })
  @ApiResponse({ status: 200, description: 'Compiled prompt' })
  async render(@Body() dto: ExecutePromptDto) {
    return this.promptCenter.render({
      promptId: dto.promptId,
      version: dto.version,
      variables: dto.variables,
      overrides: dto.overrides,
    });
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a prompt (render + LLM call)' })
  @ApiResponse({ status: 200, description: 'Execution result' })
  async execute(
    @CurrentUser('sub') userId: string,
    @Body() dto: ExecutePromptDto,
  ) {
    return this.promptCenter.execute({
      promptId: dto.promptId,
      version: dto.version,
      variables: dto.variables,
      overrides: dto.overrides,
      userId,
    });
  }

  @Post(':promptId/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview rendered template (no LLM call)' })
  @ApiParam({ name: 'promptId', description: 'Prompt unique identifier' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variables: { type: 'object' },
        version: { type: 'string' },
      },
      required: ['variables'],
    },
  })
  @ApiResponse({ status: 200, description: 'Preview result' })
  async preview(
    @Param('promptId') promptId: string,
    @Body() body: { variables: Record<string, string>; version?: string },
  ) {
    return this.promptCenter.preview(promptId, body.variables, body.version);
  }

  /* =====================================================================
   *  Playground
   * ===================================================================== */

  @Post('playground/render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Playground: render a prompt with token estimates' })
  @ApiResponse({ status: 200, description: 'Playground render result' })
  async playgroundRender(@Body() dto: ExecutePromptDto) {
    return this.playgroundService.render({
      promptId: dto.promptId,
      version: dto.version,
      variables: dto.variables,
      overrides: dto.overrides,
    });
  }

  @Post('playground/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Playground: execute a prompt test call' })
  @ApiResponse({ status: 200, description: 'Playground test result' })
  async playgroundTest(@Body() dto: ExecutePromptDto) {
    return this.playgroundService.test({
      promptId: dto.promptId,
      version: dto.version,
      variables: dto.variables,
      overrides: dto.overrides,
    });
  }

  @Post('playground/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Playground: analyze template token usage' })
  @ApiResponse({ status: 200, description: 'Token analysis' })
  async playgroundAnalyze(@Body() dto: ExecutePromptDto) {
    return this.playgroundService.analyze({
      promptId: dto.promptId,
      version: dto.version,
      variables: dto.variables,
      overrides: dto.overrides,
    });
  }

  @Post('playground/estimate-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estimate token count for arbitrary text' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        model: { type: 'string' },
      },
      required: ['text'],
    },
  })
  @ApiResponse({ status: 200, description: 'Token estimate' })
  async estimateTokens(
    @Body() body: { text: string; model?: string },
  ) {
    const tokens = await this.playgroundService.estimateTokens(body.text, body.model);
    return { text: body.text, estimatedTokens: tokens };
  }
}
