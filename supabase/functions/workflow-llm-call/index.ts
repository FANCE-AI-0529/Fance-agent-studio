import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: LLMCallRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const model = requestData.model || "google/gemini-3-flash-preview";
    const messages = [...(requestData.messages || [])];

    // Prepend system prompt if provided
    if (requestData.systemPrompt) {
      messages.unshift({ role: "system", content: requestData.systemPrompt });
    }

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: requestData.temperature ?? 0.7,
      top_p: requestData.topP ?? 1.0,
      max_tokens: requestData.maxTokens ?? 4096,
      stream: requestData.stream ?? false,
    };

    // Add structured output using tool calling if enabled
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle streaming response
    if (requestData.stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Handle regular response
    const data = await response.json();
    
    // Extract structured output if using tool calling
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
    console.error("workflow-llm-call error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
