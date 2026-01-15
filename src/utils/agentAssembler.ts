// =====================================================
// 多模态组装算法
// Agent Assembler - Multi-modal Assembly Engine
// =====================================================

import { Node, Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { BuildPlan, GeneratedSkillSpec, KnowledgeBaseSuggestion, AssetMatch } from '@/types/buildPlan';
import type { MPLPPolicy } from '@/types/workflowDSL';
import { 
  extractConditions, 
  needsConditionNode, 
  generateConditionRules,
  getBranchActions,
  inferMCPFromAction,
  type ExtractedCondition 
} from './intentConditionExtractor';

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

  // 5.5 检测并添加条件节点 (如果用户描述包含条件逻辑)
  const userDescription = input.userDescription || plan.description || '';
  const conditionResult = extractConditions(userDescription);
  
  let conditionNodeId: string | null = null;
  let conditionTrueBranchId: string | null = null;
  
  if (conditionResult.hasCondition && conditionResult.conditions.length > 0) {
    conditionNodeId = createNodeId();
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
        conditionTrueBranchId = createNodeId();
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
        
        // True branch to MCP action
        edges.push({
          id: `edge-${conditionNodeId}-true-${conditionTrueBranchId}`,
          source: conditionNodeId,
          sourceHandle: 'true-out',
          target: conditionTrueBranchId,
          type: 'animatedFlow',
          animated: true,
          style: { stroke: 'hsl(var(--success))' },
        });
      }
    }
    
    previousNodeId = conditionNodeId;
    warnings.push('已自动添加条件判断节点，请确认条件表达式是否正确');
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
      avatar: { iconId: 'bot', colorId: 'primary' },
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

  // If we have a condition with true branch, also connect true branch to output
  if (conditionTrueBranchId) {
    edges.push({
      id: `edge-${conditionTrueBranchId}-${outputNodeId}`,
      source: conditionTrueBranchId,
      target: outputNodeId,
      type: 'animatedFlow',
      animated: true,
    });
  }
  
  // If we have a condition, also add false branch to output
  if (conditionNodeId) {
    edges.push({
      id: `edge-${conditionNodeId}-false-${outputNodeId}`,
      source: conditionNodeId,
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
      avatar: { iconId: 'bot', colorId: 'primary' },
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
 * 生成系统提示词
 */
function generateSystemPrompt(plan: BuildPlan): string {
  const intent = plan.extractedIntent;
  if (!intent) {
    return '你是一个智能助手，请帮助用户完成任务。';
  }

  return `你是一个${intent.role}。

你的主要能力包括：
${intent.actions.map(a => `- ${a}`).join('\n')}

${intent.requiredCapabilities.length > 0 ? `你擅长：
${intent.requiredCapabilities.map(c => `- ${c}`).join('\n')}` : ''}

请始终保持专业、友好的态度，确保完成用户的请求。`;
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
