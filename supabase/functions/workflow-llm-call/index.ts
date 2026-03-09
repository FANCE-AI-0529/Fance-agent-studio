import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

interface LLMCallRequest {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  structuredOutput?: {
    enabled: boolean;
    schema?: Record<string, unknown>;
  };
  context?: unknown;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Mandatory auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: LLMCallRequest = await req.json();
    const AI_API_KEY = Deno.env.get("FANCE_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

    if (!AI_API_KEY) {
      throw new Error("AI API key is not configured");
    }

    const model = requestData.model || "google/gemini-3-flash-preview";
    const messages = [...(requestData.messages || [])];

    if (requestData.systemPrompt) {
      messages.unshift({ role: "system", content: requestData.systemPrompt });
    }

    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: requestData.temperature ?? 0.7,
      top_p: requestData.topP ?? 1.0,
      max_tokens: requestData.maxTokens ?? 4096,
      stream: requestData.stream ?? false,
    };

    if (requestData.structuredOutput?.enabled && requestData.structuredOutput?.schema) {
      body.tools = [
        {
          type: "function",
          function: {
            name: "structured_output",
            description: "Return structured data matching the specified schema",
            parameters: requestData.structuredOutput.schema,
          },
        },
      ];
      body.tool_choice = { type: "function", function: { name: "structured_output" } };
    }

    const response = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ error: "AI gateway error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requestData.stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    
    let structuredOutput = null;
    if (requestData.structuredOutput?.enabled) {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          structuredOutput = JSON.parse(toolCall.function.arguments);
        } catch {
          console.error("Failed to parse structured output");
        }
      }
    }

    const result = {
      success: true,
      text: data.choices?.[0]?.message?.content || "",
      structuredOutput,
      metadata: {
        model: data.model,
        usage: data.usage,
        finishReason: data.choices?.[0]?.finish_reason,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("workflow-llm-call error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } }
    );
  }
});
