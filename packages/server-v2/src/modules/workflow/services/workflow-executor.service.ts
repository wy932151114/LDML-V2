// ============================================================
// DZS-OS V2 — Workflow Executor Service
// 工作流执行引擎：拓扑排序、节点分发、执行记录管理
// ============================================================

import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import {
  Workflow,
  WorkflowDocument,
  WorkflowNode,
  WorkflowEdge,
} from '@/database/mongoose/schemas/workflow.schema';
import {
  WorkflowExecution,
  WorkflowExecutionDocument,
  WorkflowNodeResult,
  WorkflowLog,
  ExecutionStatus,
  NodeResultStatus,
} from '@/database/mongoose/schemas/workflow-execution.schema';

import type {
  WorkflowNodeType,
} from '@/database/mongoose/schemas/workflow.schema';
import type {
  WorkflowExecutionData,
  WorkflowData,
} from '../interface/workflow.interface';
import { AIRuntimeService } from '@/modules/ai-runtime/ai-runtime.service';
import { PromptCenterService } from '@/modules/prompt-center/services/prompt-center.service';
import { ReportService } from '@/modules/report/domain/report.service';

// ── 运行时上下文 ────────────────────────────────────────────────

/** 执行上下文，在单次执行中传递 */
interface ExecutionContext {
  executionId: string;
  workflowId: string;
  input: Record<string, unknown>;
  variables: Record<string, unknown>;
  nodeResults: Map<string, WorkflowNodeResult>;
  abortSignal: AbortSignal;
}

// ── 拓扑排序 ────────────────────────────────────────────────────

/**
 * 基于 Kahn 算法对 DAG 进行拓扑排序。
 * @returns 有序的 nodeId 数组，若存在环则抛出错误
 */
function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string[] {
  const nodeIds = nodes.map((n) => n.nodeId);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source)!.push(edge.target);
    }
    if (inDegree.has(edge.target)) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodeIds.length) {
    throw new Error(
      'Workflow contains a cycle — topological sort is impossible',
    );
  }

  return sorted;
}

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
    @InjectModel(WorkflowExecution.name)
    private readonly executionModel: Model<WorkflowExecutionDocument>,
    @Inject(forwardRef(() => AIRuntimeService))
    private readonly aiRuntimeService: AIRuntimeService,
    @Inject(forwardRef(() => PromptCenterService))
    private readonly promptCenterService: PromptCenterService,
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
  ) {}

  /* =================================================================
   * 执行工作流
   * ================================================================= */

  /**
   * 执行工作流：创建执行记录 → 拓扑排序 → 按序分发执行各节点
   */
  async execute(
    workflowId: string,
    input: Record<string, unknown> = {},
    options?: {
      triggeredBy?: string;
      triggerType?: 'manual' | 'scheduled' | 'event' | 'api';
    },
  ): Promise<WorkflowExecutionData> {
    // 1. 获取工作流定义
    const workflow = await this.workflowModel
      .findOne({ workflowId })
      .exec();
    if (!workflow) {
      throw new NotFoundException(`Workflow "${workflowId}" not found`);
    }

    // 2. 创建执行记录
    const executionId = uuidv4();
    const execution = await this.executionModel.create({
      executionId,
      workflowId,
      workflowName: workflow.name,
      status: 'running',
      startedAt: new Date(),
      triggeredBy: options?.triggeredBy ?? 'system',
      input,
      nodeResults: [],
      logs: [],
    });
    this.logger.log(`Execution started: ${executionId} for workflow ${workflowId}`);

    // 3. 创建中止信号
    const abortController = new AbortController();

    // 4. 构建执行上下文
    const context: ExecutionContext = {
      executionId,
      workflowId,
      input,
      variables: { ...input },
      nodeResults: new Map(),
      abortSignal: abortController.signal,
    };

    try {
      // 5. 拓扑排序
      const sortedIds = topologicalSort(workflow.nodes, workflow.edges);

      // 6. 按序执行节点
      for (const nodeId of sortedIds) {
        if (abortController.signal.aborted) break;

        const node = workflow.nodes.find((n) => n.nodeId === nodeId);
        if (!node) continue;

        await this.executeNode(node, context, workflow.edges);
      }

      // 7. 检查执行是否被中止
      if (abortController.signal.aborted) {
        execution.status = 'cancelled';
        execution.logs.push({
          timestamp: new Date(),
          level: 'warn',
          message: 'Execution was cancelled',
        });
      } else {
        // 收集所有节点输出到最终输出
        const outputs: Record<string, unknown> = {};
        for (const [nId, result] of context.nodeResults) {
          if (result.output) {
            outputs[nId] = result.output;
          }
        }
        execution.output = outputs;
        execution.status = 'completed';
        execution.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: 'Execution completed successfully',
        });
      }

      execution.completedAt = new Date();
      execution.durationMs =
        execution.completedAt.getTime() - execution.startedAt!.getTime();
      execution.nodeResults = Array.from(context.nodeResults.values());

      await execution.save();
      this.logger.log(`Execution finished: ${executionId} → ${execution.status}`);

      return this.toExecutionData(execution);
    } catch (err) {
      // 节点执行失败
      const errMsg = (err as Error).message;
      execution.status = 'failed';
      execution.error = errMsg;
      execution.completedAt = new Date();
      execution.durationMs =
        execution.completedAt.getTime() - execution.startedAt!.getTime();
      execution.nodeResults = Array.from(context.nodeResults.values());
      execution.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Execution failed: ${errMsg}`,
      });

      await execution.save();
      this.logger.error(`Execution failed: ${executionId} — ${errMsg}`);

      return this.toExecutionData(execution);
    }
  }

  /* =================================================================
   * 停止执行
   * ================================================================= */

  /**
   * 停止工作流执行
   */
  async stop(executionId: string, reason?: string): Promise<void> {
    const execution = await this.executionModel
      .findOne({ executionId })
      .exec();
    if (!execution) {
      throw new NotFoundException(
        `Execution "${executionId}" not found`,
      );
    }

    if (execution.status === 'completed' || execution.status === 'cancelled' || execution.status === 'failed') {
      throw new BadRequestException(
        `Execution "${executionId}" is already in terminal state: ${execution.status}`,
      );
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    execution.durationMs =
      execution.completedAt.getTime() - execution.startedAt!.getTime();
    execution.logs.push({
      timestamp: new Date(),
      level: 'warn',
      message: reason
        ? `Execution cancelled: ${reason}`
        : 'Execution cancelled by user',
    });

    await execution.save();
    this.logger.log(`Execution stopped: ${executionId}`);
  }

  /* =================================================================
   * 节点执行分发
   * ================================================================= */

  /**
   * 执行单个节点，根据 node.type 分发到不同处理器
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext,
    edges: WorkflowEdge[],
  ): Promise<void> {
    const startTime = Date.now();
    const nodeResult: WorkflowNodeResult = {
      nodeId: node.nodeId,
      type: node.type,
      status: 'running',
      startedAt: new Date(),
      input: { ...context.variables },
    };

    context.nodeResults.set(node.nodeId, nodeResult);

    const addLog = (_level: any, _message: string) => {
      // Logs are stored at execution level, not node level in the schema
    };

    try {
      switch (node.type) {
        case 'Start':
          await this.handleStart(node, context, edges);
          break;
        case 'End':
          await this.handleEnd(node, context);
          break;
        case 'AI_RUNTIME':
          await this.handleAIRuntime(node, context);
          break;
        case 'PROMPT':
          await this.handlePrompt(node, context);
          break;
        case 'REPORT':
          await this.handleReport(node, context);
          break;
        case 'CONDITION':
          await this.handleCondition(node, context);
          break;
        case 'DELAY':
          await this.handleDelay(node, context);
          break;
        case 'HTTP':
          await this.handleHTTP(node, context);
          break;
        case 'DATABASE':
          await this.handleDatabase(node, context);
          break;
        case 'CUSTOM':
          await this.handleCustom(node, context);
          break;
        default:
          addLog('warn', `Unknown node type: ${node.type}, skipping`);
          nodeResult.status = 'skipped';
          return;
      }

      nodeResult.completedAt = new Date();
      nodeResult.durationMs = Date.now() - startTime;
      nodeResult.status = 'completed';
      addLog('info', `Node ${node.label} (${node.type}) completed in ${nodeResult.durationMs}ms`);
    } catch (err) {
      nodeResult.completedAt = new Date();
      nodeResult.durationMs = Date.now() - startTime;
      nodeResult.status = 'failed';
      nodeResult.error = (err as Error).message;
      addLog('error', `Node ${node.label} (${node.type}) failed: ${(err as Error).message}`);

      // 传播错误以中止整个执行
      throw err;
    }
  }

  /* =================================================================
   * 节点处理器
   * ================================================================= */

  /**
   * START — 无操作，进入下一个节点
   */
  private async handleStart(
    _node: WorkflowNode,
    _context: ExecutionContext,
    _edges: WorkflowEdge[],
  ): Promise<void> {
    // 无操作；拓扑排序已保证后续节点会执行
  }

  /**
   * END — 标记完成，收集输出
   */
  private async handleEnd(
    _node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    // 最终输出的收集在 execute() 中完成
    context.variables['_end'] = true;
  }

  /**
   * AI_RUNTIME — 调用 AI 生成（真实调测链路）
   */
  private async handleAIRuntime(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const config = node.config ?? {};
    const systemPrompt = (config.systemPrompt as string) ?? '';
    const model = (config.model as string) ?? 'gpt-4o';
    const provider = (config.provider as string) ?? 'openai';

    // 输入变量替换
    const resolvedPrompt = this.resolveTemplate(systemPrompt, context.variables);

    // 真实调用 AIRuntimeService.generate()
    const userId = (context.input?.userId as string) ?? 'workflow';
    const result = await this.aiRuntimeService.generate(userId, {
      messages: [
        { role: 'system', content: resolvedPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: `Process workflow input: ${JSON.stringify(context.variables)}` },
      ],
      model,
      provider,
      temperature: (config.temperature as number) ?? 0.7,
      maxTokens: (config.maxTokens as number) ?? 2048,
    });

    context.variables[`${node.nodeId}_output`] = {
      content: result.content ?? JSON.stringify(result),
      model: result.model ?? model,
      provider: result.provider ?? provider,
      tokenUsage: result.usage,
      nodeId: node.nodeId,
    };
  }

  /**
   * PROMPT — 从 Prompt Center 获取模板并渲染（真实调测链路）
   */
  private async handlePrompt(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const config = node.config ?? {};
    const promptId = (config.promptId as string) ?? '';

    if (!promptId) {
      throw new Error(`PROMPT node "${node.nodeId}" has no promptId configured`);
    }

    // 从 Prompt Center 获取并渲染
    const result = await this.promptCenterService.render({
      promptId,
      version: (config.version as string) ?? undefined,
      variables: context.variables as Record<string, string>,
    });

    context.variables[`${node.nodeId}_output`] = {
      promptId,
      rendered: result.systemMessage || JSON.stringify(result.messages),
      variables: { ...context.variables },
      nodeId: node.nodeId,
    };
  }

  /**
   * REPORT — 生成报告（真实调测链路）
   */
  private async handleReport(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const config = node.config ?? {};
    const format = (config.format as string) ?? 'markdown';
    const reportType = (config.reportType as string) ?? 'bazi-analysis';

    // 收集所有前置节点的输出
    const collectedOutputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context.variables)) {
      if (key.endsWith('_output')) {
        collectedOutputs[key.replace('_output', '')] = value;
      }
    }

    // 真实调用 ReportService.create() 创建报告
    const userId = (context.input?.userId as string) ?? 'workflow';
    const report = await this.reportService.create(userId, {
      type: reportType as any,
      baziData: { ...context.variables } as any,
      context: { workflowId: context.workflowId, executionId: context.executionId, nodeResults: Array.from(context.nodeResults.keys()) },
      promptId: config.promptId as string,
      promptVersion: config.version as string,
      provider: config.provider as string,
      model: config.model as string,
    });

    context.variables[`${node.nodeId}_output`] = {
      format,
      collectedOutputs,
      reportId: report.reportId,
      nodeId: node.nodeId,
    };
  }

  /**
   * CONDITION — 评估条件表达式（支持简单变量比较）
   */
  private async handleCondition(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const condition = node.condition ?? '';
    if (!condition) {
      context.variables[`${node.nodeId}_result`] = true;
      return;
    }

    const result = this.evaluateCondition(condition, context.variables);
    context.variables[`${node.nodeId}_result`] = result;
    context.variables[`${node.nodeId}_output`] = { result };
  }

  /**
   * DELAY — 延迟执行
   * 注意：setTimeout 在 Node.js 中可用，此处使用 Promise 包装
   */
  private async handleDelay(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const config = node.config ?? {};
    const delayMs = (config.delayMs as number) ?? 1000;

    // 使用 Promise + setTimeout 实现延迟
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, Math.min(delayMs, 30000)); // 最大 30s

      // 如果执行被中止，清除定时器
      if (context.abortSignal.aborted) {
        clearTimeout(timer);
        reject(new Error('Execution cancelled during delay'));
      }

      context.abortSignal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new Error('Execution cancelled during delay'));
        },
        { once: true },
      );
    });

    context.variables[`${node.nodeId}_output`] = { delayed: true, delayMs };
  }

  /**
   * HTTP — 发起 HTTP 请求
   */
  private async handleHTTP(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const config = node.config ?? {};
    const url = (config.url as string) ?? '';
    const method = (config.method as string) ?? 'GET';
    const headers = (config.headers as Record<string, string>) ?? {};
    const body = config.body as Record<string, unknown> | undefined;

    if (!url) {
      throw new Error(`HTTP node "${node.nodeId}" has no URL configured`);
    }

    // 替换 URL 中的 {{variable}} 占位符
    const resolvedUrl = this.resolveTemplate(url, context.variables);

    // 真实 HTTP 请求
    try {
      const fetchOptions: RequestInit & { body?: string } = {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
      };
      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(resolvedUrl, fetchOptions);
      const responseBody = await response.text();

      context.variables[`${node.nodeId}_output`] = {
        url: resolvedUrl,
        method,
        statusCode: response.status,
        statusText: response.statusText,
        body: responseBody.substring(0, 50000), // 截取防止过大
        nodeId: node.nodeId,
      };
    } catch (err) {
      throw new Error(`HTTP node "${node.nodeId}": ${(err as Error).message}`);
    }
  }

  /**
   * DATABASE — 查询/写入数据库（真实 MongoDB 操作）
   */
  private async handleDatabase(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const config = node.config ?? {};
    const operation = (config.operation as string) ?? 'query';
    const collection = (config.collection as string) ?? '';

    if (!collection) {
      throw new Error(`DATABASE node "${node.nodeId}" has no collection configured`);
    }

    try {
      const db = this.workflowModel.db;
      const coll = db.collection(collection);
      const query = config.query as Record<string, any> ?? {};
      let result: any;

      switch (operation) {
        case 'query':
          result = await coll.find(query).limit(50).toArray();
          break;
        case 'findOne':
          result = await coll.findOne(query);
          break;
        case 'insert':
          result = await coll.insertOne(config.document as Record<string, any> ?? {});
          break;
        case 'update':
          result = await coll.updateOne(query, { $set: config.update as Record<string, any> ?? {} });
          break;
        case 'delete':
          result = await coll.deleteOne(query);
          break;
        case 'count':
          result = { count: await coll.countDocuments(query) };
          break;
        default:
          result = await coll.find(query).limit(10).toArray();
      }

      context.variables[`${node.nodeId}_output`] = {
        operation,
        collection,
        result,
        nodeId: node.nodeId,
      };
    } catch (err) {
      throw new Error(`DATABASE node "${node.nodeId}": ${(err as Error).message}`);
    }
  }

  /**
   * CUSTOM — 自定义处理器（预留）
   */
  private async handleCustom(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const config = node.config ?? {};
    const handlerId = (config.handlerId as string) ?? '';

    context.variables[`${node.nodeId}_output`] = {
      handlerId,
      message: `[CUSTOM placeholder] handler=${handlerId}`,
      nodeId: node.nodeId,
    };
  }

  /* =================================================================
   * 执行记录查询
   * ================================================================= */

  /**
   * 获取执行记录详情
   */
  async getExecution(
    executionId: string,
  ): Promise<WorkflowExecutionData | null> {
    const doc = await this.executionModel.findOne({ executionId }).exec();
    return doc ? this.toExecutionData(doc) : null;
  }

  /**
   * 查询执行记录列表
   */
  async getExecutions(
    filter: {
      workflowId?: string;
      status?: ExecutionStatus;
      triggeredBy?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    items: WorkflowExecutionData[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filter.workflowId) query.workflowId = filter.workflowId;
    if (filter.status) query.status = filter.status;
    if (filter.triggeredBy) query.triggeredBy = filter.triggeredBy;

    const [docs, total] = await Promise.all([
      this.executionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.executionModel.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((d) => this.toExecutionData(d)),
      total,
      page,
      limit,
    };
  }

  /* =================================================================
   * 内部工具
   * ================================================================= */

  /**
   * 简单模板变量替换
   */
  private resolveTemplate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const value = variables[key];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }

  /**
   * 简单条件表达式求值
   * 支持：var == value, var != value, var > number, var < number, var >= number, var <= number
   */
  private evaluateCondition(
    expression: string,
    variables: Record<string, unknown>,
  ): boolean {
    const trimmed = expression.trim();
    const operators = [
      { op: '>=', fn: (a: number, b: number) => a >= b },
      { op: '<=', fn: (a: number, b: number) => a <= b },
      { op: '!=', fn: (a: unknown, b: unknown) => String(a) !== String(b) },
      { op: '==', fn: (a: unknown, b: unknown) => String(a) === String(b) },
      { op: '>', fn: (a: number, b: number) => a > b },
      { op: '<', fn: (a: number, b: number) => a < b },
    ];

    for (const { op, fn } of operators) {
      const idx = trimmed.indexOf(op);
      if (idx > 0) {
        const leftKey = trimmed.slice(0, idx).trim();
        const rightVal = trimmed.slice(idx + op.length).trim();

        const leftValue = variables[leftKey] ?? leftKey;
        const parsedRight = isNaN(Number(rightVal))
          ? rightVal.replace(/['"]/g, '')
          : Number(rightVal);

        return fn(leftValue as any, parsedRight as any);
      }
    }

    // 如果是单个变量名，返回其 truthy 值
    if (/^\w+$/.test(trimmed)) {
      return !!variables[trimmed];
    }

    return false;
  }

  private toExecutionData(
    doc: WorkflowExecutionDocument,
  ): WorkflowExecutionData {
    return {
      executionId: doc.executionId,
      workflowId: doc.workflowId,
      workflowName: doc.workflowName,
      workflowVersion: parseInt(doc.workflowName, 10) || 1,
      status: doc.status as ExecutionStatus,
      triggeredBy: doc.triggeredBy,
      triggerType: 'manual',
      input: doc.input ?? {},
      output: doc.output ?? {},
      nodeResults: (doc.nodeResults ?? []).map((r) => ({
        nodeId: r.nodeId,
        nodeType: r.type as any,
        nodeLabel: r.nodeId,
        status: r.status as any,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        duration: r.durationMs,
        input: r.input,
        output: r.output,
        errorMessage: r.error,
        retryCount: 0,
      })),
      logs: (doc.logs ?? []).map((l) => ({
        timestamp: l.timestamp,
        level: l.level as any,
        nodeId: l.nodeId,
        message: l.message,
        data: undefined,
      })),
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      duration: doc.durationMs,
      errorMessage: doc.error,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
