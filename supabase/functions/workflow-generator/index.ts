// =====================================================
// 工作流生成器 Edge Function - 增强版
// Workflow Generator - AI 驱动的工作流 DSL 生成
// 支持智能参数提取 + 增强 Meta-Prompt
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
  metadata?: { category?: string; extractedParams?: ExtractedParams };
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
  requiresConfirmation?: boolean;
  isGenerated?: boolean;  // 标记为 AI 即时生成的节点
  generatedAt?: string;   // 生成时间戳
}

interface BranchSpec {
  id: string;
  name: string;
  condition: string;
  nodes: NodeSpec[];
  isDefault?: boolean;
}

// ========== Gap Analysis 类型 ==========

interface GapAnalysisResult {
  coverageScore: number;
  missingCapabilities: string[];
  suggestedSkills: SkillSuggestion[];
  suggestedKnowledgeBases: KnowledgeBaseSuggestion[];
}

interface SkillSuggestion {
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  reason: string;
}

interface KnowledgeBaseSuggestion {
  id: string;
  name: string;
  description?: string;
  intentTags: string[];
  contextHook?: string;
  matchScore: number;
}

// ========== 参数提取类型 ==========

interface ExtractedParams {
  cronExpression?: string;
  emailRecipients?: string[];
  webhookUrl?: string;
  thresholds?: Record<string, number>;
  timeReferences?: string[];
}

// ========== 星期映射 ==========

const DAY_MAP: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0,
  'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 0,
};

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

    // 0. 提取参数
    const extractedParams = extractParamsFromDescription(description);

    // 1. 搜索相关资产
    const assetsResponse = await searchRelevantAssets(supabase, description, userId);
    
    // 2. 缺口分析 (Gap Detection) - The Architect 核心能力
    const gapAnalysis = await analyzeAssetGaps(description, assetsResponse);
    
    // 3. 即时技能生成 (如果覆盖度低于阈值)
    const generatedSkillNodes: NodeSpec[] = [];
    if (gapAnalysis.coverageScore < 0.6 && gapAnalysis.suggestedSkills.length > 0) {
      for (const suggestion of gapAnalysis.suggestedSkills.slice(0, 3)) {
        const generatedNode = createGeneratedSkillNode(suggestion);
        generatedSkillNodes.push(generatedNode);
      }
    }
    
    // 4. 知识库自动匹配
    const autoMountedKBs = await matchKnowledgeBasesForContext(supabase, description, userId, assetsResponse);

    // 5. 生成工作流 DSL (包含生成的技能和自动挂载的知识库)
    const dsl = await generateWorkflowDSL(
      description,
      assetsResponse,
      mplpPolicy,
      maxNodes,
      extractedParams,
      generatedSkillNodes,
      autoMountedKBs
    );

    // 6. 验证并注入策略
    const validatedDSL = validateAndEnhanceDSL(dsl, mplpPolicy, extractedParams);

    return new Response(
      JSON.stringify({
        dsl: validatedDSL,
        suggestedAssets: {
          ...assetsResponse,
          generatedSkills: generatedSkillNodes,
          autoMountedKBs,
        },
        warnings: validatedDSL.warnings || [],
        extractedParams,
        gapAnalysis,
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

// ========== 参数提取函数 ==========

function extractParamsFromDescription(description: string): ExtractedParams {
  const params: ExtractedParams = {};

  // 1. 提取 Cron 表达式
  const cronPatterns: Array<{ pattern: RegExp; cron: (match: RegExpMatchArray) => string }> = [
    { pattern: /每天(\d{1,2})点/i, cron: (m) => `0 ${m[1]} * * *` },
    { pattern: /每(?:天|日)(?:上午|下午)?(\d{1,2})[点:时](\d{0,2})?/i, cron: (m) => `${m[2] || '0'} ${m[1]} * * *` },
    { pattern: /每周([一二三四五六日天])/i, cron: (m) => `0 9 * * ${DAY_MAP[m[1]] ?? 1}` },
    { pattern: /每周([一二三四五六日天])(\d{1,2})点/i, cron: (m) => `0 ${m[2]} * * ${DAY_MAP[m[1]] ?? 1}` },
    { pattern: /每周([一二三四五六日天])(?:上午|下午)?(\d{1,2})[点:时](\d{0,2})?/i, cron: (m) => `${m[3] || '0'} ${m[2]} * * ${DAY_MAP[m[1]] ?? 1}` },
    { pattern: /每小时/i, cron: () => '0 * * * *' },
    { pattern: /每(\d+)分钟/i, cron: (m) => `*/${m[1]} * * * *` },
    { pattern: /每月(\d{1,2})号/i, cron: (m) => `0 9 ${m[1]} * *` },
  ];

  for (const { pattern, cron } of cronPatterns) {
    const match = description.match(pattern);
    if (match) {
      params.cronExpression = cron(match);
      break;
    }
  }

  // 2. 提取邮件地址
  const emailRegex = /[\w.\-+]+@[\w.\-]+\.\w+/g;
  const emails = description.match(emailRegex);
  if (emails && emails.length > 0) {
    params.emailRecipients = [...new Set(emails)];
  }

  // 3. 提取 Webhook URL
  const urlRegex = /https?:\/\/[\w./\-?=&#%]+/gi;
  const urls = description.match(urlRegex);
  if (urls && urls.length > 0) {
    params.webhookUrl = urls[0];
  }

  // 4. 提取数值阈值
  const thresholdPatterns = [
    { pattern: /超过(\d+)次/i, key: 'countThreshold' },
    { pattern: /大于(\d+)/i, key: 'valueThreshold' },
    { pattern: /(\d+)%/i, key: 'percentThreshold' },
    { pattern: /(\d+)分钟内/i, key: 'timeWindowMinutes' },
  ];

  params.thresholds = {};
  for (const { pattern, key } of thresholdPatterns) {
    const match = description.match(pattern);
    if (match) {
      params.thresholds[key] = parseInt(match[1], 10);
    }
  }

  // 5. 提取时间引用
  const timeRefs: string[] = [];
  if (/上午/i.test(description)) timeRefs.push('morning');
  if (/下午/i.test(description)) timeRefs.push('afternoon');
  if (/晚上/i.test(description)) timeRefs.push('evening');
  if (/工作日/i.test(description)) timeRefs.push('weekday');
  if (/周末/i.test(description)) timeRefs.push('weekend');
  if (timeRefs.length > 0) {
    params.timeReferences = timeRefs;
  }

  return params;
}

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
  risk_level: string | null;
}

interface AssetSearchResult {
  skills: Array<{ id: string; name: string; description?: string; capabilities: string[]; riskLevel?: string }>;
  mcpTools: Array<{ id: string; name: string; description?: string; capabilities: string[]; riskLevel?: string }>;
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
        riskLevel: a.risk_level || 'low',
      })),
    mcpTools: scored
      .filter(a => a.asset_type === 'mcp_tool')
      .slice(0, 10)
      .map(a => ({
        id: a.asset_id,
        name: a.name,
        description: a.description || undefined,
        capabilities: a.capabilities || [],
        riskLevel: a.risk_level || 'low',
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
  maxNodes: number,
  extractedParams: ExtractedParams,
  generatedSkillNodes: NodeSpec[] = [],
  autoMountedKBs: KnowledgeBaseSuggestion[] = []
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
      config: {},
    },
    stages: [],
    governance: {
      mplpPolicy,
      auditLogging: true,
    },
    metadata: {
      category: analysis.category,
      extractedParams,
    },
  };

  // 应用提取的参数到触发器
  if (analysis.triggerType === 'schedule' && extractedParams.cronExpression) {
    dsl.trigger.config = { cronExpression: extractedParams.cronExpression };
  } else if (analysis.triggerType === 'webhook' && extractedParams.webhookUrl) {
    dsl.trigger.config = { webhookUrl: extractedParams.webhookUrl };
  }

  // 构建主阶段
  const mainStage: StageSpec = {
    id: 'main-stage',
    name: '主处理流程',
    type: analysis.needsConditional ? 'conditional' : 'sequential',
    nodes: [],
  };

  let nodeIndex = 0;

  // 如果需要知识检索，添加知识库节点（优先使用自动匹配的知识库）
  const knowledgeBases = autoMountedKBs.length > 0 
    ? autoMountedKBs.map(kb => ({ id: kb.id, name: kb.name, description: kb.description }))
    : assets.knowledgeBases;

  if (analysis.needsKnowledge && knowledgeBases.length > 0) {
    const kb = knowledgeBases[0];
    const isAutoMounted = autoMountedKBs.some(akb => akb.id === kb.id);
    mainStage.nodes.push({
      id: `node-${nodeIndex++}`,
      type: 'knowledge',
      name: `检索 ${kb.name}`,
      assetId: kb.id,
      assetType: 'knowledge_base',
      config: {
        retrievalMode: 'hybrid',
        topK: 5,
        isAutoMounted,
      },
      inputMappings: [{
        targetField: 'query',
        sourceExpression: '{{trigger.message}}',
      }],
      outputKey: 'knowledge_context',
    });
  }

  // 添加 AI 即时生成的技能节点
  for (const generatedNode of generatedSkillNodes.slice(0, Math.min(2, maxNodes - mainStage.nodes.length))) {
    mainStage.nodes.push({
      ...generatedNode,
      id: `node-${nodeIndex++}`,
      inputMappings: mainStage.nodes.length > 0 
        ? [{ targetField: 'input', sourceExpression: `{{${mainStage.nodes[mainStage.nodes.length - 1].outputKey}}}` }]
        : [{ targetField: 'input', sourceExpression: '{{trigger.message}}' }],
    });
  }

  // 添加相关 Skills
  for (const skill of assets.skills.slice(0, Math.min(3, maxNodes - mainStage.nodes.length))) {
    if (isSkillRelevant(skill, analysis)) {
      const riskLevel = skill.riskLevel || assessNodeRisk(skill.name, skill.capabilities);
      const requiresConfirmation = shouldRequireConfirmation(riskLevel, mplpPolicy);
      
      const node: NodeSpec = {
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
        riskLevel,
        requiresConfirmation,
      };

      // 应用提取的参数
      applyExtractedParams(node, extractedParams, skill.name);
      mainStage.nodes.push(node);
    }
  }

  // 添加 MCP Tools
  for (const mcp of assets.mcpTools.slice(0, Math.min(2, maxNodes - mainStage.nodes.length))) {
    if (isMCPRelevant(mcp, analysis)) {
      const riskLevel = mcp.riskLevel || assessNodeRisk(mcp.name, mcp.capabilities);
      const requiresConfirmation = shouldRequireConfirmation(riskLevel, mplpPolicy);
      
      const node: NodeSpec = {
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
        riskLevel,
        requiresConfirmation,
      };

      // 应用提取的参数
      applyExtractedParams(node, extractedParams, mcp.name);
      mainStage.nodes.push(node);
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

// ========== 应用提取的参数到节点 ==========

function applyExtractedParams(node: NodeSpec, params: ExtractedParams, nodeName: string): void {
  const nameLower = nodeName.toLowerCase();

  // 邮件相关节点
  if (/邮件|email|mail|send|通知/i.test(nameLower)) {
    if (params.emailRecipients && params.emailRecipients.length > 0) {
      node.config.recipients = params.emailRecipients;
      node.config.to = params.emailRecipients[0];
    }
  }

  // 定时相关节点
  if (/定时|schedule|cron|timer/i.test(nameLower)) {
    if (params.cronExpression) {
      node.config.cronExpression = params.cronExpression;
    }
  }

  // Webhook 相关节点
  if (/webhook|api|http/i.test(nameLower)) {
    if (params.webhookUrl) {
      node.config.url = params.webhookUrl;
    }
  }

  // 阈值相关节点
  if (/检测|monitor|alert|threshold/i.test(nameLower)) {
    if (params.thresholds) {
      node.config.thresholds = params.thresholds;
    }
  }
}

// ========== 判断是否需要确认 ==========

function shouldRequireConfirmation(riskLevel: string, mplpPolicy: string): boolean {
  if (mplpPolicy === 'strict') return true;
  if (mplpPolicy === 'permissive') return riskLevel === 'high';
  // default
  return riskLevel === 'high' || riskLevel === 'medium';
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
  category: string;
}

function analyzeDescription(description: string): DescriptionAnalysis {
  const descLower = description.toLowerCase();

  // 提取 Agent 名称
  const nameMatch = description.match(/(?:创建|构建|生成|做)(?:一个)?(.+?)(?:助手|机器人|Agent|智能体)/);
  const agentName = nameMatch ? nameMatch[1].trim() : '智能助手';

  // 判断触发类型
  let triggerType: 'user_message' | 'webhook' | 'schedule' = 'user_message';
  if (/定时|每天|每周|每月|cron|schedule|每小时|每(\d+)分钟/i.test(descLower)) {
    triggerType = 'schedule';
  } else if (/webhook|api调用|外部触发|http/i.test(descLower)) {
    triggerType = 'webhook';
  }

  // 判断是否需要知识库
  const needsKnowledge = /知识|文档|检索|搜索|查询|rag|问答|faq|回答/i.test(descLower);

  // 判断是否需要条件分支
  const needsConditional = /如果|当|根据|判断|条件|分类|路由|否则/i.test(descLower);

  // 提取条件
  const conditions: Array<{ name: string; expression: string }> = [];
  if (needsConditional) {
    const condPatterns = [
      { pattern: /如果.*用户.*询问.*(.+?)，/i, name: '用户询问' },
      { pattern: /当.*(.+?)时/i, name: '条件匹配' },
      { pattern: /如果.*(.+?)，/i, name: '条件判断' },
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
    if (conditions.length > 0) {
      conditions.push({ name: '其他情况', expression: 'true' });
    }
  }

  // 提取意图
  const intents: string[] = [];
  const intentPatterns = ['查询', '发送', '生成', '分析', '存储', '删除', '更新', '通知', '邮件', '退款', '订单'];
  for (const intent of intentPatterns) {
    if (descLower.includes(intent)) {
      intents.push(intent);
    }
  }

  // 推断类别
  let category = '通用';
  if (/客服|客户|服务/i.test(descLower)) category = '客服';
  else if (/销售|订单|交易/i.test(descLower)) category = '销售';
  else if (/报告|分析|统计/i.test(descLower)) category = '分析';
  else if (/自动化|定时|调度/i.test(descLower)) category = '自动化';

  return {
    agentName,
    triggerType,
    needsKnowledge,
    needsConditional,
    conditions,
    intents,
    capabilities: intents,
    category,
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
  if (/delete|payment|transfer|退款|删除|支付|转账/i.test(text)) return 'high';
  if (/update|send|modify|发送|修改|更新/i.test(text)) return 'medium';
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
    prompt += '你可以访问知识库来获取准确信息，请优先使用知识库中的内容回答问题。\n';
  }
  
  if (assets.skills.length > 0) {
    prompt += '你可以调用多种技能来完成任务。\n';
  }

  if (assets.mcpTools.length > 0) {
    prompt += '你可以使用外部工具来执行操作。\n';
  }
  
  prompt += '\n请友好、专业地与用户交流，提供准确有用的帮助。';
  prompt += '\n对于涉及资金、删除等高风险操作，请务必先确认用户意图。';
  
  return prompt;
}

function buildAgentInputMappings(precedingNodes: NodeSpec[]): Array<{ targetField: string; sourceExpression: string }> {
  const mappings: Array<{ targetField: string; sourceExpression: string }> = [
    { targetField: 'user_message', sourceExpression: '{{trigger.message}}' },
  ];

  // 添加前序节点的输出作为上下文
  const contextParts: string[] = [];
  const toolResults: Record<string, string> = {};

  for (const node of precedingNodes) {
    if (node.type === 'knowledge') {
      // 知识库上下文自动注入
      mappings.push({ 
        targetField: 'knowledge_context', 
        sourceExpression: `{{${node.outputKey}.context}}` 
      });
    } else if (node.type === 'skill' || node.type === 'mcp_action') {
      // 工具结果收集
      toolResults[node.name] = `{{${node.outputKey}}}`;
    } else {
      contextParts.push(`{{${node.outputKey}}}`);
    }
  }

  // 注入工具结果
  if (Object.keys(toolResults).length > 0) {
    mappings.push({ 
      targetField: 'tool_results', 
      sourceExpression: JSON.stringify(toolResults)
    });
  }

  if (contextParts.length > 0) {
    mappings.push({ targetField: 'context', sourceExpression: contextParts.join(', ') });
  }

  return mappings;
}

function validateAndEnhanceDSL(
  dsl: WorkflowDSL, 
  mplpPolicy: string,
  extractedParams: ExtractedParams
): WorkflowDSL & { warnings: string[] } {
  const warnings: string[] = [];

  // 检查高风险节点
  for (const stage of dsl.stages) {
    for (const node of stage.nodes) {
      if (node.riskLevel === 'high') {
        warnings.push(`节点 "${node.name}" 被标记为高风险操作，已自动添加确认步骤`);
      }
      // 标记 AI 生成的节点
      if (node.isGenerated) {
        warnings.push(`节点 "${node.name}" 由 AI 即时生成，建议保存到技能库`);
      }
    }
  }

  // 检查参数提取结果
  if (extractedParams.cronExpression) {
    warnings.push(`已提取定时表达式: ${extractedParams.cronExpression}`);
  }
  if (extractedParams.emailRecipients && extractedParams.emailRecipients.length > 0) {
    warnings.push(`已提取邮件收件人: ${extractedParams.emailRecipients.join(', ')}`);
  }

  // 确保有治理策略
  if (!dsl.governance) {
    dsl.governance = { mplpPolicy, auditLogging: true };
  }

  return { ...dsl, warnings };
}

// ========== Gap Analysis 缺口分析引擎 ==========

const REQUIRED_CAPABILITY_PATTERNS: Record<string, RegExp> = {
  '数据分析': /分析|统计|报表|图表|可视化|dashboard/i,
  '邮件发送': /邮件|email|mail|通知|发送|notify/i,
  '数据库操作': /查询|数据库|sql|存储|读取|写入/i,
  '文件处理': /文件|excel|pdf|csv|文档|上传|下载/i,
  '知识检索': /知识|rag|问答|faq|检索|搜索/i,
  '支付处理': /支付|payment|退款|refund|订单|交易/i,
  '用户认证': /登录|认证|auth|验证|token/i,
  '消息通信': /消息|slack|teams|webhook|推送/i,
  '日程调度': /定时|调度|cron|schedule|每天|每周/i,
  'API调用': /api|http|rest|接口|调用/i,
  '自然语言处理': /nlp|情感|分类|实体|意图|理解/i,
  '图像处理': /图片|图像|ocr|识别|image/i,
};

function analyzeAssetGaps(
  description: string,
  assets: AssetSearchResult
): GapAnalysisResult {
  const descLower = description.toLowerCase();
  
  // 1. 提取需求中的能力
  const requiredCapabilities: string[] = [];
  for (const [capability, pattern] of Object.entries(REQUIRED_CAPABILITY_PATTERNS)) {
    if (pattern.test(descLower)) {
      requiredCapabilities.push(capability);
    }
  }
  
  // 2. 分析现有资产覆盖的能力
  const coveredCapabilities = new Set<string>();
  
  for (const skill of assets.skills) {
    for (const cap of skill.capabilities) {
      coveredCapabilities.add(cap);
    }
    // 根据技能名称推断能力
    for (const [capability, pattern] of Object.entries(REQUIRED_CAPABILITY_PATTERNS)) {
      if (pattern.test(skill.name) || pattern.test(skill.description || '')) {
        coveredCapabilities.add(capability);
      }
    }
  }
  
  for (const mcp of assets.mcpTools) {
    for (const cap of mcp.capabilities) {
      coveredCapabilities.add(cap);
    }
  }
  
  // 3. 计算缺口
  const missingCapabilities = requiredCapabilities.filter(cap => !coveredCapabilities.has(cap));
  
  // 4. 计算覆盖度
  const coverageScore = requiredCapabilities.length > 0
    ? (requiredCapabilities.length - missingCapabilities.length) / requiredCapabilities.length
    : 1.0;
  
  // 5. 生成技能建议
  const suggestedSkills: SkillSuggestion[] = missingCapabilities.slice(0, 3).map(capability => ({
    name: generateSkillName(capability),
    description: `自动生成的 ${capability} 技能，用于满足工作流需求`,
    category: inferSkillCategory(capability),
    capabilities: [capability],
    reason: `需求中需要 "${capability}" 能力，但现有资产中未找到匹配项`,
  }));
  
  return {
    coverageScore,
    missingCapabilities,
    suggestedSkills,
    suggestedKnowledgeBases: [], // 由 matchKnowledgeBasesForContext 填充
  };
}

function generateSkillName(capability: string): string {
  const nameMap: Record<string, string> = {
    '数据分析': '智能数据分析器',
    '邮件发送': '邮件通知服务',
    '数据库操作': '数据库查询工具',
    '文件处理': '文件处理器',
    '知识检索': '知识检索引擎',
    '支付处理': '支付处理服务',
    '用户认证': '用户认证模块',
    '消息通信': '消息推送服务',
    '日程调度': '任务调度器',
    'API调用': 'API网关服务',
    '自然语言处理': 'NLP处理器',
    '图像处理': '图像处理服务',
  };
  return nameMap[capability] || `${capability}处理器`;
}

function inferSkillCategory(capability: string): string {
  const categoryMap: Record<string, string> = {
    '数据分析': '分析',
    '邮件发送': '通信',
    '数据库操作': '数据',
    '文件处理': '工具',
    '知识检索': '知识',
    '支付处理': '交易',
    '用户认证': '安全',
    '消息通信': '通信',
    '日程调度': '自动化',
    'API调用': '集成',
    '自然语言处理': 'AI',
    '图像处理': 'AI',
  };
  return categoryMap[capability] || '通用';
}

function createGeneratedSkillNode(suggestion: SkillSuggestion): NodeSpec {
  return {
    id: `generated-skill-${Date.now()}`,
    type: 'generatedSkill',
    name: suggestion.name,
    description: suggestion.description,
    assetType: 'generated_skill',
    config: {
      capabilities: suggestion.capabilities,
      category: suggestion.category,
      reason: suggestion.reason,
      isTemporary: true,
    },
    inputMappings: [],
    outputKey: `generated_${suggestion.name.replace(/\s+/g, '_').toLowerCase()}`,
    riskLevel: 'low',
    isGenerated: true,
    generatedAt: new Date().toISOString(),
  };
}

// ========== 知识库自动匹配 ==========

const KNOWLEDGE_INTENT_KEYWORDS: Record<string, string[]> = {
  'company_policy': ['政策', '规定', '制度', '规章', '公司'],
  'hr_rules': ['人事', 'HR', '员工', '请假', '考勤'],
  'reimbursement': ['报销', '费用', '报账', '发票'],
  'financial_report': ['财务', '财报', '预算', '账务'],
  'product_docs': ['产品', '功能', '使用', '手册'],
  'faq': ['FAQ', '问答', '常见问题', '帮助'],
  'customer_support': ['客服', '售后', '投诉', '反馈'],
  'technical_docs': ['技术', 'API', '开发', '接口'],
};

// deno-lint-ignore no-explicit-any
async function matchKnowledgeBasesForContext(
  supabase: any,
  description: string,
  userId: string,
  assets: AssetSearchResult
): Promise<KnowledgeBaseSuggestion[]> {
  const descLower = description.toLowerCase();
  const matchedKBs: KnowledgeBaseSuggestion[] = [];
  
  // 从语义索引中查询知识库
  const { data: kbAssets } = await supabase
    .from('asset_semantic_index')
    .select('*')
    .eq('user_id', userId)
    .eq('asset_type', 'knowledge_base')
    .eq('is_active', true)
    .limit(20);
  
  if (!kbAssets || kbAssets.length === 0) {
    // 使用 assets 中的知识库作为回退
    for (const kb of assets.knowledgeBases) {
      matchedKBs.push({
        id: kb.id,
        name: kb.name,
        description: kb.description,
        intentTags: [],
        matchScore: 0.3,
      });
    }
    return matchedKBs.slice(0, 3);
  }
  
  // 计算每个知识库的匹配分数
  for (const kbAsset of kbAssets) {
    let matchScore = 0;
    const matchedTags: string[] = [];
    
    // 检查意图标签匹配
    const intentTags = kbAsset.intent_tags || [];
    for (const tag of intentTags) {
      const keywords = KNOWLEDGE_INTENT_KEYWORDS[tag] || [];
      if (keywords.some(kw => descLower.includes(kw.toLowerCase()))) {
        matchScore += 0.2;
        matchedTags.push(tag);
      }
    }
    
    // 检查名称匹配
    const kbName = (kbAsset.name || '').toLowerCase();
    if (descLower.includes(kbName) || kbName.split(/\s+/).some((word: string) => descLower.includes(word))) {
      matchScore += 0.3;
    }
    
    // 检查描述匹配
    const kbDesc = (kbAsset.description || '').toLowerCase();
    const descWords = descLower.split(/\s+/).filter((w: string) => w.length > 2);
    const matchedDescWords = descWords.filter((w: string) => kbDesc.includes(w));
    matchScore += (matchedDescWords.length / Math.max(descWords.length, 1)) * 0.2;
    
    // 检查上下文钩子
    const contextHook = kbAsset.context_hook || '';
    if (contextHook && descWords.some((w: string) => contextHook.toLowerCase().includes(w))) {
      matchScore += 0.15;
    }
    
    if (matchScore > 0.2) {
      matchedKBs.push({
        id: kbAsset.asset_id,
        name: kbAsset.name,
        description: kbAsset.description,
        intentTags: matchedTags,
        contextHook: kbAsset.context_hook,
        matchScore,
      });
    }
  }
  
  // 按匹配分数排序，返回前3个
  return matchedKBs
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}
