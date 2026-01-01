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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      query, 
      agentId, 
      topK = 5, 
      traverseDepth = 2,
      relationTypes 
    }: RSSQueryRequest = await req.json();

    console.log(`RSS Query for user ${user.id}: "${query.substring(0, 100)}..."`);

    // Step 1: Generate query embedding
    console.log("Generating query embedding...");
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Generate a semantic embedding representation. Return ONLY a JSON array of 64 floating point numbers between -1 and 1 representing the semantic meaning. No explanation, just the array.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    let queryEmbedding: number[] = [];
    if (embeddingResponse.ok) {
      const embResult = await embeddingResponse.json();
      const embContent = embResult.choices?.[0]?.message?.content || "";
      try {
        let cleanEmb = embContent.trim();
        if (cleanEmb.startsWith("```")) {
          cleanEmb = cleanEmb.replace(/```json?\n?/g, "").replace(/```/g, "");
        }
        queryEmbedding = JSON.parse(cleanEmb.trim());
      } catch {
        queryEmbedding = Array.from({ length: 64 }, () => Math.random() * 2 - 1);
      }
    } else {
      console.error("Failed to generate query embedding");
      queryEmbedding = Array.from({ length: 64 }, () => Math.random() * 2 - 1);
    }

    // Step 2: Find similar entities (anchor points)
    console.log("Finding anchor entities...");
    const { data: anchorEntities, error: anchorError } = await supabase
      .rpc("find_similar_entities", {
        p_user_id: user.id,
        p_query_embedding: queryEmbedding,
        p_limit: topK,
        p_agent_id: agentId || null,
      });

    if (anchorError) {
      console.error("Failed to find anchor entities:", anchorError);
      throw new Error("Failed to find anchor entities");
    }

    if (!anchorEntities || anchorEntities.length === 0) {
      console.log("No matching entities found");
      return new Response(
        JSON.stringify({
          success: true,
          anchors: [],
          subgraph: [],
          context: "",
          message: "No matching entities found in the knowledge graph",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${anchorEntities.length} anchor entities`);

    // Step 3: Traverse graph from anchors (RSS Algorithm)
    console.log("Traversing entity graph...");
    const anchorIds = anchorEntities.map((e: { entity_id: string }) => e.entity_id);
    
    const { data: subgraph, error: traverseError } = await supabase
      .rpc("traverse_entity_graph", {
        p_entity_ids: anchorIds,
        p_depth: traverseDepth,
        p_relation_types: relationTypes || null,
      });

    if (traverseError) {
      console.error("Failed to traverse graph:", traverseError);
      throw new Error("Failed to traverse graph");
    }

    console.log(`Subgraph contains ${subgraph?.length || 0} nodes`);

    // Step 4: Get full entity details and relations
    const entityIds = [...new Set([
      ...anchorIds,
      ...(subgraph?.map((n: { entity_id: string }) => n.entity_id) || []),
    ])];

    const { data: entities, error: entitiesError } = await supabase
      .from("entities")
      .select("*")
      .in("id", entityIds);

    if (entitiesError) {
      console.error("Failed to fetch entity details:", entitiesError);
    }

    // Get relations between these entities
    const { data: relations, error: relationsError } = await supabase
      .from("entity_relations")
      .select("*")
      .or(`source_entity_id.in.(${entityIds.join(",")}),target_entity_id.in.(${entityIds.join(",")})`);

    if (relationsError) {
      console.error("Failed to fetch relations:", relationsError);
    }

    // Step 5: Serialize subgraph to context text
    let contextText = "## 相关知识图谱上下文\n\n";
    
    // Add anchor entities with similarity scores
    contextText += "### 核心相关实体\n";
    for (const anchor of anchorEntities) {
      const entity = entities?.find((e: { id: string }) => e.id === anchor.entity_id);
      if (entity) {
        contextText += `- **${entity.name}** (${entity.entity_type}): ${entity.description || "无描述"}\n`;
        if (entity.source_content) {
          contextText += `  原文: "${entity.source_content.substring(0, 200)}..."\n`;
        }
      }
    }

    // Add related entities from traversal
    if (subgraph && subgraph.length > 0) {
      contextText += "\n### 关联实体网络\n";
      const groupedByDepth: Record<number, typeof subgraph> = {};
      
      for (const node of subgraph) {
        if (!groupedByDepth[node.depth]) {
          groupedByDepth[node.depth] = [];
        }
        groupedByDepth[node.depth].push(node);
      }

      for (const depth of Object.keys(groupedByDepth).sort()) {
        const nodes = groupedByDepth[Number(depth)];
        if (Number(depth) > 0) {
          contextText += `\n第 ${depth} 层关联:\n`;
          for (const node of nodes) {
            contextText += `- ${node.entity_name} (${node.entity_type}): ${node.description || ""}\n`;
            if (node.relation_path && node.relation_path !== node.entity_name) {
              contextText += `  路径: ${node.relation_path}\n`;
            }
          }
        }
      }
    }

    // Add key relations
    if (relations && relations.length > 0) {
      contextText += "\n### 实体关系\n";
      const entityIdToName: Record<string, string> = {};
      for (const e of entities || []) {
        entityIdToName[e.id] = e.name;
      }

      for (const rel of relations.slice(0, 20)) { // Limit to 20 relations
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
        subgraph: subgraph || [],
        entities: entities || [],
        relations: relations || [],
        context: contextText,
        stats: {
          anchorCount: anchorEntities.length,
          subgraphNodes: subgraph?.length || 0,
          relationsCount: relations?.length || 0,
          contextLength: contextText.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RSS query error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
