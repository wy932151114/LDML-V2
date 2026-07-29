/* =========================================================================
 * AIRuntimeController — AI 运行时 HTTP API
 *
 * Exposes REST endpoints for AI inference, health monitoring, model
 * management, configuration, and analytics.
 * ========================================================================= */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Header,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AIRuntimeService } from './ai-runtime.service';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/common/utils/user.interface';

@ApiTags('AI Runtime')
@ApiBearerAuth('JWT-auth')
@Controller('v2/ai-runtime')
export class AIRuntimeController {
  constructor(private readonly aiRuntime: AIRuntimeService) {}

  /* -----------------------------------------------------------------------
   * Generate
   * ----------------------------------------------------------------------- */

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI content' })
  @ApiResponse({ status: 200, description: 'Generated content' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        model: { type: 'string', example: 'gpt-4o' },
        provider: { type: 'string', example: 'openai' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['system', 'user', 'assistant'] },
              content: { type: 'string' },
            },
          },
        },
        temperature: { type: 'number', example: 0.7 },
        topP: { type: 'number', example: 0.9 },
        maxTokens: { type: 'number', example: 4096 },
      },
      required: ['messages'],
    },
  })
  async generate(
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      model?: string;
      provider?: string;
      messages: { role: string; content: string }[];
      temperature?: number;
      topP?: number;
      maxTokens?: number;
    },
  ) {
    return this.aiRuntime.generate(userId, body);
  }

  /* -----------------------------------------------------------------------
   * Stream (SSE)
   * ----------------------------------------------------------------------- */

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: 'Stream AI content via SSE' })
  @ApiResponse({ status: 200, description: 'Streaming response' })
  async stream(
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      model?: string;
      provider?: string;
      messages: { role: string; content: string }[];
      temperature?: number;
      topP?: number;
      maxTokens?: number;
    },
    @Req() req: Request,
  ) {
    const stream = this.aiRuntime.stream(userId, body);
    const res = req.res!;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }

  /* -----------------------------------------------------------------------
   * Health
   * ----------------------------------------------------------------------- */

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'AI Runtime health check' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async health() {
    return this.aiRuntime.getHealth();
  }

  /* -----------------------------------------------------------------------
   * Models
   * ----------------------------------------------------------------------- */

  @Get('models')
  @ApiOperation({ summary: 'List available AI models' })
  @ApiResponse({ status: 200, description: 'Available models' })
  async getModels() {
    return this.aiRuntime.getModels();
  }

  /* -----------------------------------------------------------------------
   * Config
   * ----------------------------------------------------------------------- */

  @Get('config')
  @ApiOperation({ summary: 'Get runtime configuration' })
  @ApiResponse({ status: 200, description: 'Runtime configuration' })
  async getConfig() {
    return this.aiRuntime.getConfig();
  }

  @Put('config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update runtime configuration (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated configuration' })
  async updateConfig(
    @Body() updates: Record<string, any>,
  ) {
    return this.aiRuntime.updateConfig(updates);
  }

  /* -----------------------------------------------------------------------
   * Stats
   * ----------------------------------------------------------------------- */

  @Get('stats/tokens')
  @ApiOperation({ summary: 'Get token consumption stats for current user' })
  @ApiResponse({ status: 200, description: 'Token stats' })
  async getTokenStats(@CurrentUser('sub') userId: string) {
    return this.aiRuntime.getTokenStats(userId);
  }

  @Get('stats/providers')
  @ApiOperation({ summary: 'Get provider usage statistics' })
  @ApiResponse({ status: 200, description: 'Provider stats' })
  async getProviderStats() {
    return this.aiRuntime.getProviderStats();
  }

  @Get('stats/cache')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache stats' })
  async getCacheStats() {
    // Forward to AiLogService via the runtime service
    // For now, use the runtime's health which includes cache info
    return (await this.aiRuntime.getHealth()).cache;
  }

  /* -----------------------------------------------------------------------
   * Provider testing
   * ----------------------------------------------------------------------- */

  @Post('providers/:name/test')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Test a specific AI provider (admin only)' })
  @ApiResponse({ status: 200, description: 'Provider test result' })
  async testProvider(@Param('name') name: string) {
    // For a test, we just hit the health endpoint
    const health = await this.aiRuntime.getHealth();
    const providerHealth = health.providers[name];
    return {
      provider: name,
      ...providerHealth,
      timestamp: new Date().toISOString(),
    };
  }
}
