import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedNode {
  name: string;
  type: string;
  description: string;
  importance: number;
}

interface ExtractedEdge {
  source: string;
  target: string;
  relation: string;
  label: string;
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { knowledgeBaseId, documentId } = await req.json();

    if (!knowledgeBaseId) {
      return new Response(JSON.stringify({ error: "Knowledge base ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch chunks to extract from
    let chunksQuery = supabase
      .from("document_chunks")
      .select("id, content, chunk_index, document_id")
      .eq("knowledge_base_id", knowledgeBaseId)
      .eq("user_id", user.id);

    if (documentId) {
      chunksQuery = chunksQuery.eq("document_id", documentId);
    }

    const { data: chunks, error: chunksError } = await chunksQuery;

    if (chunksError) {
      throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        nodesCreated: 0, 
        edgesCreated: 0,
        message: "No chunks to process" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Combine chunks for extraction (limit to prevent token overflow)
    const combinedContent = chunks
      .slice(0, 10)
      .map((c, i) => `[Chunk ${i + 1}]:\n${c.content}`)
      .join("\n\n");

    // Call Lovable AI Gateway for entity extraction
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a knowledge graph extraction expert. Extract entities and relationships from the given text.
Focus on:
- People, organizations, concepts, locations, events, products, technologies
- Relationships between entities (manages, belongs_to, uses, causes, relates_to, follows, etc.)
Return structured data using the provided function.`
          },
          {
            role: "user",
            content: `Extract entities and relationships from this content:\n\n${combinedContent}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_knowledge_graph",
            description: "Extract entities and relationships from text",
            parameters: {
              type: "object",
              properties: {
                nodes: {
                  type: "array",
                  description: "List of extracted entities",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Entity name" },
                      type: { 
                        type: "string", 
                        enum: ["person", "organization", "concept", "location", "event", "product", "technology"],
                        description: "Entity type"
                      },
                      description: { type: "string", description: "Brief description" },
                      importance: { type: "number", minimum: 0, maximum: 1, description: "Importance score" }
                    },
                    required: ["name", "type", "description", "importance"]
                  }
                },
                edges: {
                  type: "array",
                  description: "List of relationships between entities",
                  items: {
                    type: "object",
                    properties: {
                      source: { type: "string", description: "Source entity name" },
                      target: { type: "string", description: "Target entity name" },
                      relation: { 
                        type: "string", 
                        enum: ["manages", "belongs_to", "uses", "causes", "relates_to", "follows", "creates", "contains"],
                        description: "Relationship type"
                      },
                      label: { type: "string", description: "Human readable relationship description" }
                    },
                    required: ["source", "target", "relation", "label"]
                  }
                }
              },
              required: ["nodes", "edges"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_knowledge_graph" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ 
        success: true, 
        nodesCreated: 0, 
        edgesCreated: 0,
        message: "No entities extracted" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    const nodes: ExtractedNode[] = extractedData.nodes || [];
    const edges: ExtractedEdge[] = extractedData.edges || [];

    // Insert nodes
    const nodeNameToId: Record<string, string> = {};
    let nodesCreated = 0;

    for (const node of nodes) {
      // Check if node already exists
      const { data: existing } = await supabase
        .from("knowledge_nodes")
        .select("id")
        .eq("knowledge_base_id", knowledgeBaseId)
        .eq("name", node.name)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        nodeNameToId[node.name] = existing.id;
        // Update occurrence count
        await supabase
          .from("knowledge_nodes")
          .update({ occurrence_count: supabase.rpc("increment", { x: 1 }) })
          .eq("id", existing.id);
      } else {
        const { data: newNode, error: insertError } = await supabase
          .from("knowledge_nodes")
          .insert({
            knowledge_base_id: knowledgeBaseId,
            document_id: documentId || null,
            user_id: user.id,
            name: node.name,
            node_type: node.type,
            description: node.description,
            importance_score: node.importance,
          })
          .select("id")
          .single();

        if (newNode) {
          nodeNameToId[node.name] = newNode.id;
          nodesCreated++;
        }
      }
    }

    // Insert edges
    let edgesCreated = 0;

    for (const edge of edges) {
      const sourceId = nodeNameToId[edge.source];
      const targetId = nodeNameToId[edge.target];

      if (sourceId && targetId) {
        // Check if edge already exists
        const { data: existingEdge } = await supabase
          .from("knowledge_edges")
          .select("id")
          .eq("source_node_id", sourceId)
          .eq("target_node_id", targetId)
          .eq("relation_type", edge.relation)
          .single();

        if (!existingEdge) {
          const { error: edgeError } = await supabase
            .from("knowledge_edges")
            .insert({
              knowledge_base_id: knowledgeBaseId,
              user_id: user.id,
              source_node_id: sourceId,
              target_node_id: targetId,
              relation_type: edge.relation,
              description: edge.label,
            });

          if (!edgeError) {
            edgesCreated++;
          }
        }
      }
    }

    // Update knowledge base graph_enabled flag
    await supabase
      .from("knowledge_bases")
      .update({ graph_enabled: true })
      .eq("id", knowledgeBaseId);

    return new Response(JSON.stringify({
      success: true,
      nodesCreated,
      edgesCreated,
      totalNodes: nodes.length,
      totalEdges: edges.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Graph extraction error:", error);
    return new Response(JSON.stringify({ 
      error: error?.message || "Failed to extract graph" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});