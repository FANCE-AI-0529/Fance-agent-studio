import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChunkResult {
  content: string;
  index: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Use anon client for auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting ingestion for document: ${documentId}`);

    // Get document
    const { data: document, error: docError } = await supabase
      .from("knowledge_documents")
      .select("*, knowledge_bases(*)")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      console.error("Document not found:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from("knowledge_documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    try {
      const knowledgeBase = document.knowledge_bases;
      const chunkSize = knowledgeBase.chunk_size || 512;
      const chunkOverlap = knowledgeBase.chunk_overlap || 50;

      // Get content to chunk
      const content = document.content || "";
      if (!content) {
        throw new Error("Document has no content");
      }

      // Chunk the content
      const chunks = chunkText(content, chunkSize, chunkOverlap);
      console.log(`Created ${chunks.length} chunks`);

      // Delete existing chunks for this document
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId);

      // Generate embeddings and store chunks
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      for (const chunk of chunks) {
        // Generate embedding (using mock for now)
        const embedding = generateMockEmbedding(chunk.content);

        // Insert chunk with embedding
        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert({
            document_id: documentId,
            knowledge_base_id: document.knowledge_base_id,
            user_id: user.id,
            content: chunk.content,
            embedding: `[${embedding.join(",")}]`,
            chunk_index: chunk.index,
            token_count: chunk.tokenCount,
            metadata: chunk.metadata,
          });

        if (insertError) {
          console.error("Error inserting chunk:", insertError);
          throw insertError;
        }
      }

      // Update document status
      await supabase
        .from("knowledge_documents")
        .update({ 
          status: "indexed",
          chunks_count: chunks.length,
          error_message: null,
        })
        .eq("id", documentId);

      // Update knowledge base status if all documents are indexed
      const { data: pendingDocs } = await supabase
        .from("knowledge_documents")
        .select("id")
        .eq("knowledge_base_id", document.knowledge_base_id)
        .in("status", ["pending", "processing"]);

      if (!pendingDocs || pendingDocs.length === 0) {
        await supabase
          .from("knowledge_bases")
          .update({ index_status: "ready" })
          .eq("id", document.knowledge_base_id);
      }

      console.log(`Successfully indexed document: ${documentId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          chunksCount: chunks.length,
          documentId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (processingError) {
      console.error("Processing error:", processingError);
      
      // Update status to failed
      await supabase
        .from("knowledge_documents")
        .update({ 
          status: "failed",
          error_message: processingError instanceof Error ? processingError.message : "Unknown error",
        })
        .eq("id", documentId);

      await supabase
        .from("knowledge_bases")
        .update({ index_status: "failed" })
        .eq("id", document.knowledge_base_id);

      throw processingError;
    }
  } catch (error) {
    console.error("Error in rag-ingest:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function chunkText(text: string, chunkSize: number, overlap: number): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  const sentences = text.split(/(?<=[.!?。！？])\s+/);
  
  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > chunkSize && currentChunk) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: currentTokens,
        metadata: {},
      });
      chunkIndex++;

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + " " + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: currentTokens,
      metadata: {},
    });
  }

  return chunks;
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English, ~2 for Chinese
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}

function getOverlapText(text: string, targetTokens: number): string {
  const words = text.split(/\s+/);
  let overlapText = "";
  let tokens = 0;
  
  for (let i = words.length - 1; i >= 0 && tokens < targetTokens; i--) {
    overlapText = words[i] + (overlapText ? " " + overlapText : "");
    tokens = estimateTokens(overlapText);
  }
  
  return overlapText;
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
