// =====================================================
// 工作流生成器 Edge Function - 增强版 + 蓝图系统
// Workflow Generator - AI 驱动的工作流 DSL 生成
// 支持智能参数提取 + 增强 Meta-Prompt + 架构蓝图匹配
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
  selectedKnowledgeBaseIds?: string[]; // User-selected KBs from clarification
  skipKnowledge?: boolean; // User chose to skip KB mounting
  useBlueprintMode?: boolean; // Enable blueprint-driven generation
  selectedBlueprintId?: string; // User-selected blueprint ID
}

// ========== Blueprint Types (Agent Blueprints) ==========

type SlotType = 'perception' | 'decision' | 'action' | 'hybrid';
type AtomType = 'NATIVE_SKILL' | 'MCP_TOOL' | 'KNOWLEDGE_BASE' | 'ROUTER';

interface BlueprintSlot {
  id: string;
  name: string;
  slotType: SlotType;
  required: boolean;
  description: string;
  acceptedAtomTypes: AtomType[];
  position: { rank: number };
}

interface BlueprintEdge {
  from: string;
  to: string;
  condition?: string;
}

interface AgentBlueprint {
  id: string;
  name: string;
  description: string;
  category: string;
  structure: {
    trigger: { type: string; config?: Record<string, unknown> };
    slots: BlueprintSlot[];
    edges: BlueprintEdge[];
  };
  matchKeywords: string[];
  matchPatterns: RegExp[];
  exampleScenarios: string[];
}

interface BlueprintMatchResult {
  blueprint: AgentBlueprint;
  score: number;
  matchedKeywords: string[];
  matchedPatterns: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface FunctionalAtom {
  id: string;
  type: AtomType;
  name: string;
  description?: string;
  slot_type: SlotType;
  io_spec: {
    input: { properties: Record<string, unknown>; required: string[] };
    output: { properties: Record<string, unknown>; required: string[] };
  };
  similarity?: number;
  assetId?: string;
}

interface FilledSlot {
  slot: BlueprintSlot;
  atoms: FunctionalAtom[];
  autoWired: boolean;
  warnings: string[];
}

// ========== Predefined Agent Blueprints ==========

const AGENT_BLUEPRINTS: AgentBlueprint[] = [
  {
    id: 'rag-to-action',
    name: 'RAG-to-Action',
    description: '基于知识库检索后执行操作的模式',
    category: 'knowledge-driven',
    structure: {
      trigger: { type: 'user_message' },
      slots: [
        { id: 'knowledge', name: '知识检索', slotType: 'perception', required: true, description: '从知识库检索相关信息', acceptedAtomTypes: ['KNOWLEDGE_BASE'], position: { rank: 1 } },
        { id: 'analysis', name: 'LLM分析', slotType: 'decision', required: true, description: 'AI分析和决策', acceptedAtomTypes: ['NATIVE_SKILL', 'ROUTER'], position: { rank: 2 } },
        { id: 'action', name: '执行操作', slotType: 'action', required: false, description: '执行外部操作', acceptedAtomTypes: ['MCP_TOOL', 'NATIVE_SKILL'], position: { rank: 3 } },
      ],
      edges: [
        { from: 'trigger', to: 'knowledge' },
        { from: 'knowledge', to: 'analysis' },
        { from: 'analysis', to: 'action' },
      ],
    },
    matchKeywords: ['基于', '文档', '发送', '知识', 'RAG', '根据', '资料', '报表'],
    matchPatterns: [/基于.*(?:文档|资料|知识|报表).*(?:发送|生成|创建|分析)/i, /根据.*(?:文档|资料).*(?:回答|处理)/i],
    exampleScenarios: ['基于财务报表发送邮件', '根据产品文档回答问题', '基于公司政策解答员工疑问'],
  },
  {
    id: 'router-based',
    name: 'Router-Based',
    description: '基于条件路由到不同分支的模式',
    category: 'conditional',
    structure: {
      trigger: { type: 'user_message' },
      slots: [
        { id: 'router', name: '意图路由', slotType: 'decision', required: true, description: '分析意图并路由', acceptedAtomTypes: ['ROUTER', 'NATIVE_SKILL'], position: { rank: 1 } },
        { id: 'branch_a', name: '分支A', slotType: 'action', required: true, description: '第一个处理分支', acceptedAtomTypes: ['NATIVE_SKILL', 'MCP_TOOL'], position: { rank: 2 } },
        { id: 'branch_b', name: '分支B', slotType: 'action', required: false, description: '第二个处理分支', acceptedAtomTypes: ['NATIVE_SKILL', 'MCP_TOOL'], position: { rank: 2 } },
      ],
      edges: [
        { from: 'trigger', to: 'router' },
        { from: 'router', to: 'branch_a', condition: 'intent_a' },
        { from: 'router', to: 'branch_b', condition: 'intent_b' },
      ],
    },
    matchKeywords: ['如果', '否则', '当', '判断', '分类', '路由', '意图'],
    matchPatterns: [/如果.*就/i, /当.*时/i, /根据.*(?:判断|分类|路由)/i, /(?:如果|若).*(?:否则|不然)/i],
    exampleScenarios: ['如果询问价格就查报价，否则转人工', '根据用户意图分流处理'],
  },
  {
    id: 'research-loop',
    name: 'Research-Loop',
    description: '多步骤研究和报告生成模式',
    category: 'automation',
    structure: {
      trigger: { type: 'schedule' },
      slots: [
        { id: 'planning', name: 'Manus规划', slotType: 'decision', required: true, description: '任务规划和分解', acceptedAtomTypes: ['NATIVE_SKILL'], position: { rank: 1 } },
        { id: 'research', name: '信息收集', slotType: 'perception', required: true, description: '收集外部信息', acceptedAtomTypes: ['MCP_TOOL', 'KNOWLEDGE_BASE'], position: { rank: 2 } },
        { id: 'analysis', name: '分析处理', slotType: 'decision', required: true, description: '分析和整合信息', acceptedAtomTypes: ['NATIVE_SKILL'], position: { rank: 3 } },
        { id: 'output', name: '输出结果', slotType: 'action', required: true, description: '生成并输出结果', acceptedAtomTypes: ['MCP_TOOL', 'NATIVE_SKILL'], position: { rank: 4 } },
      ],
      edges: [
        { from: 'trigger', to: 'planning' },
        { from: 'planning', to: 'research' },
        { from: 'research', to: 'analysis' },
        { from: 'analysis', to: 'output' },
        { from: 'analysis', to: 'research', condition: 'need_more_data' },
      ],
    },
    matchKeywords: ['研究', '报告', '长任务', '调研', '分析并生成', '深度', '全面'],
    matchPatterns: [/(?:研究|调研|分析).*(?:生成|输出).*报告/i, /(?:深度|全面).*(?:分析|调研)/i],
    exampleScenarios: ['每周调研竞品并生成报告', '深度分析市场趋势'],
  },
  {
    id: 'simple-qa',
    name: 'Simple-QA',
    description: '简单的问答对话模式',
    category: 'conversational',
    structure: {
      trigger: { type: 'user_message' },
      slots: [
        { id: 'agent', name: 'AI对话', slotType: 'hybrid', required: true, description: '直接对话处理', acceptedAtomTypes: ['NATIVE_SKILL'], position: { rank: 1 } },
      ],
      edges: [
        { from: 'trigger', to: 'agent' },
      ],
    },
    matchKeywords: ['聊天', '对话', '助手', '回答问题', '简单', '直接'],
    matchPatterns: [/(?:创建|做).*(?:聊天|对话|问答).*(?:助手|机器人)/i, /简单.*(?:问答|对话)/i],
    exampleScenarios: ['创建一个客服聊天机器人', '做一个问答助手'],
  },
  {
    id: 'scheduled-task',
    name: 'Scheduled-Task',
    description: '定时执行任务的自动化模式',
    category: 'automation',
    structure: {
      trigger: { type: 'schedule' },
      slots: [
        { id: 'data_fetch', name: '数据获取', slotType: 'perception', required: true, description: '获取数据', acceptedAtomTypes: ['MCP_TOOL', 'KNOWLEDGE_BASE', 'NATIVE_SKILL'], position: { rank: 1 } },
        { id: 'process', name: '数据处理', slotType: 'decision', required: false, description: '处理和转换数据', acceptedAtomTypes: ['NATIVE_SKILL'], position: { rank: 2 } },
        { id: 'notify', name: '通知发送', slotType: 'action', required: true, description: '发送通知或输出', acceptedAtomTypes: ['MCP_TOOL', 'NATIVE_SKILL'], position: { rank: 3 } },
      ],
      edges: [
        { from: 'trigger', to: 'data_fetch' },
        { from: 'data_fetch', to: 'process' },
        { from: 'process', to: 'notify' },
      ],
    },
    matchKeywords: ['每天', '每周', '定时', '自动', '调度', '每月', '每小时'],
    matchPatterns: [/每(?:天|周|月|小时).*(?:执行|发送|检查|生成)/i, /定时.*(?:任务|执行|发送)/i],
    exampleScenarios: ['每天9点发送销售报告', '每周一汇总数据并通知'],
  },
];

// ========== Blueprint Matching Algorithm ==========

const MATCH_CONFIG = {
  keywordWeight: 1,
  patternWeight: 3,
  scenarioWeight: 2,
  highConfidenceThreshold: 5,
  mediumConfidenceThreshold: 2,
};

function matchBlueprint(description: string): BlueprintMatchResult | null {
  const descLower = description.toLowerCase();
  const results: BlueprintMatchResult[] = [];
  
  for (const blueprint of AGENT_BLUEPRINTS) {
    let score = 0;
    const matchedKeywords: string[] = [];
    const matchedPatterns: string[] = [];
    
    // Keyword matching
    for (const keyword of blueprint.matchKeywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        score += MATCH_CONFIG.keywordWeight;
        matchedKeywords.push(keyword);
      }
    }
    
    // Pattern matching
    for (const pattern of blueprint.matchPatterns) {
      if (pattern.test(description)) {
        score += MATCH_CONFIG.patternWeight;
        matchedPatterns.push(pattern.source);
      }
    }
    
    // Scenario similarity
    for (const example of blueprint.exampleScenarios) {
      const overlap = calculateWordOverlap(descLower, example.toLowerCase());
      score += overlap * MATCH_CONFIG.scenarioWeight;
    }
    
    if (score > 0) {
      results.push({
        blueprint,
        score,
        matchedKeywords,
        matchedPatterns,
        confidence: score >= MATCH_CONFIG.highConfidenceThreshold ? 'high' 
          : score >= MATCH_CONFIG.mediumConfidenceThreshold ? 'medium' : 'low',
      });
    }
  }
  
  if (results.length === 0) return null;
  
  // Sort by score and return best match
  results.sort((a, b) => b.score - a.score);
  return results[0];
}

function calculateWordOverlap(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 1));
  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) overlap++;
  }
  return overlap / Math.max(words1.size, words2.size, 1);
}

// ========== Slot Filling Algorithm ==========

function fillBlueprintSlots(
  blueprint: AgentBlueprint,
  atoms: FunctionalAtom[]
): { filledSlots: FilledSlot[]; unfilledSlots: BlueprintSlot[] } {
  const filledSlots: FilledSlot[] = [];
  const unfilledSlots: BlueprintSlot[] = [];
  let availableAtoms = [...atoms];
  
  // Sort slots by rank to fill in order
  const sortedSlots = [...blueprint.structure.slots].sort((a, b) => a.position.rank - b.position.rank);
  
  for (const slot of sortedSlots) {
    // Find compatible atoms for this slot
    const candidates = availableAtoms.filter(atom => 
      atom.slot_type === slot.slotType || 
      atom.slot_type === 'hybrid' ||
      slot.acceptedAtomTypes.includes(atom.type)
    );
    
    // Rank by similarity score
    const ranked = candidates.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    
    if (ranked.length > 0) {
      const selected = ranked[0];
      filledSlots.push({
        slot,
        atoms: [selected],
        autoWired: true,
        warnings: [],
      });
      // Remove used atom
      availableAtoms = availableAtoms.filter(a => a.id !== selected.id);
    } else if (slot.required) {
      unfilledSlots.push(slot);
    }
  }
  
  return { filledSlots, unfilledSlots };
}

// ========== Blueprint-to-DSL Conversion ==========

function generateDSLFromBlueprint(
  blueprint: AgentBlueprint,
  filledSlots: FilledSlot[],
  unfilledSlots: BlueprintSlot[],
  description: string,
  mplpPolicy: string,
  extractedParams: ExtractedParams
): WorkflowDSL {
  const analysis = analyzeDescription(description);
  
  // Build trigger config
  const triggerConfig: Record<string, unknown> = {};
  if (blueprint.structure.trigger.type === 'schedule' && extractedParams.cronExpression) {
    triggerConfig.cronExpression = extractedParams.cronExpression;
  }
  
  // Convert filled slots to nodes
  const nodes: NodeSpec[] = [];
  let nodeIndex = 0;
  
  for (const filledSlot of filledSlots) {
    const atom = filledSlot.atoms[0];
    if (!atom) continue;
    
    const nodeType = atom.type === 'KNOWLEDGE_BASE' ? 'knowledge' 
      : atom.type === 'MCP_TOOL' ? 'mcp_action'
      : atom.type === 'ROUTER' ? 'router'
      : 'skill';
    
    const riskLevel = assessNodeRisk(atom.name, []);
    const requiresConfirmation = shouldRequireConfirmation(riskLevel, mplpPolicy);
    
    const node: NodeSpec = {
      id: `node-${nodeIndex++}`,
      type: nodeType,
      name: atom.name,
      description: atom.description,
      assetId: atom.assetId || atom.id,
      assetType: atom.type === 'KNOWLEDGE_BASE' ? 'knowledge_base' 
        : atom.type === 'MCP_TOOL' ? 'mcp_tool' : 'skill',
      config: {
        slotId: filledSlot.slot.id,
        slotName: filledSlot.slot.name,
      },
      inputMappings: nodes.length > 0
        ? [{ targetField: 'input', sourceExpression: `{{${nodes[nodes.length - 1].outputKey}}}` }]
        : [{ targetField: 'input', sourceExpression: '{{trigger.message}}' }],
      outputKey: `${filledSlot.slot.id}_output`,
      riskLevel,
      requiresConfirmation,
    };
    
    applyExtractedParams(node, extractedParams, atom.name);
    nodes.push(node);
  }
  
  // Add placeholder nodes for unfilled required slots
  for (const slot of unfilledSlots) {
    nodes.push({
      id: `node-${nodeIndex++}`,
      type: 'placeholder',
      name: `[缺失] ${slot.name}`,
      description: `需要填充: ${slot.description}`,
      config: {
        slotId: slot.id,
        slotType: slot.slotType,
        required: true,
        isPlaceholder: true,
      },
      inputMappings: nodes.length > 0
        ? [{ targetField: 'input', sourceExpression: `{{${nodes[nodes.length - 1].outputKey}}}` }]
        : [{ targetField: 'input', sourceExpression: '{{trigger.message}}' }],
      outputKey: `${slot.id}_placeholder`,
      riskLevel: 'low',
    });
  }
  
  // Add final agent node
  nodes.push({
    id: `node-${nodeIndex++}`,
    type: 'agent',
    name: analysis.agentName,
    config: {
      systemPrompt: `你是${analysis.agentName}，使用${blueprint.name}架构模式构建。${analysis.intents.length > 0 ? `核心能力: ${analysis.intents.join('、')}` : ''}`,
      model: 'google/gemini-2.5-flash',
      temperature: 0.7,
      blueprintId: blueprint.id,
    },
    inputMappings: buildAgentInputMappings(nodes.slice(0, -1)),
    outputKey: 'agent_response',
  });
  
  // Determine stage type based on blueprint
  const hasConditionalEdges = blueprint.structure.edges.some(e => e.condition);
  
  const mainStage: StageSpec = {
    id: 'main-stage',
    name: '主处理流程',
    type: hasConditionalEdges ? 'conditional' : 'sequential',
    nodes,
  };
  
  // Add branches if conditional
  if (hasConditionalEdges) {
    const conditionalEdges = blueprint.structure.edges.filter(e => e.condition);
    mainStage.branches = conditionalEdges.map((edge, idx) => ({
      id: `branch-${idx}`,
      name: edge.condition || `分支${idx + 1}`,
      condition: edge.condition || 'true',
      nodes: [],
      isDefault: idx === conditionalEdges.length - 1,
    }));
  }
  
  return {
    version: '1.0',
    name: analysis.agentName,
    description,
    trigger: {
      type: blueprint.structure.trigger.type,
      config: triggerConfig,
    },
    stages: [mainStage],
    governance: {
      mplpPolicy,
      auditLogging: true,
    },
    metadata: {
      category: analysis.category,
      extractedParams,
      blueprintId: blueprint.id,
      blueprintName: blueprint.name,
      blueprintConfidence: undefined, // Will be set later
    } as Record<string, unknown>,
  };
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

// ========== RAG Decision Types ==========

type RAGDecisionAction = 'AUTO_MOUNT' | 'ASK_USER' | 'REQUEST_UPLOAD' | 'SKIP';

interface RAGDecisionResult {
  status: 'continue' | 'clarification_needed';
  reason?: 'auto_mount' | 'multiple_candidates' | 'no_match';
  action?: RAGDecisionAction;
  candidates?: Array<{
    id: string;
    name: string;
    description?: string;
    score: number;
    matchReason: string;
  }>;
  question?: string;
  autoMountedKB?: {
    id: string;
    name: string;
    score: number;
  };
}

// RAG Decision Thresholds
const RAG_THRESHOLDS = {
  autoMountThreshold: 0.85,   // Auto mount when score > 0.85
  askUserThreshold: 0.60,     // Ask user when score > 0.60 but < 0.85
  ambiguityGap: 0.10,         // Ask if top scores are within 0.10 gap
};

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
      selectedKnowledgeBaseIds,
      skipKnowledge = false,
      useBlueprintMode = true, // Default to blueprint mode
      selectedBlueprintId,
    } = request;

    if (!description || !userId) {
      return new Response(
        JSON.stringify({ error: "description and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0. 提取参数
    const extractedParams = extractParamsFromDescription(description);

    // ========== NEW: Blueprint-Driven Generation ==========
    // Phase 2: Architectural Pattern Matching
    
    // Match blueprint from description
    const blueprintMatch = useBlueprintMode ? matchBlueprint(description) : null;
    
    // If user selected a specific blueprint, use that instead
    let selectedBlueprint: AgentBlueprint | null = null;
    if (selectedBlueprintId) {
      selectedBlueprint = AGENT_BLUEPRINTS.find(b => b.id === selectedBlueprintId) || null;
    } else if (blueprintMatch && blueprintMatch.confidence !== 'low') {
      selectedBlueprint = blueprintMatch.blueprint;
    }
    
    // If blueprint matched with high/medium confidence, use blueprint-driven generation
    if (selectedBlueprint) {
      console.log(`[Blueprint] Using ${selectedBlueprint.name} (confidence: ${blueprintMatch?.confidence || 'selected'})`);
      
      // Fetch hybrid assets with slot-aware retrieval
      const hybridAssets = await fetchHybridAssetsForBlueprint(supabase, description, userId, selectedBlueprint);
      
      // Fill slots with matching atoms
      const { filledSlots, unfilledSlots } = fillBlueprintSlots(selectedBlueprint, hybridAssets);
      
      // Generate DSL from blueprint structure
      const blueprintDSL = generateDSLFromBlueprint(
        selectedBlueprint,
        filledSlots,
        unfilledSlots,
        description,
        mplpPolicy,
        extractedParams
      );
      
      // Add blueprint metadata
      if (blueprintDSL.metadata) {
        (blueprintDSL.metadata as Record<string, unknown>).blueprintConfidence = blueprintMatch?.confidence || 'selected';
      }
      
      // Validate and enhance
      const validatedBlueprintDSL = validateAndEnhanceDSL(blueprintDSL, mplpPolicy, extractedParams);
      
      // Add blueprint-specific warnings
      const blueprintWarnings = [...(validatedBlueprintDSL.warnings || [])];
      blueprintWarnings.unshift(`使用蓝图: ${selectedBlueprint.name} (${selectedBlueprint.description})`);
      
      if (unfilledSlots.length > 0) {
        blueprintWarnings.push(`有 ${unfilledSlots.length} 个槽位未填充: ${unfilledSlots.map(s => s.name).join(', ')}`);
      }
      
      // Calculate slot coverage
      const totalSlots = selectedBlueprint.structure.slots.length;
      const filledCount = filledSlots.length;
      const coverage = totalSlots > 0 ? (filledCount / totalSlots) * 100 : 100;
      
      return new Response(
        JSON.stringify({
          dsl: { ...validatedBlueprintDSL, warnings: blueprintWarnings },
          blueprintUsed: {
            id: selectedBlueprint.id,
            name: selectedBlueprint.name,
            description: selectedBlueprint.description,
            confidence: blueprintMatch?.confidence || 'selected',
            matchedKeywords: blueprintMatch?.matchedKeywords || [],
            matchedPatterns: blueprintMatch?.matchedPatterns || [],
          },
          filledSlots: filledSlots.map(fs => ({
            slotId: fs.slot.id,
            slotName: fs.slot.name,
            slotType: fs.slot.slotType,
            atomId: fs.atoms[0]?.id,
            atomName: fs.atoms[0]?.name,
            atomType: fs.atoms[0]?.type,
          })),
          unfilledSlots: unfilledSlots.map(s => ({
            id: s.id,
            name: s.name,
            slotType: s.slotType,
            required: s.required,
          })),
          slotCoverage: {
            filled: filledCount,
            total: totalSlots,
            percentage: Math.round(coverage),
          },
          warnings: blueprintWarnings,
          extractedParams,
          availableBlueprints: AGENT_BLUEPRINTS.map(b => ({
            id: b.id,
            name: b.name,
            description: b.description,
            category: b.category,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // ========== Fallback: Original Generation Logic ==========
    console.log('[Blueprint] No confident match, falling back to original generation');
    
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
    
    // 4. RAG Decision State Machine - Phase 3
    let autoMountedKBs: KnowledgeBaseSuggestion[] = [];
    
    // If user already made a selection or skipped, use that
    if (selectedKnowledgeBaseIds && selectedKnowledgeBaseIds.length > 0) {
      // User selected specific KBs - fetch them
      const { data: selectedKBs } = await supabase
        .from('knowledge_bases')
        .select('id, name, description')
        .in('id', selectedKnowledgeBaseIds);
      
      autoMountedKBs = (selectedKBs || []).map((kb: { id: string; name: string; description?: string }) => ({
        id: kb.id,
        name: kb.name,
        description: kb.description,
        intentTags: [],
        matchScore: 1.0, // User selected = 100% confidence
      }));
    } else if (!skipKnowledge && includeKnowledge) {
      // Run RAG decision state machine
      const ragDecision = await executeRAGDecision(supabase, description, userId, assetsResponse);
      
      // If clarification needed, return early
      if (ragDecision.status === 'clarification_needed') {
        return new Response(
          JSON.stringify({
            status: 'clarification_needed',
            reason: ragDecision.reason,
            action: ragDecision.action,
            candidates: ragDecision.candidates,
            question: ragDecision.question,
            availableBlueprints: AGENT_BLUEPRINTS.map(b => ({
              id: b.id,
              name: b.name,
              description: b.description,
              category: b.category,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Auto mount case
      if (ragDecision.autoMountedKB) {
        autoMountedKBs = [{
          id: ragDecision.autoMountedKB.id,
          name: ragDecision.autoMountedKB.name,
          description: '',
          intentTags: [],
          matchScore: ragDecision.autoMountedKB.score,
        }];
      }
    }

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
        blueprintUsed: null, // No blueprint used in fallback mode
        availableBlueprints: AGENT_BLUEPRINTS.map(b => ({
          id: b.id,
          name: b.name,
          description: b.description,
          category: b.category,
        })),
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

// ========== Hybrid Asset Fetching for Blueprint ==========

// deno-lint-ignore no-explicit-any
async function fetchHybridAssetsForBlueprint(
  supabase: any,
  description: string,
  userId: string,
  blueprint: AgentBlueprint
): Promise<FunctionalAtom[]> {
  // Get required slot types from blueprint
  const requiredSlotTypes = blueprint.structure.slots.map(s => s.slotType);
  
  // Query assets from semantic index with slot filtering
  const { data: assets } = await supabase
    .from('asset_semantic_index')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(50);
  
  if (!assets || assets.length === 0) {
    return [];
  }
  
  const descLower = description.toLowerCase();
  
  // Convert to FunctionalAtom format with similarity scoring
  const atoms: FunctionalAtom[] = assets.map((asset: AssetRow & { slot_type?: string; io_spec?: unknown }) => {
    // Calculate similarity score
    const nameLower = (asset.name || '').toLowerCase();
    const descAssetLower = (asset.description || '').toLowerCase();
    let similarity = 0;
    
    const words = descLower.split(/\s+/).filter(w => w.length > 1);
    for (const word of words) {
      if (nameLower.includes(word)) similarity += 0.3;
      if (descAssetLower.includes(word)) similarity += 0.1;
      if (asset.capabilities?.some((c: string) => c.toLowerCase().includes(word))) similarity += 0.2;
    }
    
    // Infer slot type
    const inferredSlotType = inferSlotTypeFromAsset(asset);
    
    // Bonus for matching required slot types
    if (requiredSlotTypes.includes(inferredSlotType)) {
      similarity += 0.2;
    }
    
    return {
      id: asset.id,
      type: mapAssetTypeToAtomType(asset.asset_type),
      name: asset.name,
      description: asset.description || undefined,
      slot_type: asset.slot_type || inferredSlotType,
      io_spec: asset.io_spec || { input: { properties: {}, required: [] }, output: { properties: {}, required: [] } },
      similarity,
      assetId: asset.asset_id,
    } as FunctionalAtom;
  });
  
  // Sort by similarity
  return atoms.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
}

function mapAssetTypeToAtomType(assetType: string): AtomType {
  switch (assetType) {
    case 'skill': return 'NATIVE_SKILL';
    case 'mcp_tool': return 'MCP_TOOL';
    case 'knowledge_base': return 'KNOWLEDGE_BASE';
    default: return 'NATIVE_SKILL';
  }
}

function inferSlotTypeFromAsset(asset: { name: string; description?: string | null; asset_type: string; capabilities?: string[] | null }): SlotType {
  const text = `${asset.name} ${asset.description || ''} ${(asset.capabilities || []).join(' ')}`.toLowerCase();
  
  // Perception indicators
  if (/检索|搜索|查询|获取|读取|收集|监控|感知|知识|文档/i.test(text)) {
    return 'perception';
  }
  
  // Action indicators
  if (/发送|删除|创建|更新|修改|执行|触发|推送|写入|导出/i.test(text)) {
    return 'action';
  }
  
  // Decision indicators
  if (/分析|判断|决策|分类|路由|推理|评估|选择|规划/i.test(text)) {
    return 'decision';
  }
  
  // Default by asset type
  if (asset.asset_type === 'knowledge_base') return 'perception';
  if (asset.asset_type === 'mcp_tool') return 'action';
  
  return 'hybrid';
}

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

// ========== RAG Decision State Machine (Phase 3) ==========

// deno-lint-ignore no-explicit-any
async function executeRAGDecision(
  supabase: any,
  description: string,
  userId: string,
  assets: AssetSearchResult
): Promise<RAGDecisionResult> {
  // Get matched knowledge bases with scores
  const matchedKBs = await matchKnowledgeBasesForContext(supabase, description, userId, assets);
  
  // If no matches at all
  if (matchedKBs.length === 0) {
    return {
      status: 'clarification_needed',
      reason: 'no_match',
      action: 'REQUEST_UPLOAD',
      candidates: [],
      question: '我没有找到相关资料。您可以直接把文件拖给我，我立马学习！',
    };
  }
  
  const top1 = matchedKBs[0];
  const top2 = matchedKBs[1];
  
  // Decision Logic based on thresholds
  // Case 1: Score > 0.85 → AUTO_MOUNT
  if (top1.matchScore > RAG_THRESHOLDS.autoMountThreshold) {
    return {
      status: 'continue',
      reason: 'auto_mount',
      autoMountedKB: {
        id: top1.id,
        name: top1.name,
        score: top1.matchScore,
      },
    };
  }
  
  // Case 2: Score > 0.6 but < 0.85, OR multiple candidates with close scores
  if (top1.matchScore > RAG_THRESHOLDS.askUserThreshold) {
    // Check if there's ambiguity (top1 and top2 are close)
    const hasAmbiguity = top2 && 
      (top1.matchScore - top2.matchScore) < RAG_THRESHOLDS.ambiguityGap;
    
    if (hasAmbiguity || matchedKBs.length > 1) {
      return {
        status: 'clarification_needed',
        reason: 'multiple_candidates',
        action: 'ASK_USER',
        candidates: matchedKBs.slice(0, 4).map(kb => ({
          id: kb.id,
          name: kb.name,
          description: kb.description,
          score: kb.matchScore,
          matchReason: kb.intentTags?.join('、') || '语义相关',
        })),
        question: generateClarificationQuestion(matchedKBs.slice(0, 2)),
      };
    }
    
    // Single confident match - auto mount
    return {
      status: 'continue',
      reason: 'auto_mount',
      autoMountedKB: {
        id: top1.id,
        name: top1.name,
        score: top1.matchScore,
      },
    };
  }
  
  // Case 3: Score <= 0.6 → Suggest upload or skip
  return {
    status: 'clarification_needed',
    reason: 'no_match',
    action: 'REQUEST_UPLOAD',
    candidates: matchedKBs.slice(0, 2).map(kb => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      score: kb.matchScore,
      matchReason: '匹配度较低',
    })),
    question: '我没有找到高度相关的资料。您可以上传新文件，或选择使用通用知识回答。',
  };
}

function generateClarificationQuestion(topKBs: KnowledgeBaseSuggestion[]): string {
  if (topKBs.length === 0) {
    return '未找到相关知识库';
  }
  if (topKBs.length === 1) {
    return `检测到可能相关的知识库「${topKBs[0].name}」，需要使用它来回答吗？`;
  }
  const names = topKBs.map(kb => `「${kb.name}」`).join('和');
  return `检测到多个相关知识库：${names}，您想使用哪个？`;
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
