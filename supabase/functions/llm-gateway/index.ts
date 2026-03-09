/**
 * @file llm-gateway/index.ts
 * @description Multi-provider LLM Gateway with AES-256-GCM encryption and mandatory auth
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- AES-256-GCM Encryption (replaces insecure XOR) ---

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("fance-llm-gateway-v1"), info: new Uint8Array(0) },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function decryptApiKey(encryptedBase64: string): Promise<string> {
  try {
    const raw = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    // Format: [12-byte IV][ciphertext+tag]
    if (raw.length < 28) {
      // Fallback: treat as legacy XOR (to be migrated)
      return decryptApiKeyLegacy(encryptedBase64);
    }
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    const key = await getEncryptionKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // Fallback to legacy for migration period
    return decryptApiKeyLegacy(encryptedBase64);
  }
}

// Legacy XOR decryption — kept temporarily for migration, will be removed
function decryptApiKeyLegacy(encryptedKey: string): string {
  const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || '';
  const keyBytes = new TextEncoder().encode(encryptionKey);
  const binaryString = atob(encryptedKey);
  const encryptedBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    encryptedBytes[i] = binaryString.charCodeAt(i);
  }
  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(decrypted);
}

// Provider-specific request formatters
const formatters: Record<string, (messages: Record<string, unknown>[], model: string, options: Record<string, unknown>) => Record<string, unknown>> = {
  openai: (messages, model, options) => ({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 4096,
    top_p: options.top_p ?? 1.0,
    frequency_penalty: options.frequency_penalty ?? 0,
    presence_penalty: options.presence_penalty ?? 0,
    stream: options.stream ?? false,
  }),

  anthropic: (messages, model, options) => {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    return {
      model,
      max_tokens: options.max_tokens ?? 4096,
      system: (systemMessage?.content as string) || '',
      messages: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };
  },

  google: (messages, model, options) => ({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 4096,
    stream: options.stream ?? false,
  }),

  azure: (messages, _model, options) => ({
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 4096,
    top_p: options.top_p ?? 1.0,
    frequency_penalty: options.frequency_penalty ?? 0,
    presence_penalty: options.presence_penalty ?? 0,
    stream: options.stream ?? false,
  }),

  lovable: (messages, model, options) => ({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 4096,
    stream: options.stream ?? false,
  }),

  custom: (messages, model, options) => ({
    model,
    messages,
    ...options,
  }),
};

// Response parsers
const parsers: Record<string, (response: Record<string, unknown>) => { content: string; usage?: Record<string, unknown> }> = {
  openai: (response) => ({
    content: (response.choices as { message: { content: string } }[])?.[0]?.message?.content || '',
    usage: response.usage as Record<string, unknown>,
  }),

  anthropic: (response) => ({
    content: (response.content as { text: string }[])?.[0]?.text || '',
    usage: response.usage as Record<string, unknown>,
  }),

  google: (response) => ({
    content: (response.choices as { message: { content: string } }[])?.[0]?.message?.content
      || (response.candidates as { content: { parts: { text: string }[] } }[])?.[0]?.content?.parts?.[0]?.text || '',
    usage: response.usageMetadata as Record<string, unknown>,
  }),

  azure: (response) => ({
    content: (response.choices as { message: { content: string } }[])?.[0]?.message?.content || '',
    usage: response.usage as Record<string, unknown>,
  }),

  lovable: (response) => ({
    content: (response.choices as { message: { content: string } }[])?.[0]?.message?.content || '',
    usage: response.usage as Record<string, unknown>,
  }),

  custom: (response) => ({
    content: (response.choices as { message: { content: string } }[])?.[0]?.message?.content || (response.content as string) || '',
    usage: response.usage as Record<string, unknown>,
  }),
};

function buildHeaders(providerType: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (providerType === 'anthropic') {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

interface LLMRequest {
  messages: Array<{ role: string; content: string }>;
  provider_id?: string;
  agent_id?: string;
  module_type?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  system_prompt?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Mandatory Authentication ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token", code: "AUTH_INVALID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId: string = claimsData.claims.sub as string;

    const body: LLMRequest = await req.json();
    const {
      messages,
      provider_id,
      agent_id,
      module_type = 'general',
      model: requestModel,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stream = false,
      system_prompt,
    } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let provider: Record<string, unknown> | null = null;
    let modelConfig: Record<string, unknown> | null = null;
    let modelName = requestModel;

    // Priority 1: Specific provider_id
    if (provider_id) {
      const { data } = await supabase
        .from("llm_providers")
        .select("*")
        .eq("id", provider_id)
        .eq("is_active", true)
        .single();
      provider = data;
    }

    // Priority 2: Agent + Module specific config
    if (!provider && agent_id && module_type) {
      const { data: config } = await supabase
        .from("llm_model_configs")
        .select("*, llm_providers(*)")
        .eq("agent_id", agent_id)
        .eq("module_type", module_type)
        .eq("is_active", true)
        .single();

      if (config?.llm_providers) {
        provider = config.llm_providers as Record<string, unknown>;
        modelConfig = config;
        modelName = config.model_name as string;
      }
    }

    // Priority 3: User's default provider
    if (!provider) {
      const { data } = await supabase
        .from("llm_providers")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .eq("is_active", true)
        .single();
      provider = data;
    }

    // Priority 4: Global admin default provider
    if (!provider) {
      const { data: adminUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminUsers?.length) {
        const adminUserIds = adminUsers.map((u: { user_id: string }) => u.user_id);

        const { data: adminProvider } = await supabase
          .from("llm_providers")
          .select("*")
          .in("user_id", adminUserIds)
          .eq("is_default", true)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (adminProvider) {
          provider = adminProvider;
        }
      }
    }

    // Priority 5: Fallback to platform AI
    if (!provider) {
      provider = {
        provider_type: 'lovable',
        api_endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
        api_key_name: 'LOVABLE_API_KEY',
        default_model: 'google/gemini-2.5-flash',
      };
    }

    // Get API key
    let apiKey: string | undefined;

    if (provider.api_key_encrypted) {
      apiKey = await decryptApiKey(provider.api_key_encrypted as string);
    }

    if (!apiKey && provider.api_key_name) {
      apiKey = Deno.env.get(provider.api_key_name as string);
    }

    if (!apiKey && provider.provider_type === 'lovable') {
      apiKey = Deno.env.get('LOVABLE_API_KEY');
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured for the selected provider", code: "PROVIDER_KEY_MISSING" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalModel = (modelName || provider.default_model || 'google/gemini-2.5-flash') as string;
    const mc = modelConfig as Record<string, unknown> | null;
    const options: Record<string, unknown> = {
      temperature: temperature ?? (mc?.temperature as number | undefined) ?? 0.7,
      max_tokens: max_tokens ?? (mc?.max_tokens as number | undefined) ?? 4096,
      top_p: top_p ?? (mc?.top_p as number | undefined) ?? 1.0,
      frequency_penalty: frequency_penalty ?? (mc?.frequency_penalty as number | undefined) ?? 0,
      presence_penalty: presence_penalty ?? (mc?.presence_penalty as number | undefined) ?? 0,
      stream,
      ...((mc?.settings as Record<string, unknown>) || {}),
    };

    let finalMessages = [...messages];
    const effectiveSystemPrompt = system_prompt || (mc?.system_prompt_override as string | undefined);
    if (effectiveSystemPrompt) {
      const hasSystemMessage = finalMessages.some(m => m.role === 'system');
      if (!hasSystemMessage) {
        finalMessages.unshift({ role: 'system', content: effectiveSystemPrompt });
      }
    }

    const providerType = provider.provider_type as string;
    const formatter = formatters[providerType] || formatters.custom;
    const requestBody = formatter(finalMessages as Record<string, unknown>[], finalModel, options);
    const requestHeaders = buildHeaders(providerType, apiKey);

    const response = await fetch(provider.api_endpoint as string, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM API error: ${response.status}`, errorText.slice(0, 200));

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "LLM provider returned an error", code: "LLM_API_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const parser = parsers[providerType] || parsers.custom;
    const parsed = parser(data as Record<string, unknown>);
    const latency = Date.now() - startTime;

    // Log usage asynchronously
    const usageLog = {
      user_id: userId,
      agent_id: agent_id || null,
      provider_id: (provider.id as string) || null,
      module_type,
      model_name: finalModel,
      prompt_tokens: (parsed.usage?.prompt_tokens as number) || (parsed.usage?.input_tokens as number) || 0,
      completion_tokens: (parsed.usage?.completion_tokens as number) || (parsed.usage?.output_tokens as number) || 0,
      total_tokens: (parsed.usage?.total_tokens as number) || 0,
      latency_ms: latency,
      success: true,
    };

    supabase.from("llm_usage_logs").insert(usageLog).then(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        content: parsed.content,
        model: finalModel,
        provider: providerType,
        usage: parsed.usage,
        latency_ms: latency,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("LLM Gateway error:", error);

    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later.", code: "LLM_GATEWAY_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
