// =====================================================
// 混合资产检索 Edge Function - 面向 Meta-Builder 的高级 API
// Hybrid Asset Retriever - Advanced API for Meta-Builder
// 统一检索 Skill、MCP、Knowledge 并按槽位分组
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== 类型定义 ==========

type SlotType = 'perception' | 'decision' | 'action' | 'hybrid';
type AtomType = 'NATIVE_SKILL' | 'MCP_TOOL' | 'KNOWLEDGE_BASE';

interface IOSpec {
  input: { type: string; properties?: Record<string, unknown> };
  output: { type: string; properties?: Record<string, unknown> };
}

interface FunctionalAtom {
  id: string;
  type: AtomType;
  name: string;
  description: string;
  io_spec: IOSpec;
  slot_type: SlotType;
  tags: string[];
  asset_id: string;
  asset_type: 'skill' | 'mcp_tool' | 'knowledge_base';
  similarity: number;
  match_reason: string;
  risk_level: 'low' | 'medium' | 'high';
  category?: string;
  metadata?: Record<string, unknown>;
}

interface SlotMatchResult {
  perception: FunctionalAtom[];
  decision: FunctionalAtom[];
  action: FunctionalAtom[];
  hybrid: FunctionalAtom[];
}

interface HybridRetrievalRequest {
  query: string;
  userId: string;
  requiredSlots?: SlotType[];
  maxPerSlot?: number;
  minSimilarity?: number;
  assetTypes?: ('skill' | 'mcp_tool' | 'knowledge_base')[];
  includeSuggestions?: boolean;
}

// ========== 槽位推断关键词 ==========

const SLOT_KEYWORDS = {
  perception: [
    '查询', '检索', '获取', '读取', '搜索', '知识', 'rag', '文档',
    'get', 'fetch', 'read', 'search', 'retrieve', 'query', 'find', 'lookup'
  ],
  decision: [
    '分析', '判断', '路由', '评估', '分类', '决策', '推理', '计算',
    'analyze', 'decide', 'route', 'classify', 'evaluate', 'assess', 'determine', 'compute'
  ],
  action: [
    '发送', '写入', '创建', '删除', '更新', '执行', '推送', '通知',
    'send', 'write', 'create', 'delete', 'update', 'execute', 'post', 'put', 'push', 'notify'
  ],
};

// ========== 能力关键词映射 ==========

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  '查询': ['query', 'search', 'find', 'get', 'fetch', 'retrieve', 'lookup', '搜索', '查找'],
  '发送': ['send', 'post', 'publish', 'emit', 'broadcast', 'notify', '推送', '通知'],
  '生成': ['generate', 'create', 'produce', 'make', 'build', 'construct', '创建', '构建'],
  '分析': ['analyze', 'parse', 'evaluate', 'assess', 'examine', 'inspect', '解析', '评估'],
  '存储': ['save', 'store', 'persist', 'write', 'upload', 'insert', '保存', '上传'],
  '删除': ['delete', 'remove', 'erase', 'drop', 'purge', 'clear', '移除', '清除'],
  '更新': ['update', 'modify', 'change', 'alter', 'edit', 'patch', '修改', '编辑'],
  '转换': ['convert', 'transform', 'format', 'translate', 'encode', 'decode', '格式化', '翻译'],
  '验证': ['validate', 'verify', 'check', 'confirm', 'authenticate', '校验', '确认'],
  '计算': ['calculate', 'compute', 'count', 'sum', 'aggregate', '统计', '汇总'],
};

// ========== 槽位推断函数 ==========

function inferSlotType(
  assetType: string,
  name: string,
  description: string,
  capabilities: string[]
): SlotType {
  const text = `${name} ${description}`.toLowerCase();
  const capsLower = capabilities.map(c => c.toLowerCase());
  
  // 知识库默认为感知层
  if (assetType === 'knowledge_base') return 'perception';
  
  const hasPerception = SLOT_KEYWORDS.perception.some(k => 
    text.includes(k) || capsLower.some(c => c.includes(k))
  );
  const hasDecision = SLOT_KEYWORDS.decision.some(k => 
    text.includes(k) || capsLower.some(c => c.includes(k))
  );
  const hasAction = SLOT_KEYWORDS.action.some(k => 
    text.includes(k) || capsLower.some(c => c.includes(k))
  );
  
  // 根据关键词匹配判断
  if (hasPerception && !hasDecision && !hasAction) return 'perception';
  if (hasDecision && !hasAction) return 'decision';
  if (hasAction) return 'action';
  
  return 'hybrid';
}

// ========== 提取能力关键词 ==========

function extractCapabilities(query: string): string[] {
  const capabilities: string[] = [];
  const queryLower = query.toLowerCase();

  for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw)) || queryLower.includes(capability)) {
      capabilities.push(capability);
    }
  }

  return capabilities;
}

// ========== 相似度计算 ==========

function calculateSimilarity(
  asset: Record<string, unknown>,
  queryWords: string[],
  queryLower: string,
  capabilities: string[]
): { similarity: number; matchReason: string } {
  let score = 0;
  const matchReasons: string[] = [];
  
  const name = ((asset.name as string) || '').toLowerCase();
  const description = ((asset.description as string) || '').toLowerCase();
  const assetCapabilities = (asset.capabilities as string[]) || [];
  const tags = (asset.tags as string[]) || [];
  const slotType = asset.slot_type as string || 'hybrid';

  // 1. 名称匹配 (权重: 0.4)
  if (queryLower.includes(name) || name.includes(queryLower)) {
    score += 0.4;
    matchReasons.push('名称匹配');
  } else {
    const nameWords = name.split(/[\s_\-]+/);
    const matchedWords = queryWords.filter(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    const nameScore = (matchedWords.length / Math.max(queryWords.length, 1)) * 0.3;
    if (nameScore > 0) {
      score += nameScore;
      matchReasons.push('名称相似');
    }
  }

  // 2. 描述匹配 (权重: 0.2)
  const descWords = description.split(/\s+/);
  const descMatchedWords = queryWords.filter(qw =>
    descWords.some(dw => dw.includes(qw))
  );
  const descScore = (descMatchedWords.length / Math.max(queryWords.length, 1)) * 0.2;
  if (descScore > 0) {
    score += descScore;
    matchReasons.push('描述匹配');
  }

  // 3. 能力匹配 (权重: 0.25)
  if (capabilities.length > 0 && assetCapabilities.length > 0) {
    const capabilityMatches = capabilities.filter(c => 
      assetCapabilities.some(ac => 
        ac.toLowerCase().includes(c.toLowerCase()) || 
        c.toLowerCase().includes(ac.toLowerCase())
      )
    );
    const capScore = (capabilityMatches.length / capabilities.length) * 0.25;
    if (capScore > 0) {
      score += capScore;
      matchReasons.push(`能力匹配(${capabilityMatches.join(',')})`);
    }
  }

  // 4. 标签匹配 (权重: 0.1)
  if (tags.length > 0) {
    const tagMatches = tags.filter(t => 
      queryWords.some(qw => t.toLowerCase().includes(qw))
    );
    if (tagMatches.length > 0) {
      score += 0.1 * (tagMatches.length / tags.length);
      matchReasons.push(`标签匹配(${tagMatches.join(',')})`);
    }
  }

  // 5. 槽位类型匹配加成
  const querySlotHints = inferSlotType('', queryLower, '', capabilities);
  if (slotType === querySlotHints && slotType !== 'hybrid') {
    score += 0.05;
    matchReasons.push('槽位匹配');
  }

  return {
    similarity: Math.min(score, 1.0),
    matchReason: matchReasons.join(', ') || '基础匹配',
  };
}

// ========== 资产转换为 FunctionalAtom ==========

function assetToAtom(asset: Record<string, unknown>): FunctionalAtom {
  const assetType = asset.asset_type as string;
  
  let atomType: AtomType = 'NATIVE_SKILL';
  if (assetType === 'mcp_tool') atomType = 'MCP_TOOL';
  else if (assetType === 'knowledge_base') atomType = 'KNOWLEDGE_BASE';
  
  // 构建 IO 规范
  const ioSpec: IOSpec = (asset.io_spec as IOSpec) || {
    input: { 
      type: 'object', 
      properties: asset.input_schema as Record<string, unknown> || {} 
    },
    output: { 
      type: 'object', 
      properties: asset.output_schema as Record<string, unknown> || {} 
    },
  };
  
  // 推断或使用已有的槽位类型
  const slotType = (asset.slot_type as SlotType) || inferSlotType(
    assetType,
    asset.name as string || '',
    asset.description as string || '',
    (asset.capabilities as string[]) || []
  );
  
  return {
    id: asset.id as string,
    type: atomType,
    name: asset.name as string || '',
    description: asset.description as string || '',
    io_spec: ioSpec,
    slot_type: slotType,
    tags: (asset.tags as string[]) || (asset.capabilities as string[]) || [],
    asset_id: asset.asset_id as string,
    asset_type: assetType as 'skill' | 'mcp_tool' | 'knowledge_base',
    similarity: (asset.similarity as number) || 0,
    match_reason: (asset.match_reason as string) || '',
    risk_level: (asset.risk_level as 'low' | 'medium' | 'high') || 'low',
    category: asset.category as string,
    metadata: asset.metadata as Record<string, unknown>,
  };
}

// ========== IO 兼容性检查 ==========

function checkIOCompatibility(
  sourceOutput: IOSpec['output'],
  targetInput: IOSpec['input']
): { compatible: boolean; matchedFields: string[] } {
  const matchedFields: string[] = [];
  
  if (!sourceOutput?.properties || !targetInput?.properties) {
    return { compatible: false, matchedFields: [] };
  }
  
  const outputProps = sourceOutput.properties as Record<string, { type?: string }>;
  const inputProps = targetInput.properties as Record<string, { type?: string }>;
  
  for (const [inputKey, inputSpec] of Object.entries(inputProps)) {
    if (outputProps[inputKey] && outputProps[inputKey].type === inputSpec.type) {
      matchedFields.push(inputKey);
    } else {
      for (const outputKey of Object.keys(outputProps)) {
        if (
          (outputKey.toLowerCase().includes(inputKey.toLowerCase()) ||
           inputKey.toLowerCase().includes(outputKey.toLowerCase())) &&
          outputProps[outputKey].type === inputSpec.type
        ) {
          matchedFields.push(`${outputKey}→${inputKey}`);
          break;
        }
      }
    }
  }
  
  return { compatible: matchedFields.length > 0, matchedFields };
}

// ========== 主服务 ==========

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: HybridRetrievalRequest = await req.json();
    const {
      query,
      userId,
      requiredSlots = ['perception', 'decision', 'action'],
      maxPerSlot = 5,
      minSimilarity = 0.2,
      assetTypes = ['skill', 'mcp_tool', 'knowledge_base'],
      includeSuggestions = true,
    } = request;

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. 提取查询能力关键词
    const extractedCapabilities = extractCapabilities(query);
    
    // 2. 查询资产索引
    let queryBuilder = supabase
      .from('asset_semantic_index')
      .select('*')
      .in('asset_type', assetTypes)
      .eq('is_active', true);

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

    const { data: assets, error } = await queryBuilder.limit(100);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to search assets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. 计算相似度并转换为 FunctionalAtom
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

    const scoredAtoms: FunctionalAtom[] = (assets || [])
      .map(asset => {
        const { similarity, matchReason } = calculateSimilarity(
          asset, 
          queryWords, 
          queryLower, 
          extractedCapabilities
        );
        return assetToAtom({
          ...asset,
          similarity,
          match_reason: matchReason,
        });
      })
      .filter(atom => atom.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity);

    // 4. 按槽位分组
    const slotMatches: SlotMatchResult = {
      perception: [],
      decision: [],
      action: [],
      hybrid: [],
    };

    for (const atom of scoredAtoms) {
      const slot = atom.slot_type;
      if (slotMatches[slot].length < maxPerSlot) {
        slotMatches[slot].push(atom);
      }
    }

    // 5. IO 兼容性分析
    const compatiblePairs: Array<{
      source: FunctionalAtom;
      target: FunctionalAtom;
      matchedFields: string[];
      compatibilityScore: number;
    }> = [];

    for (const source of scoredAtoms) {
      for (const target of scoredAtoms) {
        if (source.id === target.id) continue;
        
        // 检查流向合理性
        const validFlow = 
          (source.slot_type === 'perception' && ['decision', 'action', 'hybrid'].includes(target.slot_type)) ||
          (source.slot_type === 'decision' && ['action', 'hybrid'].includes(target.slot_type)) ||
          (source.slot_type === 'hybrid');
        
        if (!validFlow) continue;
        
        const { compatible, matchedFields } = checkIOCompatibility(
          source.io_spec.output,
          target.io_spec.input
        );
        
        if (compatible) {
          compatiblePairs.push({
            source,
            target,
            matchedFields,
            compatibilityScore: matchedFields.length / Math.max(
              Object.keys(target.io_spec.input.properties || {}).length,
              1
            ),
          });
        }
      }
    }

    // 6. 缺口分析
    const missingSlots: SlotType[] = [];
    const suggestedAtoms: Array<{
      name: string;
      type: AtomType;
      slot_type: SlotType;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    for (const slot of requiredSlots) {
      if (slotMatches[slot].length === 0) {
        missingSlots.push(slot);
        if (includeSuggestions) {
          suggestedAtoms.push({
            name: `${slot}_handler`,
            type: 'NATIVE_SKILL',
            slot_type: slot,
            reason: `缺少${slot === 'perception' ? '感知层' : slot === 'decision' ? '决策层' : '行动层'}能力`,
            priority: 'high',
          });
        }
      }
    }

    const totalSlots = requiredSlots.length;
    const filledSlots = totalSlots - missingSlots.length;
    const coverageScore = filledSlots / totalSlots;

    // 7. 构建响应
    const allAtoms = [
      ...slotMatches.perception,
      ...slotMatches.decision,
      ...slotMatches.action,
      ...slotMatches.hybrid,
    ];

    const response = {
      slotMatches,
      allAtoms,
      ioCompatibility: {
        compatiblePairs: compatiblePairs.slice(0, 10), // 限制返回数量
        autoWireSuggestions: compatiblePairs.slice(0, 5).map(pair => ({
          sourceId: pair.source.id,
          targetId: pair.target.id,
          reason: `${pair.source.name} → ${pair.target.name}: ${pair.matchedFields.join(', ')}`,
        })),
      },
      gaps: {
        missingSlots,
        suggestedAtoms,
        coverageScore,
      },
      stats: {
        totalFound: scoredAtoms.length,
        perceptionCount: slotMatches.perception.length,
        decisionCount: slotMatches.decision.length,
        actionCount: slotMatches.action.length,
        hybridCount: slotMatches.hybrid.length,
        queryTimeMs: Date.now() - startTime,
      },
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
