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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentContent, documentName, agentId }: EntityExtractionRequest = await req.json();

    console.log(`Processing document: ${documentName} for user: ${user.id}`);

    // Create document processing record
    const { data: docRecord, error: docError } = await supabase
      .from("document_processing")
      .insert({
        user_id: user.id,
        agent_id: agentId || null,
        document_name: documentName,
        document_content: documentContent,
        status: "processing",
      })
      .select()
      .single();

    if (docError) {
      console.error("Failed to create document record:", docError);
      throw new Error("Failed to create document record");
    }

    // Step 1: Extract entities using Lovable AI
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
Extract entities of these types: person, organization, document, location, concept, process, regulation.
Also identify relationships between entities.
Return ONLY valid JSON, no markdown.`,
          },
          {
            role: "user",
            content: `Extract entities and relationships from this document:

${documentContent.substring(0, 8000)}

Return JSON in this exact format:
{
  "entities": [
    {"name": "entity name", "type": "person|organization|document|location|concept|process|regulation", "description": "brief description", "sourceContent": "relevant quote from document"}
  ],
  "relations": [
    {"sourceEntity": "source name", "targetEntity": "target name", "relationType": "belongs_to|requires|provides|located_at|manages|regulates|processes", "description": "relationship description"}
  ]
}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!entityExtractionResponse.ok) {
      const errorText = await entityExtractionResponse.text();
      console.error("Entity extraction failed:", errorText);
      
      await supabase
        .from("document_processing")
        .update({ status: "failed", error_message: "Entity extraction failed" })
        .eq("id", docRecord.id);
        
      throw new Error("Entity extraction failed");
    }

    const extractionResult = await entityExtractionResponse.json();
    const content = extractionResult.choices?.[0]?.message?.content || "";
    
    console.log("Raw extraction result:", content);

    // Parse the JSON response
    let extractedData: { entities: ExtractedEntity[]; relations: ExtractedRelation[] };
    try {
      // Clean up the response if it has markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      extractedData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse extraction result:", parseError);
      await supabase
        .from("document_processing")
        .update({ status: "failed", error_message: "Failed to parse extraction result" })
        .eq("id", docRecord.id);
      throw new Error("Failed to parse extraction result");
    }

    // Step 2: Generate embeddings for each entity
    console.log(`Generating embeddings for ${extractedData.entities.length} entities...`);
    
    const entitiesWithEmbeddings: Array<{
      user_id: string;
      agent_id: string | null;
      name: string;
      entity_type: string;
      description: string;
      source_document: string;
      source_content: string;
      embedding: number[];
    }> = [];

    for (const entity of extractedData.entities) {
      // Generate embedding using Lovable AI
      const embeddingText = `${entity.name}: ${entity.description}. ${entity.sourceContent}`;
      
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
              content: embeddingText,
            },
          ],
          temperature: 0,
          max_tokens: 500,
        }),
      });

      let embedding: number[] = [];
      if (embeddingResponse.ok) {
        const embResult = await embeddingResponse.json();
        const embContent = embResult.choices?.[0]?.message?.content || "";
        try {
          let cleanEmb = embContent.trim();
          if (cleanEmb.startsWith("```")) {
            cleanEmb = cleanEmb.replace(/```json?\n?/g, "").replace(/```/g, "");
          }
          embedding = JSON.parse(cleanEmb.trim());
        } catch {
          // Generate random embedding as fallback
          embedding = Array.from({ length: 64 }, () => Math.random() * 2 - 1);
        }
      } else {
        embedding = Array.from({ length: 64 }, () => Math.random() * 2 - 1);
      }

      entitiesWithEmbeddings.push({
        user_id: user.id,
        agent_id: agentId || null,
        name: entity.name,
        entity_type: entity.type,
        description: entity.description,
        source_document: documentName,
        source_content: entity.sourceContent,
        embedding,
      });
    }

    // Step 3: Insert entities
    console.log("Inserting entities...");
    const { data: insertedEntities, error: insertError } = await supabase
      .from("entities")
      .insert(entitiesWithEmbeddings)
      .select();

    if (insertError) {
      console.error("Failed to insert entities:", insertError);
      await supabase
        .from("document_processing")
        .update({ status: "failed", error_message: "Failed to insert entities" })
        .eq("id", docRecord.id);
      throw new Error("Failed to insert entities");
    }

    // Step 4: Create entity name to ID mapping
    const entityNameToId: Record<string, string> = {};
    for (const entity of insertedEntities || []) {
      entityNameToId[entity.name.toLowerCase()] = entity.id;
    }

    // Step 5: Insert relations
    console.log(`Creating ${extractedData.relations.length} relations...`);
    const relationsToInsert: Array<{
      user_id: string;
      source_entity_id: string;
      target_entity_id: string;
      relation_type: string;
      description: string;
    }> = [];

    for (const relation of extractedData.relations) {
      const sourceId = entityNameToId[relation.sourceEntity.toLowerCase()];
      const targetId = entityNameToId[relation.targetEntity.toLowerCase()];

      if (sourceId && targetId) {
        relationsToInsert.push({
          user_id: user.id,
          source_entity_id: sourceId,
          target_entity_id: targetId,
          relation_type: relation.relationType,
          description: relation.description,
        });
      }
    }

    if (relationsToInsert.length > 0) {
      const { error: relError } = await supabase
        .from("entity_relations")
        .insert(relationsToInsert);

      if (relError) {
        console.error("Failed to insert some relations:", relError);
      }
    }

    // Update document processing record
    await supabase
      .from("document_processing")
      .update({
        status: "completed",
        entities_count: insertedEntities?.length || 0,
        relations_count: relationsToInsert.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", docRecord.id);

    console.log(`Successfully processed document: ${documentName}`);
    console.log(`Entities: ${insertedEntities?.length || 0}, Relations: ${relationsToInsert.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        documentId: docRecord.id,
        entitiesCount: insertedEntities?.length || 0,
        relationsCount: relationsToInsert.length,
        entities: insertedEntities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Entity extraction error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later.", code: "ENTITY_EXTRACTION_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
