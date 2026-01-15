import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Sensitive field patterns to redact from webhook payloads and responses
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /bearer/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /session/i,
  /cookie/i,
  /jwt/i,
  /authorization/i,
  /x-api-key/i,
  /x-auth/i,
];

// Sanitize sensitive data from objects before storing
function sanitizePayload(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return "[DEPTH_LIMIT]";
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === "string") {
    // Truncate very long strings
    if (obj.length > 500) {
      return obj.substring(0, 500) + "...[TRUNCATED]";
    }
    return obj;
  }
  
  if (typeof obj !== "object") return obj;
  
  if (Array.isArray(obj)) {
    // Limit array length
    const limited = obj.slice(0, 50);
    return limited.map(item => sanitizePayload(item, depth + 1));
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Check if key matches sensitive patterns
    const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
    
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizePayload(value, depth + 1);
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + "...[TRUNCATED]";
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Sanitize response body string
function sanitizeResponseBody(body: string): string {
  if (!body) return body;
  
  // Truncate very long responses
  let sanitized = body.length > 5000 ? body.substring(0, 5000) + "...[TRUNCATED]" : body;
  
  // Try to parse as JSON and sanitize
  try {
    const parsed = JSON.parse(sanitized);
    const sanitizedObj = sanitizePayload(parsed);
    return JSON.stringify(sanitizedObj);
  } catch {
    // Not JSON, apply basic redaction patterns to the string
    for (const pattern of SENSITIVE_PATTERNS) {
      // Create a global version of the pattern to match key-value pairs
      const keyValuePattern = new RegExp(
        `("${pattern.source}"\\s*:\\s*)"[^"]*"`,
        "gi"
      );
      sanitized = sanitized.replace(keyValuePattern, '$1"[REDACTED]"');
    }
    return sanitized;
  }
}

interface WebhookPayload {
  agentId: string;
  eventType: string;
  data: Record<string, unknown>;
}

interface Webhook {
  id: string;
  url: string;
  secret: string | null;
  headers: Record<string, string>;
  retry_count: number;
  timeout_ms: number;
  user_id: string;
  agent_id: string;
  total_triggers: number;
  successful_triggers: number;
  failed_triggers: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    const { agentId, eventType, data } = payload;

    if (!agentId || !eventType) {
      return new Response(
        JSON.stringify({ error: "agentId and eventType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Webhook trigger: agent=${agentId}, event=${eventType}`);

    // Get active webhooks for this agent and event
    const { data: webhooks, error: webhookError } = await supabase
      .from("agent_webhooks")
      .select("*")
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .contains("events", [eventType]);

    if (webhookError) {
      console.error("Error fetching webhooks:", webhookError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active webhooks for this event", triggered: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger webhooks in background
    const triggerPromises = webhooks.map((webhook: Webhook) =>
      triggerWebhook(supabase, webhook, eventType, data)
    );

    // Execute all triggers
    Promise.allSettled(triggerPromises).catch(console.error);

    return new Response(
      JSON.stringify({ 
        message: "Webhooks triggered", 
        triggered: webhooks.length,
        webhookIds: webhooks.map((w: Webhook) => w.id)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook trigger error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later.", code: "WEBHOOK_TRIGGER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function triggerWebhook(
  supabase: any,
  webhook: Webhook,
  eventType: string,
  data: Record<string, unknown>
) {
  const maxRetries = webhook.retry_count || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    
    try {
      // Build payload
      const webhookPayload = {
        event: eventType,
        agent_id: webhook.agent_id,
        timestamp: new Date().toISOString(),
        data,
      };

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "AgentOS-Webhook/1.0",
        "X-Webhook-Event": eventType,
        "X-Webhook-Delivery": crypto.randomUUID(),
        ...((webhook.headers as Record<string, string>) || {}),
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        const payloadString = JSON.stringify(webhookPayload);
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(webhook.secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const signature = await crypto.subtle.sign(
          "HMAC",
          key,
          encoder.encode(payloadString)
        );
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        headers["X-Webhook-Signature"] = `sha256=${signatureHex}`;
      }

      // Send request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_ms || 30000);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      const responseBody = await response.text().catch(() => "");

      // Sanitize payload and response before logging
      const sanitizedPayload = sanitizePayload(webhookPayload);
      const sanitizedResponseBody = sanitizeResponseBody(responseBody);

      // Log the attempt with sanitized data
      await supabase.from("webhook_logs").insert({
        webhook_id: webhook.id,
        agent_id: webhook.agent_id,
        user_id: webhook.user_id,
        event_type: eventType,
        payload: sanitizedPayload,
        response_status: response.status,
        response_body: sanitizedResponseBody,
        latency_ms: latencyMs,
        attempt_number: attempt,
        success: response.ok,
        error_message: response.ok ? null : `HTTP ${response.status}`,
      });

      if (response.ok) {
        // Update webhook stats
        await supabase
          .from("agent_webhooks")
          .update({
            last_triggered_at: new Date().toISOString(),
            total_triggers: webhook.total_triggers + 1,
            successful_triggers: webhook.successful_triggers + 1,
          })
          .eq("id", webhook.id);

        console.log(`Webhook ${webhook.id} triggered successfully on attempt ${attempt}`);
        return { success: true, attempt };
      }

      lastError = new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`);
      console.warn(`Webhook ${webhook.id} failed on attempt ${attempt}: ${lastError.message}`);

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`Webhook ${webhook.id} error on attempt ${attempt}:`, lastError.message);

      // Sanitize payload before logging failed attempt
      const sanitizedFailedPayload = sanitizePayload({ 
        event: eventType, 
        agent_id: webhook.agent_id, 
        data 
      });

      // Log the failed attempt with sanitized data
      await supabase.from("webhook_logs").insert({
        webhook_id: webhook.id,
        agent_id: webhook.agent_id,
        user_id: webhook.user_id,
        event_type: eventType,
        payload: sanitizedFailedPayload,
        latency_ms: latencyMs,
        attempt_number: attempt,
        success: false,
        error_message: lastError.message,
      });
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // All retries failed
  await supabase
    .from("agent_webhooks")
    .update({
      last_triggered_at: new Date().toISOString(),
      total_triggers: webhook.total_triggers + 1,
      failed_triggers: webhook.failed_triggers + 1,
    })
    .eq("id", webhook.id);

  return { success: false, error: lastError?.message };
}
