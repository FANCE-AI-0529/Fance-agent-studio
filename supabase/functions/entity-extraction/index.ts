import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntityExtractionRequest {
  documentContent: string;
  documentName: string;
  agentId?: string;
}

interface ExtractedEntity {
  name: string;
  type: string;
  description: string;
  sourceContent: string;
  keywords?: string[];
}

interface ExtractedRelation {
  sourceEntity: string;
  targetEntity: string;
  relationType: string;
  description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aiApiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { documentContent, documentName, agentId }: EntityExtractionRequest = await req.json();

    if (!documentContent || !documentName) {
      return new Response(JSON.stringify({ error: "Missing documentContent or documentName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing document: ${documentName} for user: ${user.id}`);

    // Create document processing record
    const { data: docRecord, error: docError } = await supabase
      .from("document_processing")
      .insert({
        user_id: user.id,
        agent_id: agentId || null,
        document_name: documentName,
        document_content: documentContent.substring(0, 50000), // Limit stored content
        status: "processing",
      })
      .select()
      .single();

    if (docError) {
      console.error("Failed to create document record:", docError);
      throw new Error("Failed to create document record");
    }

    // Extract entities using tool calling for structured output
    console.log("Extracting entities...");
    const entityExtractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an expert at extracting structured entities and relationships from documents.
Extract entities of types: person, organization, document, location, concept, process, regulation.
Also identify relationships between entities.
For each entity, extract key keywords that can be used for matching.`,
          },
          {
            role: "user",
            content: `Extract entities and relationships from this document:\n\n${documentContent.substring(0, 10000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_entities",
              description: "Save extracted entities and relations",
              parameters: {
                type: "object",
                properties: {
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { 
                          type: "string", 
                          enum: ["person", "organization", "document", "location", "concept", "process", "regulation"]
                        },
                        description: { type: "string" },
                        sourceContent: { type: "string", description: "Relevant quote from document" },
                        keywords: {
                          type: "array",
                          items: { type: "string" },
                          description: "Keywords for matching"
                        }
                      },
                      required: ["name", "type", "description"]
                    }
                  },
                  relations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sourceEntity: { type: "string" },
                        targetEntity: { type: "string" },
                        relationType: {
                          type: "string",
                          enum: ["belongs_to", "requires", "provides", "located_at", "manages", "regulates", "processes", "related_to"]
                        },
                        description: { type: "string" }
                      },
                      required: ["sourceEntity", "targetEntity", "relationType"]
                    }
                  }
                },
                required: ["entities", "relations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "save_entities" } }
      }),
    });

    if (!entityExtractionResponse.ok) {
      const status = entityExtractionResponse.status;
      const errorText = await entityExtractionResponse.text();
      console.error("Entity extraction failed:", status, errorText);
      
      await supabase
        .from("document_processing")
        .update({ 
          status: "failed", 
          error_message: status === 429 ? "Rate limited" : status === 402 ? "Quota exceeded" : "Entity extraction failed" 
        })
        .eq("id", docRecord.id);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI服务额度不足", code: "QUOTA_EXCEEDED" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
        
      throw new Error("Entity extraction failed");
    }

    const extractionResult = await entityExtractionResponse.json();
    
    // Parse tool call response
    const toolCall = extractionResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response");
      await supabase
        .from("document_processing")
        .update({ status: "failed", error_message: "Invalid AI response format" })
        .eq("id", docRecord.id);
      throw new Error("Invalid AI response format");
    }

    let extractedData: { entities: ExtractedEntity[]; relations: ExtractedRelation[] };
    try {
      extractedData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse extraction result:", parseError);
      await supabase
        .from("document_processing")
        .update({ status: "failed", error_message: "Failed to parse extraction result" })
        .eq("id", docRecord.id);
      throw new Error("Failed to parse extraction result");
    }

    console.log(`Extracted ${extractedData.entities?.length || 0} entities and ${extractedData.relations?.length || 0} relations`);

    // Insert entities WITHOUT pseudo-embeddings - use keywords for matching instead
    const entitiesToInsert = (extractedData.entities || []).map((entity) => ({
      user_id: user.id,
      agent_id: agentId || null,
      name: entity.name,
      entity_type: entity.type,
      description: entity.description,
      source_document: documentName,
      source_content: entity.sourceContent || "",
      // Store keywords as metadata for text-based matching
      metadata: {
        keywords: entity.keywords || [],
        extracted_at: new Date().toISOString()
      },
      // Don't generate pseudo-embeddings - they're ineffective
      embedding: null,
    }));

    const { data: insertedEntities, error: insertError } = await supabase
      .from("entities")
      .insert(entitiesToInsert)
      .select();

    if (insertError) {
      console.error("Failed to insert entities:", insertError);
      await supabase
        .from("document_processing")
        .update({ status: "failed", error_message: "Failed to insert entities" })
        .eq("id", docRecord.id);
      throw new Error("Failed to insert entities");
    }

    // Create entity name to ID mapping (case-insensitive)
    const entityNameToId: Record<string, string> = {};
    for (const entity of insertedEntities || []) {
      entityNameToId[entity.name.toLowerCase()] = entity.id;
    }

    // Insert relations
    const relationsToInsert: Array<{
      user_id: string;
      source_entity_id: string;
      target_entity_id: string;
      relation_type: string;
      description: string;
    }> = [];

    for (const relation of extractedData.relations || []) {
      const sourceId = entityNameToId[relation.sourceEntity.toLowerCase()];
      const targetId = entityNameToId[relation.targetEntity.toLowerCase()];

      if (sourceId && targetId) {
        relationsToInsert.push({
          user_id: user.id,
          source_entity_id: sourceId,
          target_entity_id: targetId,
          relation_type: relation.relationType,
          description: relation.description || "",
        });
      }
    }

    let insertedRelationsCount = 0;
    if (relationsToInsert.length > 0) {
      const { data: insertedRelations, error: relError } = await supabase
        .from("entity_relations")
        .insert(relationsToInsert)
        .select();

      if (relError) {
        console.error("Failed to insert some relations:", relError);
      } else {
        insertedRelationsCount = insertedRelations?.length || 0;
      }
    }

    // Update document processing record
    await supabase
      .from("document_processing")
      .update({
        status: "completed",
        entities_count: insertedEntities?.length || 0,
        relations_count: insertedRelationsCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", docRecord.id);

    console.log(`Successfully processed document: ${documentName}`);
    console.log(`Entities: ${insertedEntities?.length || 0}, Relations: ${insertedRelationsCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        documentId: docRecord.id,
        entitiesCount: insertedEntities?.length || 0,
        relationsCount: insertedRelationsCount,
        entities: insertedEntities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Entity extraction error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An internal error occurred",
        code: "ENTITY_EXTRACTION_ERROR" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
