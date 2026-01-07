import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      query, 
      knowledgeBaseId, 
      topK = 5, 
      threshold = 0.7 
    } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`RAG query: "${query.substring(0, 50)}..." for user: ${user.id}`);

    // Generate query embedding
    const queryEmbedding = generateMockEmbedding(query);
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Call the vector similarity search function
    const { data: chunks, error: searchError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: topK,
        p_knowledge_base_id: knowledgeBaseId || null,
        p_user_id: user.id,
      }
    );

    if (searchError) {
      console.error("Search error:", searchError);
      throw searchError;
    }

    console.log(`Found ${chunks?.length || 0} matching chunks`);

    // Build context from chunks
    let context = "";
    let tokenCount = 0;

    if (chunks && chunks.length > 0) {
      const contextParts: string[] = [];
      
      for (const chunk of chunks) {
        contextParts.push(`[相关度: ${(chunk.similarity * 100).toFixed(1)}%]\n${chunk.content}`);
        tokenCount += estimateTokens(chunk.content);
      }
      
      context = contextParts.join("\n\n---\n\n");
    }

    return new Response(
      JSON.stringify({
        chunks: chunks || [],
        context,
        tokenCount,
        query,
        knowledgeBaseId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in rag-query:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}

function generateMockEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (charCode * (i + 1) * (j + 1)) % 1536;
      embedding[index] += 0.1 / Math.sqrt(words.length);
    }
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}
