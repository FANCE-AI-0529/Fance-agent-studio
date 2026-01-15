import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// PDF text extraction utilities
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  // Simple PDF text extraction - extracts text streams from PDF
  const bytes = new Uint8Array(pdfBuffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  const extractedParts: string[] = [];
  
  // Method 1: Extract text from stream objects (BT...ET blocks)
  const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtPattern.exec(text)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjPattern = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(block)) !== null) {
      const decoded = decodeEscapedString(tjMatch[1]);
      if (decoded.trim()) {
        extractedParts.push(decoded);
      }
    }
    
    // Extract from TJ arrays
    const tjArrayPattern = /\[((?:[^\[\]]*|\[(?:[^\[\]]*|\[[^\[\]]*\])*\])*)\]\s*TJ/gi;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayPattern.exec(block)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const stringPattern = /\(((?:[^()\\]|\\.)*)\)/g;
      let strMatch;
      while ((strMatch = stringPattern.exec(arrayContent)) !== null) {
        const decoded = decodeEscapedString(strMatch[1]);
        if (decoded.trim()) {
          extractedParts.push(decoded);
        }
      }
    }
  }

  // Method 2: Extract from Unicode streams (common in Chinese PDFs)
  const unicodePattern = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((match = unicodePattern.exec(text)) !== null) {
    const hexString = match[1];
    const decoded = decodeHexString(hexString);
    if (decoded.trim()) {
      extractedParts.push(decoded);
    }
  }
  
  // Method 3: Look for plain text patterns (some PDFs have readable text)
  const plainTextPattern = /\/Contents\s*\(([^)]+)\)/g;
  while ((match = plainTextPattern.exec(text)) !== null) {
    const content = match[1];
    if (content.trim() && !content.includes('\\') && content.length > 10) {
      extractedParts.push(content);
    }
  }
  
  // Join and clean up
  let result = extractedParts.join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If we got very little text, try alternative extraction
  if (result.length < 100) {
    const altResult = extractPlainTextFallback(text);
    if (altResult.length > result.length) {
      result = altResult;
    }
  }
  
  return result;
}

function decodeEscapedString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, '$1');
}

function decodeHexString(hex: string): string {
  let result = '';
  // Try UTF-16BE first (common for CJK)
  if (hex.length % 4 === 0) {
    for (let i = 0; i < hex.length; i += 4) {
      const code = parseInt(hex.substr(i, 4), 16);
      if (code > 0) {
        result += String.fromCharCode(code);
      }
    }
    // Check if result looks like valid text
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result) || /[a-zA-Z0-9]/.test(result)) {
      return result;
    }
  }
  // Fallback to single-byte
  result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substr(i, 2), 16);
    if (code > 31 && code < 127) {
      result += String.fromCharCode(code);
    }
  }
  return result;
}

function extractPlainTextFallback(text: string): string {
  // Look for readable ASCII sequences
  const readableChars: string[] = [];
  let currentWord = '';
  
  for (const char of text) {
    const code = char.charCodeAt(0);
    // Printable ASCII or Chinese characters
    if ((code >= 32 && code <= 126) || (code >= 0x4e00 && code <= 0x9fff)) {
      currentWord += char;
    } else {
      if (currentWord.length > 3) {
        readableChars.push(currentWord);
      }
      currentWord = '';
    }
  }
  if (currentWord.length > 3) {
    readableChars.push(currentWord);
  }
  
  return readableChars.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u4e00-\u9fff\u3000-\u303f，。！？、；：""''（）【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch file content from storage
async function fetchFileFromStorage(
  supabase: any,
  userId: string,
  knowledgeBaseId: string,
  fileName: string
): Promise<{ content: string; success: boolean; error?: string }> {
  try {
    const filePath = `${userId}/${knowledgeBaseId}/${fileName}`;
    console.log(`Fetching file from storage: ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from('knowledge-documents')
      .download(filePath);
    
    if (error) {
      console.error('Storage download error:', error);
      return { content: '', success: false, error: error.message };
    }
    
    if (!data) {
      return { content: '', success: false, error: 'File not found in storage' };
    }
    
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // Handle different file types
    if (fileExtension === 'pdf') {
      const buffer = await data.arrayBuffer();
      const extractedText = await extractTextFromPDF(buffer);
      console.log(`Extracted ${extractedText.length} chars from PDF`);
      return { content: extractedText, success: true };
    } else if (['txt', 'md', 'json'].includes(fileExtension || '')) {
      const textContent = await data.text();
      return { content: textContent, success: true };
    } else {
      // Try to read as text
      const textContent = await data.text();
      return { content: textContent, success: true };
    }
  } catch (err) {
    console.error('Error fetching file from storage:', err);
    return { 
      content: '', 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

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

      // Get content to chunk - first check database, then try storage
      let content = document.content || "";
      
      if (!content || content.trim().length === 0) {
        console.log("No content in database, attempting to fetch from storage...");
        
        // Try to extract content from storage file
        const storageResult = await fetchFileFromStorage(
          supabase,
          user.id,
          document.knowledge_base_id,
          document.name
        );
        
        if (storageResult.success && storageResult.content.trim().length > 0) {
          content = storageResult.content;
          console.log(`Successfully extracted ${content.length} chars from storage`);
          
          // Update the document with extracted content
          await supabase
            .from("knowledge_documents")
            .update({ content })
            .eq("id", documentId);
        } else {
          // Still no content - check if it's a "pure image" PDF
          const fileExtension = document.name?.split('.').pop()?.toLowerCase();
          const errorMessage = fileExtension === 'pdf' 
            ? "PDF文档为纯图片格式，无法提取文字内容。请使用包含可选择文字的PDF文档，或手动输入文档内容。"
            : "文档内容为空，请先上传或输入文档内容";
          
          await supabase
            .from("knowledge_documents")
            .update({ 
              status: "failed",
              error_message: errorMessage,
            })
            .eq("id", documentId);

          return new Response(
            JSON.stringify({ 
              error: "Document has no content", 
              message: errorMessage
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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
