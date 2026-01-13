// =====================================================
// 工作流生成器 Edge Function
// Workflow Generator - AI 驱动的工作流 DSL 生成
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  description: string;
  userId: string;
  mplpPolicy?: 'permissive' | 'default' | 'strict';
  includeKnowledge?: boolean;
  maxNodes?: number;
}

interface WorkflowDSL {
  version: '1.0';
  name: string;
  description?: string;
  trigger: { type: string; config?: Record<string, unknown> };
  stages: StageSpec[];
  governance?: { mplpPolicy: string; auditLogging: boolean };
}

interface StageSpec {
  id: string;
  name: string;
  type: 'sequential' | 'parallel' | 'conditional';
  nodes: NodeSpec[];
  branches?: BranchSpec[];
}

interface NodeSpec {
  id: string;
  type: string;
  name: string;
  description?: string;
  assetId?: string;
  assetType?: string;
  config: Record<string, unknown>;
  inputMappings: Array<{ targetField: string; sourceExpression: string }>;
  outputKey: string;
  riskLevel?: string;
}

interface BranchSpec {
  id: string;
  name: string;
  condition: string;
  nodes: NodeSpec[];
  isDefault?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: GenerateRequest = await req.json();
    const {
      description,
      userId,
      mplpPolicy = 'default',
      includeKnowledge = true,
      maxNodes = 10,
    } = request;

    if (!description || !userId) {
      return new Response(
        JSON.stringify({ error: "description and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. 搜索相关资产
    const assetsResponse = await searchRelevantAssets(supabase, description, userId);
    
    // 2. 生成工作流 DSL
    const dsl = await generateWorkflowDSL(
      description,
      assetsResponse,
      mplpPolicy,
      maxNodes
    );

    // 3. 验证并注入策略
    const validatedDSL = validateAndEnhanceDSL(dsl, mplpPolicy);

    return new Response(
      JSON.stringify({
        dsl: validatedDSL,
        suggestedAssets: assetsResponse,
        warnings: validatedDSL.warnings || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========== 搜索相关资产 ==========

interface SkillRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

interface KnowledgeBaseRow {
  id: string;
  name: string;
  description: string | null;
}

interface AssetRow {
  id: string;
  asset_type: string;
  asset_id: string;
  name: string;
  description: string | null;
  capabilities: string[] | null;
  is_active: boolean;
}

interface AssetSearchResult {
  skills: Array<{ id: string; name: string; description?: string; capabilities: string[] }>;
  mcpTools: Array<{ id: string; name: string; description?: string; capabilities: string[] }>;
  knowledgeBases: Array<{ id: string; name: string; description?: string }>;
}

// deno-lint-ignore no-explicit-any
async function searchRelevantAssets(
  supabase: any,
  description: string,
  userId: string
): Promise<AssetSearchResult> {
  // 从语义索引搜索
  const { data: assets } = await supabase
    .from('asset_semantic_index')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(50) as { data: AssetRow[] | null };

  if (!assets || assets.length === 0) {
    // 如果没有索引，直接查询原表
    const { data: skills } = await supabase
      .from('skills')
      .select('id, name, description, category')
      .eq('author_id', userId)
      .limit(20) as { data: SkillRow[] | null };

    const { data: kbs } = await supabase
      .from('knowledge_bases')
      .select('id, name, description')
      .eq('user_id', userId)
      .limit(10) as { data: KnowledgeBaseRow[] | null };

    return {
      skills: (skills || []).map((s: SkillRow) => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        capabilities: [],
      })),
      mcpTools: [],
      knowledgeBases: (kbs || []).map((k: KnowledgeBaseRow) => ({
        id: k.id,
        name: k.name,
        description: k.description || undefined,
      })),
    };
  }

  // 简单文本匹配排序
  const descLower = description.toLowerCase();
  const scored = assets.map((a: AssetRow) => ({
    ...a,
    score: calculateRelevance({ name: a.name, description: a.description, capabilities: a.capabilities }, descLower),
  })).sort((x, y) => y.score - x.score);

  return {
    skills: scored
      .filter(a => a.asset_type === 'skill')
      .slice(0, 10)
      .map(a => ({
        id: a.asset_id,
        name: a.name,
        description: a.description || undefined,
        capabilities: a.capabilities || [],
      })),
    mcpTools: scored
      .filter(a => a.asset_type === 'mcp_tool')
      .slice(0, 10)
      .map(a => ({
        id: a.asset_id,
        name: a.name,
        description: a.description || undefined,
        capabilities: a.capabilities || [],
      })),
    knowledgeBases: scored
      .filter(a => a.asset_type === 'knowledge_base')
      .slice(0, 5)
      .map(a => ({
        id: a.asset_id,
        name: a.name,
        description: a.description || undefined,
      })),
  };
}

function calculateRelevance(asset: { name: string; description: string | null; capabilities: string[] | null }, query: string): number {
  let score = 0;
  const name = (asset.name || '').toLowerCase();
  const desc = (asset.description || '').toLowerCase();
  const caps = asset.capabilities || [];

  const words = query.split(/\s+/).filter(w => w.length > 1);
  
  for (const word of words) {
    if (name.includes(word)) score += 3;
    if (desc.includes(word)) score += 1;
    if (caps.some(c => c.toLowerCase().includes(word))) score += 2;
  }

  return score;
}

// ========== 生成工作流 DSL ==========

async function generateWorkflowDSL(
  description: string,
  assets: AssetSearchResult,
  mplpPolicy: string,
  maxNodes: number
): Promise<WorkflowDSL> {
  // 分析描述，提取意图
  const analysis = analyzeDescription(description);

  // 构建基础 DSL
  const dsl: WorkflowDSL = {
    version: '1.0',
    name: analysis.agentName,
    description: description,
    trigger: {
      type: analysis.triggerType,
    },
    stages: [],
    governance: {
      mplpPolicy,
      auditLogging: true,
    },
  };

  // 构建主阶段
  const mainStage: StageSpec = {
    id: 'main-stage',
    name: '主处理流程',
    type: analysis.needsConditional ? 'conditional' : 'sequential',
    nodes: [],
  };

  let nodeIndex = 0;

  // 如果需要知识检索，添加知识库节点
  if (analysis.needsKnowledge && assets.knowledgeBases.length > 0) {
    const kb = assets.knowledgeBases[0];
    mainStage.nodes.push({
      id: `node-${nodeIndex++}`,
      type: 'knowledge',
      name: `检索 ${kb.name}`,
      assetId: kb.id,
      assetType: 'knowledge_base',
      config: {
        retrievalMode: 'hybrid',
        topK: 5,
      },
      inputMappings: [{
        targetField: 'query',
        sourceExpression: '{{trigger.message}}',
      }],
      outputKey: 'knowledge_context',
    });
  }

  // 添加相关 Skills
  for (const skill of assets.skills.slice(0, Math.min(3, maxNodes - mainStage.nodes.length))) {
    if (isSkillRelevant(skill, analysis)) {
      mainStage.nodes.push({
        id: `node-${nodeIndex++}`,
        type: 'skill',
        name: skill.name,
        assetId: skill.id,
        assetType: 'skill',
        config: {},
        inputMappings: mainStage.nodes.length > 0 
          ? [{ targetField: 'input', sourceExpression: `{{${mainStage.nodes[mainStage.nodes.length - 1].outputKey}}}` }]
          : [{ targetField: 'input', sourceExpression: '{{trigger.message}}' }],
        outputKey: `skill_${skill.name.toLowerCase().replace(/\s+/g, '_')}`,
        riskLevel: assessNodeRisk(skill.name, skill.capabilities),
      });
    }
  }

  // 添加 MCP Tools
  for (const mcp of assets.mcpTools.slice(0, Math.min(2, maxNodes - mainStage.nodes.length))) {
    if (isMCPRelevant(mcp, analysis)) {
      mainStage.nodes.push({
        id: `node-${nodeIndex++}`,
        type: 'mcp_action',
        name: mcp.name,
        assetId: mcp.id,
        assetType: 'mcp_tool',
        config: {},
        inputMappings: mainStage.nodes.length > 0
          ? [{ targetField: 'params', sourceExpression: `{{${mainStage.nodes[mainStage.nodes.length - 1].outputKey}}}` }]
          : [{ targetField: 'params', sourceExpression: '{{trigger.message}}' }],
        outputKey: `mcp_${mcp.name.toLowerCase().replace(/\s+/g, '_')}`,
        riskLevel: assessNodeRisk(mcp.name, mcp.capabilities),
      });
    }
  }

  // 添加 Agent 节点
  mainStage.nodes.push({
    id: `node-${nodeIndex++}`,
    type: 'agent',
    name: analysis.agentName,
    config: {
      systemPrompt: generateSystemPrompt(analysis, assets),
      model: 'google/gemini-2.5-flash',
      temperature: 0.7,
    },
    inputMappings: buildAgentInputMappings(mainStage.nodes),
    outputKey: 'agent_response',
  });

  // 如果需要条件分支
  if (analysis.needsConditional && analysis.conditions.length > 0) {
    mainStage.branches = analysis.conditions.map((cond, idx) => ({
      id: `branch-${idx}`,
      name: cond.name,
      condition: cond.expression,
      nodes: [],
      isDefault: idx === analysis.conditions.length - 1,
    }));
  }

  dsl.stages.push(mainStage);

  return dsl;
}

// ========== 描述分析 ==========

interface DescriptionAnalysis {
  agentName: string;
  triggerType: 'user_message' | 'webhook' | 'schedule';
  needsKnowledge: boolean;
  needsConditional: boolean;
  conditions: Array<{ name: string; expression: string }>;
  intents: string[];
  capabilities: string[];
}

function analyzeDescription(description: string): DescriptionAnalysis {
  const descLower = description.toLowerCase();

  // 提取 Agent 名称
  const nameMatch = description.match(/(?:创建|构建|生成)(?:一个)?(.+?)(?:助手|机器人|Agent|智能体)/);
  const agentName = nameMatch ? nameMatch[1].trim() : '智能助手';

  // 判断触发类型
  let triggerType: 'user_message' | 'webhook' | 'schedule' = 'user_message';
  if (/定时|每天|每周|cron|schedule/i.test(descLower)) {
    triggerType = 'schedule';
  } else if (/webhook|api调用|外部触发/i.test(descLower)) {
    triggerType = 'webhook';
  }

  // 判断是否需要知识库
  const needsKnowledge = /知识|文档|检索|搜索|查询|rag|问答|faq/i.test(descLower);

  // 判断是否需要条件分支
  const needsConditional = /如果|当|根据|判断|条件|分类|路由/i.test(descLower);

  // 提取条件
  const conditions: Array<{ name: string; expression: string }> = [];
  if (needsConditional) {
    // 简单条件提取
    const condPatterns = [
      { pattern: /如果.*用户.*询问.*(.+?)，/, name: '用户询问' },
      { pattern: /当.*(.+?)时/, name: '条件匹配' },
    ];
    for (const { pattern, name } of condPatterns) {
      const match = description.match(pattern);
      if (match) {
        conditions.push({
          name: `${name}: ${match[1]}`,
          expression: `{{agent_response.intent}} === "${match[1]}"`,
        });
      }
    }
    // 添加默认分支
    if (conditions.length > 0) {
      conditions.push({ name: '其他情况', expression: 'true' });
    }
  }

  // 提取意图
  const intents: string[] = [];
  const intentPatterns = ['查询', '发送', '生成', '分析', '存储', '删除', '更新', '通知'];
  for (const intent of intentPatterns) {
    if (descLower.includes(intent)) {
      intents.push(intent);
    }
  }

  return {
    agentName,
    triggerType,
    needsKnowledge,
    needsConditional,
    conditions,
    intents,
    capabilities: intents,
  };
}

// ========== 辅助函数 ==========

function isSkillRelevant(
  skill: { name: string; capabilities: string[] },
  analysis: DescriptionAnalysis
): boolean {
  const nameLower = skill.name.toLowerCase();
  return analysis.intents.some(intent => 
    nameLower.includes(intent) || skill.capabilities.some(c => c.includes(intent))
  );
}

function isMCPRelevant(
  mcp: { name: string; capabilities: string[] },
  analysis: DescriptionAnalysis
): boolean {
  return isSkillRelevant(mcp, analysis);
}

function assessNodeRisk(name: string, capabilities: string[]): string {
  const text = `${name} ${capabilities.join(' ')}`.toLowerCase();
  if (/delete|payment|transfer/i.test(text)) return 'high';
  if (/update|send|modify/i.test(text)) return 'medium';
  return 'low';
}

function generateSystemPrompt(
  analysis: DescriptionAnalysis,
  assets: { skills: unknown[]; mcpTools: unknown[]; knowledgeBases: unknown[] }
): string {
  let prompt = `你是${analysis.agentName}，一个专业的AI助手。\n\n`;
  
  if (analysis.intents.length > 0) {
    prompt += `你的核心能力包括：${analysis.intents.join('、')}。\n\n`;
  }
  
  if (assets.knowledgeBases.length > 0) {
    prompt += '你可以访问知识库来获取准确信息。\n';
  }
  
  if (assets.skills.length > 0) {
    prompt += '你可以调用多种技能来完成任务。\n';
  }
  
  prompt += '\n请友好、专业地与用户交流，提供准确有用的帮助。';
  
  return prompt;
}

function buildAgentInputMappings(precedingNodes: NodeSpec[]): Array<{ targetField: string; sourceExpression: string }> {
  const mappings: Array<{ targetField: string; sourceExpression: string }> = [
    { targetField: 'user_message', sourceExpression: '{{trigger.message}}' },
  ];

  // 添加前序节点的输出作为上下文
  const contextParts: string[] = [];
  for (const node of precedingNodes) {
    if (node.type === 'knowledge') {
      mappings.push({ targetField: 'knowledge_context', sourceExpression: `{{${node.outputKey}.context}}` });
    } else {
      contextParts.push(`{{${node.outputKey}}}`);
    }
  }

  if (contextParts.length > 0) {
    mappings.push({ targetField: 'context', sourceExpression: contextParts.join(', ') });
  }

  return mappings;
}

function validateAndEnhanceDSL(dsl: WorkflowDSL, mplpPolicy: string): WorkflowDSL & { warnings: string[] } {
  const warnings: string[] = [];

  // 检查高风险节点
  for (const stage of dsl.stages) {
    for (const node of stage.nodes) {
      if (node.riskLevel === 'high') {
        warnings.push(`节点 "${node.name}" 被标记为高风险操作，建议添加确认步骤`);
      }
    }
  }

  // 确保有治理策略
  if (!dsl.governance) {
    dsl.governance = { mplpPolicy, auditLogging: true };
  }

  return { ...dsl, warnings };
}
