// =====================================================
// 资产索引同步 Edge Function
// Sync Asset Index - 同步 Skills, MCP, Knowledge 到语义索引
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
  assetId?: string;  // 可选：同步特定资产
}

interface SyncResult {
  synced: number;
  errors: string[];
  assets: Array<{ id: string; name: string; type: string }>;
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
    const { userId, assetType = 'all', assetId } = request;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: SyncResult = { synced: 0, errors: [], assets: [] };

    // 同步 Skills
    if (assetType === 'all' || assetType === 'skill') {
      const skillResult = await syncSkills(supabase as any, userId, assetId);
      result.synced += skillResult.synced;
      result.errors.push(...skillResult.errors);
      result.assets.push(...skillResult.assets);
    }

    // 同步 MCP Tools
    if (assetType === 'all' || assetType === 'mcp_tool') {
      const mcpResult = await syncMCPTools(supabase as any, userId, assetId);
      result.synced += mcpResult.synced;
      result.errors.push(...mcpResult.errors);
      result.assets.push(...mcpResult.assets);
    }

    // 同步 Knowledge Bases
    if (assetType === 'all' || assetType === 'knowledge_base') {
      const kbResult = await syncKnowledgeBases(supabase as any, userId, assetId);
      result.synced += kbResult.synced;
      result.errors.push(...kbResult.errors);
      result.assets.push(...kbResult.assets);
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

async function syncSkills(
  supabase: any,
  userId: string,
  assetId?: string
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, errors: [], assets: [] };

  let query = supabase.from('skills').select('*').eq('author_id', userId);
  if (assetId) query = query.eq('id', assetId);

  const { data: skills, error } = await query;
  if (error) {
    result.errors.push(`Failed to fetch skills: ${error.message}`);
    return result;
  }

  for (const skill of (skills || []) as any[]) {
    try {
      const indexEntry = {
        asset_type: 'skill',
        asset_id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category || skill.origin,
        capabilities: extractCapabilitiesFromSkill(skill),
        input_schema: skill.input_schema || {},
        output_schema: skill.output_schema || {},
        risk_level: assessSkillRisk(skill),
        metadata: { origin: skill.origin, version: skill.version, isPublished: skill.is_published },
        is_active: true,
        user_id: userId,
      };

      const { error: upsertError } = await supabase.from('asset_semantic_index').upsert(indexEntry, { onConflict: 'asset_type,asset_id,user_id' });
      if (upsertError) {
        result.errors.push(`Failed to sync skill ${skill.name}: ${upsertError.message}`);
      } else {
        result.synced++;
        result.assets.push({ id: skill.id, name: skill.name, type: 'skill' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      result.errors.push(`Error processing skill ${skill.name}: ${msg}`);
    }
  }
  return result;
}

async function syncMCPTools(supabase: any, userId: string, assetId?: string): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, errors: [], assets: [] };
  let query = supabase.from('skills').select('*').eq('author_id', userId).eq('origin', 'mcp');
  if (assetId) query = query.eq('id', assetId);

  const { data: mcpSkills, error } = await query;
  if (error) { result.errors.push(`Failed to fetch MCP tools: ${error.message}`); return result; }

  for (const mcp of (mcpSkills || []) as any[]) {
    try {
      const indexEntry = {
        asset_type: 'mcp_tool', asset_id: mcp.id, name: mcp.name, description: mcp.description,
        category: mcp.category || 'mcp', capabilities: extractCapabilitiesFromMCP(mcp),
        input_schema: mcp.input_schema || {}, output_schema: mcp.output_schema || {},
        risk_level: assessMCPRisk(mcp),
        metadata: { mcpServer: mcp.mcp_server, toolName: mcp.mcp_tool_name, envVars: mcp.env_vars },
        is_active: true, user_id: userId,
      };
      const { error: upsertError } = await supabase.from('asset_semantic_index').upsert(indexEntry, { onConflict: 'asset_type,asset_id,user_id' });
      if (upsertError) { result.errors.push(`Failed to sync MCP ${mcp.name}: ${upsertError.message}`); }
      else { result.synced++; result.assets.push({ id: mcp.id, name: mcp.name, type: 'mcp_tool' }); }
    } catch (e) { const msg = e instanceof Error ? e.message : 'Unknown'; result.errors.push(`Error processing MCP ${mcp.name}: ${msg}`); }
  }
  return result;
}

async function syncKnowledgeBases(supabase: any, userId: string, assetId?: string): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, errors: [], assets: [] };
  let query = supabase.from('knowledge_bases').select('*').eq('user_id', userId);
  if (assetId) query = query.eq('id', assetId);

  const { data: knowledgeBases, error } = await query;
  if (error) { result.errors.push(`Failed to fetch knowledge bases: ${error.message}`); return result; }

  for (const kb of (knowledgeBases || []) as any[]) {
    try {
      const indexEntry = {
        asset_type: 'knowledge_base', asset_id: kb.id, name: kb.name, description: kb.description,
        category: 'knowledge', capabilities: ['查询', '检索', '上下文'],
        input_schema: { query: { type: 'string', required: true }, topK: { type: 'number', default: 5 } },
        output_schema: { chunks: { type: 'array' }, context: { type: 'string' }, sources: { type: 'array' } },
        risk_level: 'low',
        metadata: { documentCount: kb.document_count, chunkCount: kb.chunk_count, indexStatus: kb.index_status, graphStatus: kb.graph_status },
        is_active: true, user_id: userId,
      };
      const { error: upsertError } = await supabase.from('asset_semantic_index').upsert(indexEntry, { onConflict: 'asset_type,asset_id,user_id' });
      if (upsertError) { result.errors.push(`Failed to sync KB ${kb.name}: ${upsertError.message}`); }
      else { result.synced++; result.assets.push({ id: kb.id, name: kb.name, type: 'knowledge_base' }); }
    } catch (e) { const msg = e instanceof Error ? e.message : 'Unknown'; result.errors.push(`Error processing KB ${kb.name}: ${msg}`); }
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
  
  // 根据 MCP 类别添加特定能力
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
