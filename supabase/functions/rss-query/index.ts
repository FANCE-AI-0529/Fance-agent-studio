import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RSSQueryRequest {
  query: string;
  agentId?: string;
  topK?: number;
  traverseDepth?: number;
  relationTypes?: string[];
}

// Simple keyword extraction
function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "的", "是", "在", "和", "与", "了", "有", "我", "你", "他", "她", "它", "们",
    "这", "那", "什么", "怎么", "为什么", "如何", "可以", "能", "会", "要",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "to", "of", "in", "for", "on", "with",
    "at", "by", "from", "as", "into", "through", "during", "before", "after",
    "above", "below", "between", "under", "again", "further", "then", "once"
  ]);
  
  // Split by common separators and filter
  const words = text.toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopwords.has(word));
  
  return [...new Set(words)];
}

// Calculate relevance score between query keywords and entity
function calculateRelevance(queryKeywords: string[], entity: {
  name: string;
  description?: string;
  source_content?: string;
  metadata?: { keywords?: string[] };
}): number {
  const entityText = [
    entity.name,
    entity.description || "",
    entity.source_content || "",
    ...(entity.metadata?.keywords || [])
  ].join(" ").toLowerCase();
  
  let matchCount = 0;
  for (const keyword of queryKeywords) {
    if (entityText.includes(keyword)) {
      matchCount++;
    }
  }
  
  return queryKeywords.length > 0 ? matchCount / queryKeywords.length : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { 
      query, 
      agentId, 
      topK = 5, 
      traverseDepth = 2,
      relationTypes 
    }: RSSQueryRequest = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (import.meta.env?.DEV) console.debug(`RSS Query for user: "${query.substring(0, 100)}..."`);

    // Step 1: Extract keywords from query
    const queryKeywords = extractKeywords(query);
    console.log(`Extracted keywords: ${queryKeywords.join(", ")}`);

    // Step 2: Fetch all entities for this user (limited for performance)
    let entityQuery = supabase
      .from("entities")
      .select("*")
      .eq("user_id", userId)
      .limit(500);

    if (agentId) {
      entityQuery = entityQuery.eq("agent_id", agentId);
    }

    const { data: allEntities, error: entitiesError } = await entityQuery;

    if (entitiesError) {
      console.error("Failed to fetch entities:", entitiesError);
      throw new Error("Failed to fetch entities");
    }

    if (!allEntities || allEntities.length === 0) {
      console.log("No entities found");
      return new Response(
        JSON.stringify({
          success: true,
          anchors: [],
          subgraph: [],
          context: "",
          message: "No entities found in the knowledge graph",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Calculate relevance scores and find anchor entities
    const scoredEntities = allEntities.map(entity => ({
      entity,
      score: calculateRelevance(queryKeywords, entity)
    }));

    // Filter and sort by relevance
    const anchorEntities = scoredEntities
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(e => ({
        entity_id: e.entity.id,
        entity_name: e.entity.name,
        entity_type: e.entity.entity_type,
        similarity_score: e.score
      }));

    if (anchorEntities.length === 0) {
      console.log("No matching entities found");
      return new Response(
        JSON.stringify({
          success: true,
          anchors: [],
          subgraph: [],
          context: "",
          message: "No matching entities found for query",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${anchorEntities.length} anchor entities`);

    // Step 4: Get relations for anchor entities and traverse
    const anchorIds = anchorEntities.map(e => e.entity_id);
    
    const subgraph: Array<{
      entity_id: string;
      entity_name: string;
      entity_type: string;
      description?: string;
      depth: number;
    }> = [];

    // First level - anchor entities (depth 0)
    for (const anchor of anchorEntities) {
      const entity = allEntities.find(e => e.id === anchor.entity_id);
      if (entity) {
        subgraph.push({
          entity_id: entity.id,
          entity_name: entity.name,
          entity_type: entity.entity_type,
          description: entity.description,
          depth: 0
        });
      }
    }

    // Traverse relations
    let currentIds = anchorIds;
    const visitedIds = new Set(anchorIds);

    for (let depth = 1; depth <= traverseDepth; depth++) {
      if (currentIds.length === 0) break;

      // Build query for relations
      let relQuery = supabase
        .from("entity_relations")
        .select("*")
        .eq("user_id", userId);

      // Filter by source or target in current level
      relQuery = relQuery.or(
        `source_entity_id.in.(${currentIds.join(",")}),target_entity_id.in.(${currentIds.join(",")})`
      );

      if (relationTypes && relationTypes.length > 0) {
        relQuery = relQuery.in("relation_type", relationTypes);
      }

      const { data: relations, error: relError } = await relQuery.limit(100);

      if (relError) {
        console.error(`Failed to fetch relations at depth ${depth}:`, relError);
        break;
      }

      // Find new entity IDs from relations
      const newIds: string[] = [];
      for (const rel of relations || []) {
        if (!visitedIds.has(rel.source_entity_id)) {
          newIds.push(rel.source_entity_id);
          visitedIds.add(rel.source_entity_id);
        }
        if (!visitedIds.has(rel.target_entity_id)) {
          newIds.push(rel.target_entity_id);
          visitedIds.add(rel.target_entity_id);
        }
      }

      if (newIds.length === 0) break;

      // Fetch entity details for new IDs
      const { data: newEntities } = await supabase
        .from("entities")
        .select("*")
        .in("id", newIds);

      for (const entity of newEntities || []) {
        subgraph.push({
          entity_id: entity.id,
          entity_name: entity.name,
          entity_type: entity.entity_type,
          description: entity.description,
          depth
        });
      }

      currentIds = newIds;
    }

    console.log(`Subgraph contains ${subgraph.length} nodes`);

    // Step 5: Get all relations between subgraph entities
    const allSubgraphIds = subgraph.map(n => n.entity_id);
    const { data: allRelations } = await supabase
      .from("entity_relations")
      .select("*")
      .or(`source_entity_id.in.(${allSubgraphIds.join(",")}),target_entity_id.in.(${allSubgraphIds.join(",")})`)
      .limit(50);

    // Step 6: Build context text
    let contextText = "## 相关知识图谱上下文\n\n";
    
    // Add anchor entities
    contextText += "### 核心相关实体\n";
    for (const anchor of anchorEntities) {
      const entity = allEntities.find(e => e.id === anchor.entity_id);
      if (entity) {
        contextText += `- **${entity.name}** (${entity.entity_type}): ${entity.description || "无描述"}\n`;
        if (entity.source_content) {
          contextText += `  原文: "${entity.source_content.substring(0, 200)}..."\n`;
        }
      }
    }

    // Add related entities by depth
    const depthGroups: Record<number, typeof subgraph> = {};
    for (const node of subgraph) {
      if (node.depth > 0) {
        if (!depthGroups[node.depth]) depthGroups[node.depth] = [];
        depthGroups[node.depth].push(node);
      }
    }

    for (const depth of Object.keys(depthGroups).sort()) {
      const nodes = depthGroups[Number(depth)];
      if (nodes.length > 0) {
        contextText += `\n### 第 ${depth} 层关联实体\n`;
        for (const node of nodes) {
          contextText += `- ${node.entity_name} (${node.entity_type}): ${node.description || ""}\n`;
        }
      }
    }

    // Add relations
    if (allRelations && allRelations.length > 0) {
      contextText += "\n### 实体关系\n";
      const entityIdToName: Record<string, string> = {};
      for (const e of allEntities) {
        entityIdToName[e.id] = e.name;
      }

      for (const rel of allRelations) {
        const sourceName = entityIdToName[rel.source_entity_id] || "未知";
        const targetName = entityIdToName[rel.target_entity_id] || "未知";
        contextText += `- ${sourceName} --[${rel.relation_type}]--> ${targetName}`;
        if (rel.description) {
          contextText += `: ${rel.description}`;
        }
        contextText += "\n";
      }
    }

    console.log(`Generated context with ${contextText.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        anchors: anchorEntities,
        subgraph,
        entities: allEntities.filter(e => allSubgraphIds.includes(e.id)),
        relations: allRelations || [],
        context: contextText,
        stats: {
          anchorCount: anchorEntities.length,
          subgraphNodes: subgraph.length,
          relationsCount: allRelations?.length || 0,
          contextLength: contextText.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RSS query error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An internal error occurred",
        code: "RSS_QUERY_ERROR" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
