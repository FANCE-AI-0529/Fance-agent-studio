import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Request size limit (1MB)
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1048576) {
    return new Response(
      JSON.stringify({ error: "Request too large" }),
      { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      console.error("No API key provided");
      return new Response(
        JSON.stringify({ 
          error: "API key required",
          message: "Please provide your API key in the x-api-key header or Authorization header"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the provided API key for secure comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Validate API key using hash comparison
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("agent_api_keys")
      .select(`
        id,
        agent_id,
        user_id,
        is_active,
        rate_limit,
        expires_at,
        agents (
          id,
          name,
          model,
          manifest,
          status
        )
      `)
      .eq("api_key_hash", apiKeyHash)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error("Invalid API key: hash mismatch");
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if key is active
    if (!apiKeyData.is_active) {
      return new Response(
        JSON.stringify({ error: "API key is disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "API key has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if agent is deployed
    const agent = apiKeyData.agents as any;
    if (!agent || agent.status !== "deployed") {
      return new Response(
        JSON.stringify({ error: "Agent is not deployed or does not exist" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    const { messages, stream = false, temperature = 0.7, max_tokens = 4096 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt from agent manifest with terminal style
    const manifest = agent.manifest as any;
    const systemPrompt = manifest?.system_prompt || `You are ${agent.name}, an AI assistant.`;
    const skills = manifest?.skills?.details || [];
    
    // Terminal style instructions with role meta protocol
    const terminalStyle = `
响应格式：禁用 # 标题。使用 [标题]、---、[v]/[x]/(!)、┌─├─└─│ 结构符号。禁止使用 **双星号**，改用「书名号」包裹关键词。

每次回复开头必须包含元数据标签：
- 规划架构时: <meta role="architect" mood="neutral" />
- 编写代码时: <meta role="engineer" mood="neutral" />
- 检索知识时: <meta role="researcher" mood="neutral" />
- 安全警告时: <meta role="auditor" mood="warning" />
`;
    
    let enhancedSystemPrompt = systemPrompt + terminalStyle;
    if (skills.length > 0) {
      const skillDescriptions = skills
        .map((s: any) => `- ${s.name}: ${s.description || 'No description'}`)
        .join("\n");
      enhancedSystemPrompt += `\n\nYou have the following capabilities:\n${skillDescriptions}`;
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages
    ];

    console.log(`Agent API call: agent=${agent.name}, messages=${messages.length}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream,
        temperature,
        max_tokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service quota exceeded" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate latency
    const latencyMs = Date.now() - startTime;

    // For streaming, return the stream directly
    if (stream) {
      // Log the API call asynchronously (don't await)
      supabase.from("agent_api_logs").insert({
        api_key_id: apiKeyData.id,
        agent_id: apiKeyData.agent_id,
        user_id: apiKeyData.user_id,
        request_body: { messages, stream, temperature, max_tokens },
        response_body: { streaming: true },
        status_code: 200,
        latency_ms: latencyMs,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      }).then(() => {});

      return new Response(aiResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For non-streaming, parse and return
    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content || "";
    const tokensUsed = aiData.usage?.total_tokens || 0;

    // Log the API call
    await supabase.from("agent_api_logs").insert({
      api_key_id: apiKeyData.id,
      agent_id: apiKeyData.agent_id,
      user_id: apiKeyData.user_id,
      request_body: { messages, stream, temperature, max_tokens },
      response_body: aiData,
      status_code: 200,
      latency_ms: latencyMs,
      tokens_used: tokensUsed,
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    });

    // Return response in OpenAI-compatible format
    return new Response(
      JSON.stringify({
        id: `agos-${crypto.randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: agent.model,
        agent: {
          id: agent.id,
          name: agent.name,
        },
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: responseContent,
            },
            finish_reason: "stop",
          },
        ],
        usage: aiData.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: tokensUsed,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Agent API error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        code: "AGENT_API_ERROR"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
