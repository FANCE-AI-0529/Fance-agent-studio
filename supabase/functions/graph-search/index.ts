import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      query, 
      knowledgeBaseId, 
      topK = 5, 
      graphDepth = 2 
    } = await req.json();

    if (!query || !knowledgeBaseId) {
      return new Response(JSON.stringify({ error: "Query and knowledge base ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Generate query embedding
    const embeddingResponse = await fetch("https://api.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-3-small",
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error("Failed to generate query embedding");
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 2: Vector search on document chunks
    const { data: vectorResults, error: vectorError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: topK,
        p_knowledge_base_id: knowledgeBaseId,
        p_user_id: user.id,
      }
    );

    if (vectorError) {
      console.error("Vector search error:", vectorError);
    }

    // Step 3: Find related graph nodes by embedding similarity
    const { data: matchedNodes, error: nodeMatchError } = await supabase.rpc(
      "match_knowledge_nodes",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 5,
        p_knowledge_base_id: knowledgeBaseId,
        p_user_id: user.id,
      }
    );

    // Step 4: Also search nodes by name/description keyword matching
    const { data: keywordNodes } = await supabase
      .from("knowledge_nodes")
      .select("id, name, node_type, description, importance_score")
      .eq("knowledge_base_id", knowledgeBaseId)
      .eq("user_id", user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(5);

    // Combine matched and keyword nodes
    const anchorNodeIds = new Set<string>();
    const anchorNodes: any[] = [];

    [...(matchedNodes || []), ...(keywordNodes || [])].forEach((node) => {
      if (!anchorNodeIds.has(node.id)) {
        anchorNodeIds.add(node.id);
        anchorNodes.push(node);
      }
    });

    // Step 5: Graph traversal - expand from anchor nodes
    let expandedNodes: any[] = [];
    let graphEdges: any[] = [];

    if (anchorNodes.length > 0) {
      const anchorIdArray = Array.from(anchorNodeIds);

      // Get expanded nodes via traversal function
      const { data: traversalResult, error: traversalError } = await supabase.rpc(
        "traverse_knowledge_graph",
        {
          p_node_ids: anchorIdArray,
          p_depth: graphDepth,
          p_user_id: user.id,
        }
      );

      if (traversalResult) {
        expandedNodes = traversalResult.filter((n: any) => n.depth > 0);
      }

      // Get edges between all nodes
      const allNodeIds = [...anchorIdArray, ...expandedNodes.map((n: any) => n.node_id)];
      
      const { data: edges } = await supabase
        .from("knowledge_edges")
        .select("id, source_node_id, target_node_id, relation_type, description, strength")
        .eq("knowledge_base_id", knowledgeBaseId)
        .or(`source_node_id.in.(${allNodeIds.join(",")}),target_node_id.in.(${allNodeIds.join(",")})`);

      graphEdges = edges || [];
    }

    // Step 6: Generate enriched context
    let enrichedContext = "";

    // Add vector results
    if (vectorResults && vectorResults.length > 0) {
      enrichedContext += "## 直接相关文档片段\n\n";
      vectorResults.forEach((result: any, i: number) => {
        enrichedContext += `### 片段 ${i + 1} (相似度: ${(result.similarity * 100).toFixed(1)}%)\n`;
        enrichedContext += result.content + "\n\n";
      });
    }

    // Add graph context
    if (anchorNodes.length > 0) {
      enrichedContext += "\n## 语义图谱上下文\n\n";
      
      enrichedContext += "### 核心实体\n";
      anchorNodes.forEach((node) => {
        enrichedContext += `- **${node.name}** (${node.node_type}): ${node.description || "无描述"}\n`;
      });

      if (expandedNodes.length > 0) {
        enrichedContext += "\n### 关联实体\n";
        expandedNodes.forEach((node: any) => {
          enrichedContext += `- ${node.node_name} (${node.node_type}): ${node.relation_path}\n`;
        });
      }

      if (graphEdges.length > 0) {
        enrichedContext += "\n### 关键关系\n";
        // Create a map of node IDs to names
        const nodeNameMap: Record<string, string> = {};
        anchorNodes.forEach((n) => { nodeNameMap[n.id] = n.name; });
        expandedNodes.forEach((n: any) => { nodeNameMap[n.node_id] = n.node_name; });

        graphEdges.slice(0, 10).forEach((edge) => {
          const sourceName = nodeNameMap[edge.source_node_id] || "未知";
          const targetName = nodeNameMap[edge.target_node_id] || "未知";
          enrichedContext += `- ${sourceName} → ${edge.relation_type} → ${targetName}\n`;
        });
      }
    }

    return new Response(JSON.stringify({
      vectorResults: vectorResults || [],
      graphContext: {
        anchorNodes,
        expandedNodes,
        edges: graphEdges,
      },
      enrichedContext,
      stats: {
        chunksFound: vectorResults?.length || 0,
        anchorNodesFound: anchorNodes.length,
        expandedNodesFound: expandedNodes.length,
        edgesFound: graphEdges.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Graph search error:", error);
    return new Response(JSON.stringify({ 
      error: error?.message || "Failed to perform graph search" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});