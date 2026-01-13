// =====================================================
// 资产索引同步 Edge Function - 增强版
// Sync Asset Index - 同步 Skills, MCP, Knowledge 到语义索引
// 支持向量嵌入生成 + LLM 描述增强
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  userId: string;
  assetType?: 'skill' | 'mcp_tool' | 'knowledge_base' | 'all';
  assetId?: string;
  generateEmbeddings?: boolean;
  enhanceDescriptions?: boolean;
}

interface SyncResult {
  synced: number;
  errors: string[];
  assets: Array<{ id: string; name: string; type: string }>;
  embeddingsGenerated: number;
  descriptionsEnhanced: number;
}

// ========== Lovable AI 集成 ==========

async function generateEmbedding(text: string): Promise<number[] | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not configured, skipping embedding generation");
    return null;
  }

  try {
    // 使用 Lovable AI 生成嵌入（通过 chat completion 模拟语义向量）
    // 实际生产环境应使用专门的嵌入 API
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "你是一个语义分析器。为以下文本生成一个简短的语义标签列表（用逗号分隔），用于后续检索匹配。只输出标签，不要解释。"
          },
          { role: "user", content: text.slice(0, 500) }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Embedding generation failed:", await response.text());
      return null;
    }

    const data = await response.json();
    const semanticTags = data.choices?.[0]?.message?.content || "";
    
    // 将语义标签转换为简化的数值向量（用于演示）
    // 实际生产环境应使用真正的向量嵌入 API
    const vector = generateMockEmbedding(text + " " + semanticTags);
    return vector;
  } catch (error) {
    console.error("Embedding generation error:", error);
    return null;
  }
}

function generateMockEmbedding(text: string): number[] {
  // 生成 1536 维的模拟嵌入向量（基于文本哈希）
  const embedding: number[] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  
  for (let i = 0; i < 1536; i++) {
    const seed = hash + i * 31;
    embedding.push(Math.sin(seed) * 0.5 + 0.5);
  }
  return embedding;
}

async function generateAssetDescription(asset: Record<string, unknown>): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return null;
  }

  const name = asset.name as string || '';
  const code = (asset.code as string)?.slice(0, 800) || '';
  const existingDesc = asset.description as string || '';

  // 如果已有描述且长度足够，跳过
  if (existingDesc && existingDesc.length > 30) {
    return null;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "你是一个技术文档撰写专家。根据提供的技能/工具信息，生成一段不超过50字的简洁功能描述。只输出描述文本，不要其他内容。"
          },
          {
            role: "user",
            content: `技能名称: ${name}\n代码片段:\n${code}`
          }
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("Description generation error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: SyncRequest = await req.json();
    const { 
      userId, 
      assetType = 'all', 
      assetId,
      generateEmbeddings = true,
      enhanceDescriptions = true,
    } = request;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: SyncResult = { 
      synced: 0, 
      errors: [], 
      assets: [],
      embeddingsGenerated: 0,
      descriptionsEnhanced: 0,
    };

    // 同步 Skills
    if (assetType === 'all' || assetType === 'skill') {
      const skillResult = await syncSkills(supabase, userId, assetId, generateEmbeddings, enhanceDescriptions);
      result.synced += skillResult.synced;
      result.errors.push(...skillResult.errors);
      result.assets.push(...skillResult.assets);
      result.embeddingsGenerated += skillResult.embeddingsGenerated;
      result.descriptionsEnhanced += skillResult.descriptionsEnhanced;
    }

    // 同步 MCP Tools
    if (assetType === 'all' || assetType === 'mcp_tool') {
      const mcpResult = await syncMCPTools(supabase, userId, assetId, generateEmbeddings, enhanceDescriptions);
      result.synced += mcpResult.synced;
      result.errors.push(...mcpResult.errors);
      result.assets.push(...mcpResult.assets);
      result.embeddingsGenerated += mcpResult.embeddingsGenerated;
      result.descriptionsEnhanced += mcpResult.descriptionsEnhanced;
    }

    // 同步 Knowledge Bases
    if (assetType === 'all' || assetType === 'knowledge_base') {
      const kbResult = await syncKnowledgeBases(supabase, userId, assetId, generateEmbeddings);
      result.synced += kbResult.synced;
      result.errors.push(...kbResult.errors);
      result.assets.push(...kbResult.assets);
      result.embeddingsGenerated += kbResult.embeddingsGenerated;
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========== 同步 Skills ==========

// deno-lint-ignore no-explicit-any
async function syncSkills(
  supabase: any,
  userId: string,
  assetId?: string,
  generateEmbeddingsFlag = true,
  enhanceDescriptionsFlag = true
): Promise<SyncResult> {
  const result: SyncResult = { 
    synced: 0, 
    errors: [], 
    assets: [],
    embeddingsGenerated: 0,
    descriptionsEnhanced: 0,
  };

  let query = supabase.from('skills').select('*').eq('author_id', userId);
  if (assetId) query = query.eq('id', assetId);

  const { data: skills, error } = await query;
  if (error) {
    result.errors.push(`Failed to fetch skills: ${error.message}`);
    return result;
  }

  for (const skill of (skills || []) as Record<string, unknown>[]) {
    try {
      // 尝试生成增强描述
      let description = skill.description as string || '';
      if (enhanceDescriptionsFlag && (!description || description.length < 30)) {
        const enhanced = await generateAssetDescription(skill);
        if (enhanced) {
          description = enhanced;
          result.descriptionsEnhanced++;
        }
      }

      // 生成嵌入向量
      let embedding: number[] | null = null;
      if (generateEmbeddingsFlag) {
        const textForEmbedding = `${skill.name} ${description} ${(skill.code as string || '').slice(0, 200)}`;
        embedding = await generateEmbedding(textForEmbedding);
        if (embedding) result.embeddingsGenerated++;
      }

      const indexEntry = {
        asset_type: 'skill',
        asset_id: skill.id,
        name: skill.name,
        description: description,
        category: skill.category || skill.origin,
        capabilities: extractCapabilitiesFromSkill(skill),
        input_schema: skill.input_schema || {},
        output_schema: skill.output_schema || {},
        risk_level: assessSkillRisk(skill),
        metadata: { origin: skill.origin, version: skill.version, isPublished: skill.is_published },
        embedding: embedding ? JSON.stringify(embedding) : null,
        is_active: true,
        user_id: userId,
      };

      const { error: upsertError } = await supabase.from('asset_semantic_index').upsert(
        indexEntry, 
        { onConflict: 'asset_type,asset_id,user_id' }
      );
      
      if (upsertError) {
        result.errors.push(`Failed to sync skill ${skill.name}: ${upsertError.message}`);
      } else {
        result.synced++;
        result.assets.push({ id: skill.id as string, name: skill.name as string, type: 'skill' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      result.errors.push(`Error processing skill ${skill.name}: ${msg}`);
    }
  }
  return result;
}

// deno-lint-ignore no-explicit-any
async function syncMCPTools(
  supabase: any,
  userId: string,
  assetId?: string,
  generateEmbeddingsFlag = true,
  enhanceDescriptionsFlag = true
): Promise<SyncResult> {
  const result: SyncResult = { 
    synced: 0, 
    errors: [], 
    assets: [],
    embeddingsGenerated: 0,
    descriptionsEnhanced: 0,
  };

  let query = supabase.from('skills').select('*').eq('author_id', userId).eq('origin', 'mcp');
  if (assetId) query = query.eq('id', assetId);

  const { data: mcpSkills, error } = await query;
  if (error) { result.errors.push(`Failed to fetch MCP tools: ${error.message}`); return result; }

  for (const mcp of (mcpSkills || []) as Record<string, unknown>[]) {
    try {
      let description = mcp.description as string || '';
      if (enhanceDescriptionsFlag && (!description || description.length < 30)) {
        const enhanced = await generateAssetDescription(mcp);
        if (enhanced) {
          description = enhanced;
          result.descriptionsEnhanced++;
        }
      }

      let embedding: number[] | null = null;
      if (generateEmbeddingsFlag) {
        const textForEmbedding = `${mcp.name} ${description} ${mcp.mcp_server} ${mcp.mcp_tool_name}`;
        embedding = await generateEmbedding(textForEmbedding);
        if (embedding) result.embeddingsGenerated++;
      }

      const indexEntry = {
        asset_type: 'mcp_tool', 
        asset_id: mcp.id, 
        name: mcp.name, 
        description: description,
        category: mcp.category || 'mcp', 
        capabilities: extractCapabilitiesFromMCP(mcp),
        input_schema: mcp.input_schema || {}, 
        output_schema: mcp.output_schema || {},
        risk_level: assessMCPRisk(mcp),
        metadata: { mcpServer: mcp.mcp_server, toolName: mcp.mcp_tool_name, envVars: mcp.env_vars },
        embedding: embedding ? JSON.stringify(embedding) : null,
        is_active: true, 
        user_id: userId,
      };

      const { error: upsertError } = await supabase.from('asset_semantic_index').upsert(
        indexEntry, 
        { onConflict: 'asset_type,asset_id,user_id' }
      );
      if (upsertError) { 
        result.errors.push(`Failed to sync MCP ${mcp.name}: ${upsertError.message}`); 
      } else { 
        result.synced++; 
        result.assets.push({ id: mcp.id as string, name: mcp.name as string, type: 'mcp_tool' }); 
      }
    } catch (e) { 
      const msg = e instanceof Error ? e.message : 'Unknown'; 
      result.errors.push(`Error processing MCP ${mcp.name}: ${msg}`); 
    }
  }
  return result;
}

// deno-lint-ignore no-explicit-any
async function syncKnowledgeBases(
  supabase: any,
  userId: string,
  assetId?: string,
  generateEmbeddingsFlag = true
): Promise<SyncResult> {
  const result: SyncResult = { 
    synced: 0, 
    errors: [], 
    assets: [],
    embeddingsGenerated: 0,
    descriptionsEnhanced: 0,
  };

  let query = supabase.from('knowledge_bases').select('*').eq('user_id', userId);
  if (assetId) query = query.eq('id', assetId);

  const { data: knowledgeBases, error } = await query;
  if (error) { result.errors.push(`Failed to fetch knowledge bases: ${error.message}`); return result; }

  for (const kb of (knowledgeBases || []) as Record<string, unknown>[]) {
    try {
      let embedding: number[] | null = null;
      if (generateEmbeddingsFlag) {
        const textForEmbedding = `${kb.name} ${kb.description || ''} 知识库 文档检索 RAG`;
        embedding = await generateEmbedding(textForEmbedding);
        if (embedding) result.embeddingsGenerated++;
      }

      const indexEntry = {
        asset_type: 'knowledge_base', 
        asset_id: kb.id, 
        name: kb.name, 
        description: kb.description,
        category: 'knowledge', 
        capabilities: ['查询', '检索', '上下文', 'RAG'],
        input_schema: { query: { type: 'string', required: true }, topK: { type: 'number', default: 5 } },
        output_schema: { chunks: { type: 'array' }, context: { type: 'string' }, sources: { type: 'array' } },
        risk_level: 'low',
        metadata: { documentCount: kb.document_count, chunkCount: kb.chunk_count, indexStatus: kb.index_status, graphStatus: kb.graph_status },
        embedding: embedding ? JSON.stringify(embedding) : null,
        is_active: true, 
        user_id: userId,
      };

      const { error: upsertError } = await supabase.from('asset_semantic_index').upsert(
        indexEntry, 
        { onConflict: 'asset_type,asset_id,user_id' }
      );
      if (upsertError) { 
        result.errors.push(`Failed to sync KB ${kb.name}: ${upsertError.message}`); 
      } else { 
        result.synced++; 
        result.assets.push({ id: kb.id as string, name: kb.name as string, type: 'knowledge_base' }); 
      }
    } catch (e) { 
      const msg = e instanceof Error ? e.message : 'Unknown'; 
      result.errors.push(`Error processing KB ${kb.name}: ${msg}`); 
    }
  }
  return result;
}

// ========== 能力提取 ==========

function extractCapabilitiesFromSkill(skill: Record<string, unknown>): string[] {
  const capabilities: string[] = [];
  const name = ((skill.name as string) || '').toLowerCase();
  const description = ((skill.description as string) || '').toLowerCase();
  const text = `${name} ${description}`;

  const capabilityPatterns: Record<string, RegExp> = {
    '查询': /query|search|find|get|fetch|retrieve/i,
    '发送': /send|post|publish|emit|notify/i,
    '生成': /generate|create|produce|make|build/i,
    '分析': /analyze|parse|evaluate|assess/i,
    '存储': /save|store|persist|write|upload/i,
    '删除': /delete|remove|erase|drop/i,
    '更新': /update|modify|change|alter|edit/i,
    '转换': /convert|transform|format|translate/i,
    '验证': /validate|verify|check|confirm/i,
    '计算': /calculate|compute|count|sum/i,
  };

  for (const [capability, pattern] of Object.entries(capabilityPatterns)) {
    if (pattern.test(text)) {
      capabilities.push(capability);
    }
  }

  return capabilities.length > 0 ? capabilities : ['通用'];
}

function extractCapabilitiesFromMCP(mcp: Record<string, unknown>): string[] {
  const capabilities = extractCapabilitiesFromSkill(mcp);
  
  const mcpServer = (mcp.mcp_server as string) || '';
  
  if (mcpServer.includes('database')) capabilities.push('数据库');
  if (mcpServer.includes('email')) capabilities.push('邮件');
  if (mcpServer.includes('file')) capabilities.push('文件');
  if (mcpServer.includes('github')) capabilities.push('版本控制');
  if (mcpServer.includes('slack')) capabilities.push('通信');
  
  return [...new Set(capabilities)];
}

// ========== 风险评估 ==========

function assessSkillRisk(skill: Record<string, unknown>): 'low' | 'medium' | 'high' {
  const name = ((skill.name as string) || '').toLowerCase();
  const code = ((skill.code as string) || '').toLowerCase();
  const text = `${name} ${code}`;

  if (/delete|remove|drop|destroy|payment|transfer/i.test(text)) {
    return 'high';
  }
  if (/update|modify|send|post|write/i.test(text)) {
    return 'medium';
  }
  return 'low';
}

function assessMCPRisk(mcp: Record<string, unknown>): 'low' | 'medium' | 'high' {
  const name = ((mcp.name as string) || '').toLowerCase();
  const toolName = ((mcp.mcp_tool_name as string) || '').toLowerCase();
  const text = `${name} ${toolName}`;

  if (/delete|drop|payment|transfer|execute/i.test(text)) {
    return 'high';
  }
  if (/update|modify|send|create|write/i.test(text)) {
    return 'medium';
  }
  return 'low';
}
