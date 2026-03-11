// =====================================================
// 多模态组装算法
// Agent Assembler - Multi-modal Assembly Engine
// =====================================================

import { Node, Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { BuildPlan, GeneratedSkillSpec, KnowledgeBaseSuggestion, AssetMatch } from '../types/buildPlan.ts';
import type { MPLPPolicy } from '../types/workflowDSL.ts';
import { 
  extractConditions, 
  needsConditionNode, 
  generateConditionRules,
  getBranchActions,
  inferMCPFromAction,
  type ExtractedCondition 
} from './intentConditionExtractor.ts';
import { generateSecureSystemPrompt, inferSecurityLevel, injectSecurityBoundaries } from './securityPromptTemplate.ts';
import { generateSmartAvatar } from './avatarGenerator.ts';
import { 
  selectLogicNode, 
  selectMultipleLogicNodes,
  needsLogicNode,
  type LogicNodeCandidate,
  type LogicNodeType
} from './logicNodeSelector.ts';

// 组装输入
export interface AssemblyInput {
  plan: BuildPlan;
  existingAssets: AssetMatch[];
  generatedSkills: GeneratedSkillSpec[];
  autoMountedKBs: KnowledgeBaseSuggestion[];
  mplpPolicy: MPLPPolicy;
  agentName?: string;
  systemPrompt?: string;
  userDescription?: string; // Added for condition extraction
}

// 组装输出
export interface AssemblyOutput {
  nodes: Node[];
  edges: Edge[];
  agentConfig: {
    name: string;
    systemPrompt: string;
    model: string;
    avatar: { iconId: string; colorId: string };
    department?: string;
  };
  warnings: string[];
}

// 风险等级到确认需求映射
const RISK_CONFIRMATION_MAP: Record<MPLPPolicy, Set<string>> = {
  permissive: new Set(['high']),
  default: new Set(['high', 'medium']),
  strict: new Set(['high', 'medium', 'low']),
};

// 节点默认尺寸
const NODE_WIDTH = 250;
const NODE_HEIGHT = 100;

/**
 * 多模态组装算法 - 将资产组装成完整的工作流
 */
export function assembleAgent(input: AssemblyInput): AssemblyOutput {
  const {
    plan,
    existingAssets,
    generatedSkills,
    autoMountedKBs,
    mplpPolicy,
    agentName,
    systemPrompt,
  } = input;

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const warnings: string[] = [];

  let nodeIndex = 0;
  const createNodeId = () => `node-${nodeIndex++}`;

  // 1. 创建触发器节点
  const triggerId = createNodeId();
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: 0, y: 0 },
    data: {
      id: triggerId,
      name: '用户输入',
      triggerType: 'message',
      config: {},
    },
  });

  let previousNodeId = triggerId;

  // 2. 创建知识库节点 (如果有自动挂载的知识库)
  if (autoMountedKBs.length > 0) {
    for (const kb of autoMountedKBs.slice(0, 2)) {
      const kbNodeId = createNodeId();
      nodes.push({
        id: kbNodeId,
        type: 'knowledge',
        position: { x: 0, y: 0 },
        data: {
          id: kbNodeId,
          name: `检索 ${kb.name}`,
          assetId: kb.id,
          assetType: 'knowledge_base',
          isAutoMounted: true,
          matchScore: kb.matchScore,
          contextHook: kb.contextHook,
          config: {
            retrievalMode: 'hybrid',
            topK: 5,
          },
        },
      });
      
      edges.push({
        id: `edge-${previousNodeId}-${kbNodeId}`,
        source: previousNodeId,
        target: kbNodeId,
        type: 'animatedFlow',
        animated: true,
      });
      
      previousNodeId = kbNodeId;
    }
  }

  // 3. 添加现有资产节点 (skills, mcp tools)
  const skillAssets = existingAssets.filter(a => a.type === 'skill' && a.action === 'use');
  const mcpAssets = existingAssets.filter(a => a.type === 'mcp' && a.action === 'use');

  for (const skill of skillAssets.slice(0, 3)) {
    const skillNodeId = createNodeId();
    const needsConfirm = shouldRequireConfirmation(skill, mplpPolicy);

    // 如果需要确认，先添加确认节点
    if (needsConfirm) {
      const confirmNodeId = createNodeId();
      nodes.push({
        id: confirmNodeId,
        type: 'intervention',
        position: { x: 0, y: 0 },
        data: {
          id: confirmNodeId,
          name: `确认执行 ${skill.name}`,
          interventionType: 'confirm',
          riskLevel: 'medium',
          description: `即将执行 ${skill.name}，请确认`,
        },
      });
      
      edges.push({
        id: `edge-${previousNodeId}-${confirmNodeId}`,
        source: previousNodeId,
        target: confirmNodeId,
        type: 'animatedFlow',
        animated: true,
      });
      
      previousNodeId = confirmNodeId;
    }

    nodes.push({
      id: skillNodeId,
      type: 'skill',
      position: { x: 0, y: 0 },
      data: {
        id: skillNodeId,
        name: skill.name,
        assetId: skill.id,
        assetType: 'skill',
        score: skill.score,
        config: {},
      },
    });
    
    edges.push({
      id: `edge-${previousNodeId}-${skillNodeId}`,
      source: previousNodeId,
      target: skillNodeId,
      type: 'animatedFlow',
      animated: true,
    });
    
    previousNodeId = skillNodeId;
  }

  // 4. 添加 MCP 工具节点
  for (const mcp of mcpAssets.slice(0, 2)) {
    const mcpNodeId = createNodeId();
    const needsConfirm = shouldRequireConfirmation(mcp, mplpPolicy);

    if (needsConfirm) {
      const confirmNodeId = createNodeId();
      nodes.push({
        id: confirmNodeId,
        type: 'intervention',
        position: { x: 0, y: 0 },
        data: {
          id: confirmNodeId,
          name: `确认调用 ${mcp.name}`,
          interventionType: 'confirm',
          riskLevel: 'high',
          description: `即将调用外部工具 ${mcp.name}，请确认`,
        },
      });
      
      edges.push({
        id: `edge-${previousNodeId}-${confirmNodeId}`,
        source: previousNodeId,
        target: confirmNodeId,
        type: 'animatedFlow',
        animated: true,
      });
      
      previousNodeId = confirmNodeId;
    }

    nodes.push({
      id: mcpNodeId,
      type: 'mcpAction',
      position: { x: 0, y: 0 },
      data: {
        id: mcpNodeId,
        name: mcp.name,
        assetId: mcp.id,
        assetType: 'mcp_tool',
        score: mcp.score,
        riskLevel: 'medium',
        config: {},
      },
    });
    
    edges.push({
      id: `edge-${previousNodeId}-${mcpNodeId}`,
      source: previousNodeId,
      target: mcpNodeId,
      type: 'animatedFlow',
      animated: true,
    });
    
    previousNodeId = mcpNodeId;
  }

  // 5. 添加 AI 生成的技能节点
  for (const skill of generatedSkills) {
    const genSkillNodeId = createNodeId();
    
    nodes.push({
      id: genSkillNodeId,
      type: 'generatedSkill',
      position: { x: 0, y: 0 },
      data: {
        id: genSkillNodeId,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        capabilities: skill.capabilities,
        isGenerated: true,
        generatedAt: skill.generatedAt,
        templateContent: skill.templateContent,
        config: {
          inputSchema: skill.inputSchema,
          outputSchema: skill.outputSchema,
        },
      },
    });
    
    edges.push({
      id: `edge-${previousNodeId}-${genSkillNodeId}`,
      source: previousNodeId,
      target: genSkillNodeId,
      type: 'animatedFlow',
      animated: true,
      style: { stroke: 'hsl(var(--warning))', strokeDasharray: '5,5' },
    });
    
    previousNodeId = genSkillNodeId;
  }

  // 5.5 智能逻辑节点检测和添加
  const userDescription = input.userDescription || plan.description || '';
  
  // 首先使用新的智能逻辑节点选择器
  const logicNodeCandidate = selectLogicNode(userDescription);
  let logicNodeId: string | null = null;
  let logicBranchNodes: string[] = [];
  
  if (logicNodeCandidate) {
    logicNodeId = createNodeId();
    
    switch (logicNodeCandidate.type) {
      case 'intent_router':
        nodes.push(createIntentRouterNode(logicNodeId, logicNodeCandidate));
        edges.push({
          id: `edge-${previousNodeId}-${logicNodeId}`,
          source: previousNodeId,
          target: logicNodeId,
          type: 'animatedFlow',
          animated: true,
        });
        
        // 为意图路由器创建分支节点
        const routerConfig = logicNodeCandidate.suggestedConfig as { routes?: Array<{ id: string; name: string }> };
        if (routerConfig.routes && routerConfig.routes.length > 0) {
          for (const route of routerConfig.routes.slice(0, 3)) {
            const branchId = createNodeId();
            nodes.push({
              id: branchId,
              type: 'placeholder',
              position: { x: 0, y: 0 },
              data: {
                id: branchId,
                name: route.name,
                routeId: route.id,
                isRouteBranch: true,
              },
            });
            edges.push({
              id: `edge-${logicNodeId}-${route.id}-${branchId}`,
              source: logicNodeId,
              sourceHandle: `route-${route.id}`,
              target: branchId,
              type: 'animatedFlow',
              animated: true,
              style: { stroke: 'hsl(var(--primary))' },
            });
            logicBranchNodes.push(branchId);
          }
        }
        warnings.push(`已自动添加意图路由器节点 (置信度: ${Math.round(logicNodeCandidate.confidence * 100)}%)`);
        break;
        
      case 'condition':
        nodes.push(createConditionNode(logicNodeId, logicNodeCandidate));
        edges.push({
          id: `edge-${previousNodeId}-${logicNodeId}`,
          source: previousNodeId,
          target: logicNodeId,
          type: 'animatedFlow',
          animated: true,
        });
        warnings.push(`已自动添加条件判断节点 (置信度: ${Math.round(logicNodeCandidate.confidence * 100)}%)`);
        break;
        
      case 'parallel':
        nodes.push(createParallelNode(logicNodeId, logicNodeCandidate, 'fork'));
        edges.push({
          id: `edge-${previousNodeId}-${logicNodeId}`,
          source: previousNodeId,
          target: logicNodeId,
          type: 'animatedFlow',
          animated: true,
        });
        
        // 为并发节点创建分支
        const parallelConfig = logicNodeCandidate.suggestedConfig as { branches?: string[] };
        if (parallelConfig.branches && parallelConfig.branches.length > 0) {
          for (const branch of parallelConfig.branches.slice(0, 4)) {
            const branchId = createNodeId();
            nodes.push({
              id: branchId,
              type: 'placeholder',
              position: { x: 0, y: 0 },
              data: {
                id: branchId,
                name: `并行任务: ${branch}`,
                branchId: branch,
                isParallelBranch: true,
              },
            });
            edges.push({
              id: `edge-${logicNodeId}-parallel-${branchId}`,
              source: logicNodeId,
              sourceHandle: 'parallel-out',
              target: branchId,
              type: 'animatedFlow',
              animated: true,
            });
            logicBranchNodes.push(branchId);
          }
        }
        warnings.push(`已自动添加并发执行节点 (置信度: ${Math.round(logicNodeCandidate.confidence * 100)}%)`);
        break;
        
      case 'loop':
        nodes.push(createLoopNode(logicNodeId, logicNodeCandidate));
        edges.push({
          id: `edge-${previousNodeId}-${logicNodeId}`,
          source: previousNodeId,
          target: logicNodeId,
          type: 'animatedFlow',
          animated: true,
        });
        warnings.push(`已自动添加循环执行节点 (置信度: ${Math.round(logicNodeCandidate.confidence * 100)}%)`);
        break;
    }
    
    previousNodeId = logicNodeId;
  } else {
    // 回退到旧的条件提取逻辑
    const conditionResult = extractConditions(userDescription);
    
    if (conditionResult.hasCondition && conditionResult.conditions.length > 0) {
      const conditionNodeId = createNodeId();
      const rules = generateConditionRules(conditionResult.conditions);
      const branchActions = getBranchActions(conditionResult.conditions);
      
      nodes.push({
        id: conditionNodeId,
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          id: conditionNodeId,
          name: '条件判断',
          rules: rules,
          mode: 'simple',
          expression: `${rules[0]?.field} ${rules[0]?.operator === 'greater_than' ? '>' : rules[0]?.operator === 'less_than' ? '<' : '='} ${rules[0]?.value}`,
        },
      });
      
      edges.push({
        id: `edge-${previousNodeId}-${conditionNodeId}`,
        source: previousNodeId,
        target: conditionNodeId,
        type: 'animatedFlow',
        animated: true,
      });
      
      // Check if we need to add an MCP node for the true branch
      if (branchActions.trueAction) {
        const mcpInfo = inferMCPFromAction(branchActions.trueAction);
        if (mcpInfo) {
          const conditionTrueBranchId = createNodeId();
          nodes.push({
            id: conditionTrueBranchId,
            type: 'mcpAction',
            position: { x: 0, y: 0 },
            data: {
              id: conditionTrueBranchId,
              name: branchActions.trueAction,
              serverId: mcpInfo.serverId,
              toolName: mcpInfo.toolName,
              riskLevel: 'medium',
              triggeredByCondition: true,
            },
          });
          
          edges.push({
            id: `edge-${conditionNodeId}-true-${conditionTrueBranchId}`,
            source: conditionNodeId,
            sourceHandle: 'true-out',
            target: conditionTrueBranchId,
            type: 'animatedFlow',
            animated: true,
            style: { stroke: 'hsl(var(--success))' },
          });
          logicBranchNodes.push(conditionTrueBranchId);
        }
      }
      
      logicNodeId = conditionNodeId;
      previousNodeId = conditionNodeId;
      warnings.push('已自动添加条件判断节点，请确认条件表达式是否正确');
    }
  }

  // 6. 添加 Agent 核心节点
  const agentNodeId = createNodeId();
  nodes.push({
    id: agentNodeId,
    type: 'agent',
    position: { x: 0, y: 0 },
    data: {
      id: agentNodeId,
      name: agentName || plan.extractedIntent?.role || 'AI Agent',
      systemPrompt: systemPrompt || generateSystemPrompt(plan),
      model: 'google/gemini-2.5-flash',
      avatar: generateSmartAvatar(input.userDescription || plan.description || agentName || ''),
    },
  });
  
  edges.push({
    id: `edge-${previousNodeId}-${agentNodeId}`,
    source: previousNodeId,
    target: agentNodeId,
    type: 'animatedFlow',
    animated: true,
  });

  previousNodeId = agentNodeId;

  // 7. 添加输出节点
  const outputNodeId = createNodeId();
  nodes.push({
    id: outputNodeId,
    type: 'output',
    position: { x: 0, y: 0 },
    data: {
      id: outputNodeId,
      name: '输出响应',
      outputType: 'message',
    },
  });
  
  edges.push({
    id: `edge-${previousNodeId}-${outputNodeId}`,
    source: previousNodeId,
    target: outputNodeId,
    type: 'animatedFlow',
    animated: true,
  });

  // Connect logic branch nodes to output
  if (logicBranchNodes.length > 0) {
    for (const branchNodeId of logicBranchNodes) {
      edges.push({
        id: `edge-${branchNodeId}-${outputNodeId}`,
        source: branchNodeId,
        target: outputNodeId,
        type: 'animatedFlow',
        animated: true,
      });
    }
  }
  
  // If we have a logic node (condition type), also add false branch to output
  if (logicNodeId && nodes.find(n => n.id === logicNodeId)?.type === 'condition') {
    edges.push({
      id: `edge-${logicNodeId}-false-${outputNodeId}`,
      source: logicNodeId,
      sourceHandle: 'false-out',
      target: outputNodeId,
      type: 'animatedFlow',
      animated: true,
      style: { stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3,3' },
    });
  }

  // 8. 使用 Dagre 自动布局
  const layoutedNodes = applyDagreLayout(nodes, edges);

  // 9. 生成警告
  if (generatedSkills.length > 0) {
    warnings.push(`已自动生成 ${generatedSkills.length} 个技能，建议在部署前进行验证`);
  }
  if (existingAssets.filter(a => a.action === 'generate').length > 0) {
    warnings.push('部分功能需要生成新技能以完成');
  }

  return {
    nodes: layoutedNodes,
    edges,
    agentConfig: {
      name: agentName || plan.extractedIntent?.role || 'AI Agent',
      systemPrompt: systemPrompt || generateSystemPrompt(plan),
      model: 'google/gemini-2.5-flash',
      avatar: generateSmartAvatar(input.userDescription || plan.description || agentName || ''),
      department: plan.extractedIntent?.category,
    },
    warnings,
  };
}

/**
 * 判断是否需要确认
 */
function shouldRequireConfirmation(asset: AssetMatch, policy: MPLPPolicy): boolean {
  const riskLevel = inferRiskLevel(asset);
  return RISK_CONFIRMATION_MAP[policy].has(riskLevel);
}

/**
 * 推断资产风险等级
 */
function inferRiskLevel(asset: AssetMatch): string {
  const name = asset.name.toLowerCase();
  
  // 高风险关键词
  if (/delete|remove|payment|transfer|execute|admin/.test(name)) {
    return 'high';
  }
  
  // 中风险关键词
  if (/update|modify|send|create|api|external/.test(name)) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * 生成系统提示词 - 带安全边界
 */
function generateSystemPrompt(plan: BuildPlan): string {
  const intent = plan.extractedIntent;
  const mplpPolicy = 'default'; // 可从 plan 中获取
  
  if (!intent) {
    // 使用安全模板生成默认提示词
    return generateSecureSystemPrompt('智能助手', ['帮助用户完成各类任务'], mplpPolicy);
  }

  // 使用安全模板生成带边界的提示词
  const capabilities = [
    ...intent.actions,
    ...(intent.requiredCapabilities || [])
  ];
  
  return generateSecureSystemPrompt(intent.role, capabilities, mplpPolicy);
}

/**
 * 使用 Dagre 进行自动布局
 */
function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });
}

// ========== 逻辑节点创建辅助函数 ==========

/**
 * 创建意图路由器节点
 */
function createIntentRouterNode(id: string, candidate: LogicNodeCandidate): Node {
  const config = candidate.suggestedConfig as { routes?: Array<{ id: string; name: string; keywords: string[] }>; mode?: string };
  return {
    id,
    type: 'intentRouter',
    position: { x: 0, y: 0 },
    data: {
      id,
      name: candidate.name,
      mode: config.mode || 'semantic',
      routes: config.routes || [],
      confidence: candidate.confidence,
      matchReason: candidate.matchReason,
    },
  };
}

/**
 * 创建条件判断节点
 */
function createConditionNode(id: string, candidate: LogicNodeCandidate): Node {
  const config = candidate.suggestedConfig as { rules?: Array<{ field: string; operator: string; value: unknown }>; expression?: string };
  return {
    id,
    type: 'condition',
    position: { x: 0, y: 0 },
    data: {
      id,
      name: candidate.name,
      mode: 'simple',
      rules: config.rules || [],
      expression: config.expression || '',
      confidence: candidate.confidence,
      matchReason: candidate.matchReason,
    },
  };
}

/**
 * 创建并发执行节点
 */
function createParallelNode(id: string, candidate: LogicNodeCandidate, mode: 'fork' | 'join' = 'fork'): Node {
  const config = candidate.suggestedConfig as { branches?: string[]; waitAll?: boolean };
  return {
    id,
    type: 'parallel',
    position: { x: 0, y: 0 },
    data: {
      id,
      name: candidate.name,
      mode,
      branches: config.branches || [],
      waitAll: config.waitAll ?? true,
      confidence: candidate.confidence,
      matchReason: candidate.matchReason,
    },
  };
}

/**
 * 创建循环执行节点
 */
function createLoopNode(id: string, candidate: LogicNodeCandidate): Node {
  const config = candidate.suggestedConfig as { iteratorVariable?: string; collectionExpression?: string; maxIterations?: number };
  return {
    id,
    type: 'loop',
    position: { x: 0, y: 0 },
    data: {
      id,
      name: candidate.name,
      mode: 'start',
      iteratorVariable: config.iteratorVariable || 'item',
      collectionExpression: config.collectionExpression || '{{items}}',
      maxIterations: config.maxIterations || 100,
      confidence: candidate.confidence,
      matchReason: candidate.matchReason,
    },
  };
}

// ========== Phase 3: OpenCode 工作流组装 ==========

export type ProgrammingTaskType = 'generation' | 'modification' | 'bugfix' | 'development';

interface OpenCodeWorkflowInput {
  plan: BuildPlan;
  programmingContext: {
    taskType: ProgrammingTaskType;
    confidence: number;
    matchReason: string;
  };
  mplpPolicy: MPLPPolicy;
  agentName?: string;
  includeTestRunner?: boolean;
}

interface OpenCodeWorkflowOutput {
  nodes: Node[];
  edges: Edge[];
  metadata: {
    kernelSkillId: string;
    programmingContext: OpenCodeWorkflowInput['programmingContext'];
    workflowType: 'opencode-dual-mode';
  };
}

/**
 * 组装 OpenCode 双模式工作流 (Phase 3)
 */
export function assembleOpenCodeWorkflow(
  input: OpenCodeWorkflowInput
): OpenCodeWorkflowOutput {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeIndex = 0;
  
  const createNodeId = () => `opencode-node-${nodeIndex++}`;
  
  // 1. Trigger 节点
  const triggerId = createNodeId();
  nodes.push({
    id: triggerId,
    type: 'trigger',
    position: { x: 0, y: 0 },
    data: {
      id: triggerId,
      name: '编程请求',
      triggerType: 'message',
      programmingTaskType: input.programmingContext.taskType,
    },
  });
  
  // 2. PLAN Agent 节点
  const planId = createNodeId();
  nodes.push({
    id: planId,
    type: 'opencode_plan',
    position: { x: 0, y: 0 },
    data: {
      id: planId,
      name: 'OpenCode PLAN',
      mode: 'plan',
      kernelSkillId: 'core-opencode',
      description: '代码浏览与修改计划生成 (只读模式)',
      taskType: input.programmingContext.taskType,
    },
  });
  edges.push({
    id: `edge-${triggerId}-${planId}`,
    source: triggerId,
    target: planId,
    type: 'animatedFlow',
    animated: true,
  });
  
  // 3. MPLP 确认节点
  const confirmId = createNodeId();
  nodes.push({
    id: confirmId,
    type: 'intervention',
    position: { x: 0, y: 0 },
    data: {
      id: confirmId,
      name: 'MPLP 确认',
      interventionType: 'approval',
      description: '确认代码修改计划',
      mplpPolicy: input.mplpPolicy,
      requiresApproval: true,
    },
  });
  edges.push({
    id: `edge-${planId}-${confirmId}`,
    source: planId,
    target: confirmId,
    type: 'animatedFlow',
    animated: true,
  });
  
  // 4. BUILD Agent 节点
  const buildId = createNodeId();
  nodes.push({
    id: buildId,
    type: 'opencode_build',
    position: { x: 0, y: 0 },
    data: {
      id: buildId,
      name: 'OpenCode BUILD',
      mode: 'build',
      kernelSkillId: 'core-opencode',
      description: '执行代码变更 (读写模式)',
      taskType: input.programmingContext.taskType,
    },
  });
  edges.push({
    id: `edge-${confirmId}-${buildId}`,
    source: confirmId,
    target: buildId,
    sourceHandle: 'approved',
    type: 'animatedFlow',
    animated: true,
    style: { stroke: 'hsl(var(--success))' },
  });
  
  // 回退到 PLAN 的边
  edges.push({
    id: `edge-${confirmId}-${planId}-rejected`,
    source: confirmId,
    target: planId,
    sourceHandle: 'rejected',
    type: 'animatedFlow',
    animated: true,
    style: { stroke: 'hsl(var(--warning))', strokeDasharray: '5,5' },
  });
  
  // 5. 风格检查节点
  const styleCheckId = createNodeId();
  nodes.push({
    id: styleCheckId,
    type: 'style_check',
    position: { x: 0, y: 0 },
    data: {
      id: styleCheckId,
      name: '风格检查',
      description: 'OpenCode 风格规范验证',
      kernelSkillId: 'core-opencode',
    },
  });
  edges.push({
    id: `edge-${buildId}-${styleCheckId}`,
    source: buildId,
    target: styleCheckId,
    type: 'animatedFlow',
    animated: true,
  });
  
  // 风格检查失败回到 BUILD 的边
  edges.push({
    id: `edge-${styleCheckId}-${buildId}-violations`,
    source: styleCheckId,
    target: buildId,
    sourceHandle: 'violations_found',
    type: 'animatedFlow',
    animated: true,
    style: { stroke: 'hsl(var(--destructive))', strokeDasharray: '5,5' },
  });
  
  // 6. 可选: 测试运行器节点
  if (input.includeTestRunner || 
      input.programmingContext.taskType === 'bugfix' || 
      input.programmingContext.taskType === 'development') {
    const testId = createNodeId();
    nodes.push({
      id: testId,
      type: 'test_runner',
      position: { x: 0, y: 0 },
      data: {
        id: testId,
        name: '测试运行',
        description: '验证代码正确性',
        runOnSuccess: true,
      },
    });
    edges.push({
      id: `edge-${styleCheckId}-${testId}`,
      source: styleCheckId,
      target: testId,
      sourceHandle: 'passed',
      type: 'animatedFlow',
      animated: true,
      style: { stroke: 'hsl(var(--success))' },
    });
  }
  
  return {
    nodes,
    edges,
    metadata: {
      kernelSkillId: 'core-opencode',
      programmingContext: input.programmingContext,
      workflowType: 'opencode-dual-mode',
    },
  };
}
