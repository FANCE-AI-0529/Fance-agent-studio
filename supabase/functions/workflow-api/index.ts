import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Extract slug from path: /workflow-api/{slug}
    const pathParts = url.pathname.split("/").filter(Boolean);
    const slug = pathParts[pathParts.length - 1];

    if (!slug || slug === "workflow-api") {
      return new Response(
        JSON.stringify({ error: "Missing workflow API slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate via x-api-key header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing x-api-key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: keyData } = await adminClient.rpc("validate_api_key", { provided_key: apiKey });
    
    if (!keyData || keyData.length === 0 || !keyData[0].is_active) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyRecord = keyData[0];

    // Check expiry
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "API key expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up published API by slug and owner
    const { data: api, error: apiError } = await adminClient
      .from("workflow_published_apis")
      .select("*")
      .eq("slug", slug)
      .eq("user_id", keyRecord.user_id)
      .eq("is_active", true)
      .single();

    if (apiError || !api) {
      return new Response(
        JSON.stringify({ error: "Workflow API not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body as inputs
    let inputs: Record<string, unknown> = {};
    if (req.method === "POST") {
      try {
        inputs = await req.json();
      } catch {
        // empty body is ok
      }
    }

    // Call workflow-executor internally (synchronous mode)
    const executorUrl = `${SUPABASE_URL}/functions/v1/workflow-executor`;
    const startTime = Date.now();

    const execResponse = await fetch(executorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        workflowId: api.workflow_id,
        nodes: api.nodes,
        edges: api.edges,
        inputs,
        mode: "workflow",
      }),
    });

    // Read SSE stream and collect final result
    const reader = execResponse.body?.getReader();
    if (!reader) {
      throw new Error("No response from workflow executor");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: Record<string, unknown> = {};
    let finalStatus = "completed";
    let totalTokens = 0;
    let errorMsg: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === "workflow_complete") {
              finalResult = (data.outputs || {}) as Record<string, unknown>;
              finalStatus = data.status || "completed";
              totalTokens = data.totalTokens || 0;
            } else if (currentEvent === "workflow_error") {
              errorMsg = data.error as string;
              finalStatus = "failed";
            }
          } catch { /* skip */ }
          currentEvent = "";
        }
      }
    }

    const latency = Date.now() - startTime;

    // Update call stats
    await adminClient
      .from("workflow_published_apis")
      .update({
        total_calls: (api.total_calls || 0) + 1,
        avg_latency_ms: Math.round(((api.avg_latency_ms || 0) * (api.total_calls || 0) + latency) / ((api.total_calls || 0) + 1)),
      })
      .eq("id", api.id);

    if (finalStatus === "failed") {
      return new Response(
        JSON.stringify({ error: errorMsg || "Workflow execution failed", status: "failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        data: finalResult,
        meta: {
          latency_ms: latency,
          tokens_used: totalTokens,
          api_version: api.version,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("workflow-api error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
