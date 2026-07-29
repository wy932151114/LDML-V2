// ============================================================
// DZS-OS V2 — Workflow Validator Service
// 工作流验证器：检查 DAG 合法性、节点/边完整性、必需字段
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import type {
  WorkflowNode,
  WorkflowEdge,
} from '@/database/mongoose/schemas/workflow.schema';
import type { WorkflowNodeType } from '@/database/mongoose/schemas/workflow.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workflow, WorkflowDocument } from '@/database/mongoose/schemas/workflow.schema';

// ── 结果类型 ────────────────────────────────────────────────────

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class WorkflowValidatorService {
  private readonly logger = new Logger(WorkflowValidatorService.name);

  constructor(
    @InjectModel(Workflow.name)
    private readonly workflowModel: Model<WorkflowDocument>,
  ) {}

  /**
   * 验证工作流拓扑及字段完整性
   */
  async validate(workflowId: string): Promise<ValidationResult>;
  async validate(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<ValidationResult>;
  async validate(
    nodesOrId: WorkflowNode[] | string,
    edges?: WorkflowEdge[],
  ): Promise<ValidationResult> {
    let nodes: WorkflowNode[];
    let edgesList: WorkflowEdge[];

    if (typeof nodesOrId === 'string') {
      // 通过 workflowId 加载并验证
      const doc = await this.workflowModel
        .findOne({ workflowId: nodesOrId })
        .exec();
      if (!doc) {
        return {
          valid: false,
          errors: [
            {
              code: 'WORKFLOW_NOT_FOUND',
              message: `Workflow "${nodesOrId}" not found`,
            },
          ],
          warnings: [],
        };
      }
      nodes = doc.nodes ?? [];
      edgesList = doc.edges ?? [];
    } else {
      nodes = nodesOrId;
      edgesList = edges ?? [];
    }

    return this.validateNodesAndEdges(nodes, edgesList);
  }

  /**
   * 对节点和边集合执行完整校验
   */
  private validateNodesAndEdges(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. 空检查
    if (nodes.length === 0) {
      errors.push({
        code: 'NO_NODES',
        message: 'Workflow must have at least one node',
      });
      return { valid: false, errors, warnings };
    }

    // 2. 检查 START 节点 — 必须且只能有一个
    this.validateStartNode(nodes, edges, errors, warnings);

    // 3. 检查 END 节点 — 必须且只能有一个
    this.validateEndNode(nodes, edges, errors, warnings);

    // 4. 检查孤立节点
    this.validateIsolatedNodes(nodes, edges, errors, warnings);

    // 5. 检查循环依赖（DAG 检测）
    this.validateNoCycles(nodes, edges, errors, warnings);

    // 6. 检查必需字段
    this.validateRequiredFields(nodes, edges, errors, warnings);

    // 7. 检查节点 ID 唯一性
    this.validateUniqueNodeIds(nodes, errors, warnings);

    // 8. 检查边引用的节点是否存在
    this.validateEdgeReferences(nodes, edges, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /* -----------------------------------------------------------------
   * START 节点校验
   * ----------------------------------------------------------------- */

  private validateStartNode(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const startNodes = nodes.filter(
      (n) => n.type === 'Start',
    );

    if (startNodes.length === 0) {
      errors.push({
        code: 'MISSING_START',
        message: 'Workflow must have exactly one START node',
      });
      return;
    }

    if (startNodes.length > 1) {
      for (const sn of startNodes) {
        errors.push({
          code: 'DUPLICATE_START',
          message: `Duplicate START node: "${sn.nodeId}"`,
          nodeId: sn.nodeId,
        });
      }
    }

    // START 节点必须有出边
    const startId = startNodes[0]?.nodeId;
    if (startId) {
      const outgoing = edges.filter((e) => e.source === startId);
      if (outgoing.length === 0) {
        errors.push({
          code: 'START_NO_OUTPUT',
          message: `START node "${startId}" must have at least one outgoing edge`,
          nodeId: startId,
        });
      }
    }
  }

  /* -----------------------------------------------------------------
   * END 节点校验
   * ----------------------------------------------------------------- */

  private validateEndNode(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const endNodes = nodes.filter(
      (n) => n.type === 'End',
    );

    if (endNodes.length === 0) {
      errors.push({
        code: 'MISSING_END',
        message: 'Workflow must have exactly one END node',
      });
      return;
    }

    if (endNodes.length > 1) {
      for (const en of endNodes) {
        errors.push({
          code: 'DUPLICATE_END',
          message: `Duplicate END node: "${en.nodeId}"`,
          nodeId: en.nodeId,
        });
      }
    }

    // END 节点必须有入边
    const endId = endNodes[0]?.nodeId;
    if (endId) {
      const incoming = edges.filter((e) => e.target === endId);
      if (incoming.length === 0) {
        errors.push({
          code: 'END_NO_INPUT',
          message: `END node "${endId}" must have at least one incoming edge`,
          nodeId: endId,
        });
      }
    }
  }

  /* -----------------------------------------------------------------
   * 孤立节点校验
   * ----------------------------------------------------------------- */

  private validateIsolatedNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const nodeIds = new Set(nodes.map((n) => n.nodeId));
    const connectedNodes = new Set<string>();

    for (const edge of edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    for (const node of nodes) {
      if (!connectedNodes.has(node.nodeId)) {
        warnings.push({
          code: 'ISOLATED_NODE',
          message: `Node "${node.label}" (${node.nodeId}) is not connected to any edge`,
          nodeId: node.nodeId,
        });
      }
    }
  }

  /* -----------------------------------------------------------------
   * 循环依赖检测（DFS + 三色标记）
   * ----------------------------------------------------------------- */

  private validateNoCycles(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    errors: ValidationError[],
    _warnings: ValidationWarning[],
  ): void {
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.nodeId, []);
    }
    for (const edge of edges) {
      const list = adjacency.get(edge.source);
      if (list) {
        list.push(edge.target);
      }
    }

    const WHITE = 0; // 未访问
    const GRAY = 1; // 正在访问
    const BLACK = 2; // 已访问

    const color = new Map<string, number>();
    for (const node of nodes) {
      color.set(node.nodeId, WHITE);
    }

    const dfsStack: string[] = [];

    const dfs = (nodeId: string): boolean => {
      color.set(nodeId, GRAY);
      dfsStack.push(nodeId);

      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const neighborColor = color.get(neighbor);
        if (neighborColor === GRAY) {
          // 发现环
          const cyclePath = [...dfsStack.slice(dfsStack.indexOf(neighbor)), neighbor].join(' → ');
          errors.push({
            code: 'CYCLE_DETECTED',
            message: `Circular dependency detected: ${cyclePath}`,
            nodeId: nodeId,
          });
          return true;
        }
        if (neighborColor === WHITE) {
          if (dfs(neighbor)) return true;
        }
      }

      dfsStack.pop();
      color.set(nodeId, BLACK);
      return false;
    };

    for (const node of nodes) {
      if (color.get(node.nodeId) === WHITE) {
        dfs(node.nodeId);
      }
    }
  }

  /* -----------------------------------------------------------------
   * 必需字段校验
   * ----------------------------------------------------------------- */

  private validateRequiredFields(
    nodes: WorkflowNode[],
    _edges: WorkflowEdge[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    for (const node of nodes) {
      // 每个节点必须有 nodeId
      if (!node.nodeId) {
        errors.push({
          code: 'MISSING_NODE_ID',
          message: 'A node is missing its nodeId',
        });
        continue;
      }

      // 每个节点必须有 label
      if (!node.label) {
        warnings.push({
          code: 'MISSING_NODE_LABEL',
          message: `Node "${node.nodeId}" is missing a label`,
          nodeId: node.nodeId,
        });
      }

      // 每个节点必须有 position
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        warnings.push({
          code: 'MISSING_NODE_POSITION',
          message: `Node "${node.nodeId}" is missing position coordinates`,
          nodeId: node.nodeId,
        });
      }

      // 类型特定字段检查
      this.validateNodeTypeSpecific(node, errors, warnings);
    }

    // 边的必需字段
    for (const edge of _edges) {
      if (!edge.edgeId) {
        errors.push({
          code: 'MISSING_EDGE_ID',
          message: 'An edge is missing its edgeId',
        });
      }
      if (!edge.source) {
        errors.push({
          code: 'MISSING_EDGE_SOURCE',
          message: `Edge "${edge.edgeId ?? 'unknown'}" is missing source`,
          edgeId: edge.edgeId,
        });
      }
      if (!edge.target) {
        errors.push({
          code: 'MISSING_EDGE_TARGET',
          message: `Edge "${edge.edgeId ?? 'unknown'}" is missing target`,
          edgeId: edge.edgeId,
        });
      }
    }
  }

  /**
   * 节点类型特定字段检查
   */
  private validateNodeTypeSpecific(
    node: WorkflowNode,
    errors: ValidationError[],
    _warnings: ValidationWarning[],
  ): void {
    const type = node.type.toUpperCase() as WorkflowNodeType;

    switch (type) {
      case 'AI_RUNTIME':
        if (!node.config?.systemPrompt && !node.config?.promptId) {
          _warnings.push({
            code: 'AI_RUNTIME_NO_PROMPT',
            message: `AI_RUNTIME node "${node.nodeId}" has no systemPrompt or promptId configured`,
            nodeId: node.nodeId,
          });
        }
        break;

      case 'PROMPT':
        if (!node.config?.promptId) {
          errors.push({
            code: 'PROMPT_NO_ID',
            message: `PROMPT node "${node.nodeId}" must have a promptId in config`,
            nodeId: node.nodeId,
          });
        }
        break;

      case 'HTTP':
        if (!node.config?.url) {
          errors.push({
            code: 'HTTP_NO_URL',
            message: `HTTP node "${node.nodeId}" must have a url in config`,
            nodeId: node.nodeId,
          });
        }
        break;

      case 'DELAY':
        if (node.config?.delayMs !== undefined && typeof node.config.delayMs !== 'number') {
          errors.push({
            code: 'DELAY_INVALID',
            message: `DELAY node "${node.nodeId}": delayMs must be a number`,
            nodeId: node.nodeId,
          });
        }
        break;

      case 'DATABASE':
        if (!node.config?.collection && !node.config?.operation) {
          _warnings.push({
            code: 'DATABASE_INCOMPLETE',
            message: `DATABASE node "${node.nodeId}" should specify collection and operation in config`,
            nodeId: node.nodeId,
          });
        }
        break;

      case 'CONDITION':
        if (!node.condition) {
          _warnings.push({
            code: 'CONDITION_NO_EXPR',
            message: `CONDITION node "${node.nodeId}" has no condition expression`,
            nodeId: node.nodeId,
          });
        }
        break;

      case 'CUSTOM':
        if (!node.config?.handlerId) {
          _warnings.push({
            code: 'CUSTOM_NO_HANDLER',
            message: `CUSTOM node "${node.nodeId}" has no handlerId, it will be skipped`,
            nodeId: node.nodeId,
          });
        }
        break;

      default:
        // START / END / REPORT 无特殊字段要求
        break;
    }
  }

  /* -----------------------------------------------------------------
   * 节点 ID 唯一性
   * ----------------------------------------------------------------- */

  private validateUniqueNodeIds(
    nodes: WorkflowNode[],
    errors: ValidationError[],
    _warnings: ValidationWarning[],
  ): void {
    const seen = new Map<string, number>();
    for (const node of nodes) {
      const count = (seen.get(node.nodeId) ?? 0) + 1;
      seen.set(node.nodeId, count);
      if (count > 1) {
        errors.push({
          code: 'DUPLICATE_NODE_ID',
          message: `Duplicate node ID: "${node.nodeId}"`,
          nodeId: node.nodeId,
        });
      }
    }
  }

  /* -----------------------------------------------------------------
   * 边引用校验
   * ----------------------------------------------------------------- */

  private validateEdgeReferences(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    errors: ValidationError[],
    _warnings: ValidationWarning[],
  ): void {
    const nodeIds = new Set(nodes.map((n) => n.nodeId));

    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          code: 'EDGE_SOURCE_NOT_FOUND',
          message: `Edge "${edge.edgeId}" references non-existent source node "${edge.source}"`,
          edgeId: edge.edgeId,
        });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          code: 'EDGE_TARGET_NOT_FOUND',
          message: `Edge "${edge.edgeId}" references non-existent target node "${edge.target}"`,
          edgeId: edge.edgeId,
        });
      }
    }
  }
}
