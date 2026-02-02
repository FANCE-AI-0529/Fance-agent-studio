import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple XOR decryption for user API keys
function decryptApiKey(encryptedKey: string): string {
  const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || 'default-encryption-key-32chars!!';
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
const formatters: Record<string, (messages: any[], model: string, options: any) => any> = {
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
      system: systemMessage?.content || '',
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
  
  azure: (messages, model, options) => ({
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

// Response parsers for different providers
const parsers: Record<string, (response: any) => { content: string; usage?: any }> = {
  openai: (response) => ({
    content: response.choices?.[0]?.message?.content || '',
    usage: response.usage,
  }),
  
  anthropic: (response) => ({
    content: response.content?.[0]?.text || '',
    usage: response.usage,
  }),
  
  google: (response) => ({
    content: response.choices?.[0]?.message?.content || response.candidates?.[0]?.content?.parts?.[0]?.text || '',
    usage: response.usageMetadata,
  }),
  
  azure: (response) => ({
    content: response.choices?.[0]?.message?.content || '',
    usage: response.usage,
  }),

  lovable: (response) => ({
    content: response.choices?.[0]?.message?.content || '',
    usage: response.usage,
  }),

  custom: (response) => ({
    content: response.choices?.[0]?.message?.content || response.content || '',
    usage: response.usage,
  }),
};

// Build headers based on provider type
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

// Provider fallback chain function
async function tryProvidersWithFallback(
  providers: any[],
  finalMessages: any[],
  modelName: string,
  options: any
): Promise<{ content: string; usage?: any; provider: any; providerType: string }> {
  const errors: string[] = [];
  
  for (const provider of providers) {
    try {
      const apiKey = Deno.env.get(provider.api_key_name);
      if (!apiKey) {
        errors.push(`${provider.display_name || provider.provider_type}: API key not configured`);
        continue;
      }

      const providerType = provider.provider_type;
      const formatter = formatters[providerType] || formatters.custom;
      const requestBody = formatter(finalMessages, modelName, options);
      const headers = buildHeaders(providerType, apiKey);
      
      console.log(`Trying provider: ${provider.display_name || providerType}`);
      
      const response = await fetch(provider.api_endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const parser = parsers[providerType] || parsers.custom;
        return { ...parser(data), provider, providerType };
      }
      
      const errorText = await response.text();
      errors.push(`${provider.display_name || providerType}: ${response.status} - ${errorText.slice(0, 100)}`);
      console.warn(`Provider ${provider.display_name || providerType} failed: ${response.status}`);
    } catch (error: any) {
      errors.push(`${provider.display_name || provider.provider_type}: ${error.message}`);
      console.warn(`Provider ${provider.display_name || 'unknown'} error:`, error.message);
    }
  }
  
  throw new Error(`All providers failed:\n${errors.join('\n')}`);
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

    // Get auth user
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

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
      throw new Error("Messages are required");
    }

    let provider: any = null;
    let modelConfig: any = null;
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
    if (!provider && agent_id && module_type && userId) {
      const { data: config } = await supabase
        .from("llm_model_configs")
        .select("*, llm_providers(*)")
        .eq("agent_id", agent_id)
        .eq("module_type", module_type)
        .eq("is_active", true)
        .single();
      
      if (config?.llm_providers) {
        provider = config.llm_providers;
        modelConfig = config;
        modelName = config.model_name;
      }
    }

    // Priority 3: User's default provider
    if (!provider && userId) {
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
      // First, get admin user IDs
      const { data: adminUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminUsers?.length) {
        const adminUserIds = adminUsers.map((u: any) => u.user_id);
        
        // Get the default provider from admin users
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
          console.log(`Using global admin provider: ${adminProvider.display_name}`);
        }
      }
    }

    // Priority 5: Fallback to Lovable AI
    if (!provider) {
      provider = {
        provider_type: 'lovable',
        api_endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
        api_key_name: 'LOVABLE_API_KEY',
        default_model: 'google/gemini-2.5-flash',
      };
    }

    // Get API key - support encrypted user keys
    let apiKey: string | undefined;
    
    // Priority 1: User's encrypted API key
    if (provider.api_key_encrypted) {
      apiKey = decryptApiKey(provider.api_key_encrypted);
    }
    
    // Priority 2: Environment variable (admin configured)
    if (!apiKey && provider.api_key_name) {
      apiKey = Deno.env.get(provider.api_key_name);
    }
    
    // Priority 3: Lovable fallback
    if (!apiKey && provider.provider_type === 'lovable') {
      apiKey = Deno.env.get('LOVABLE_API_KEY');
    }
    
    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${provider.display_name || provider.provider_type}`);
    }

    // Prepare final model and options
    const finalModel = modelName || provider.default_model || 'google/gemini-2.5-flash';
    const options = {
      temperature: temperature ?? modelConfig?.temperature ?? 0.7,
      max_tokens: max_tokens ?? modelConfig?.max_tokens ?? 4096,
      top_p: top_p ?? modelConfig?.top_p ?? 1.0,
      frequency_penalty: frequency_penalty ?? modelConfig?.frequency_penalty ?? 0,
      presence_penalty: presence_penalty ?? modelConfig?.presence_penalty ?? 0,
      stream,
      ...(modelConfig?.settings || {}),
    };

    // Add system prompt if provided
    let finalMessages = [...messages];
    const effectiveSystemPrompt = system_prompt || modelConfig?.system_prompt_override;
    if (effectiveSystemPrompt) {
      const hasSystemMessage = finalMessages.some(m => m.role === 'system');
      if (!hasSystemMessage) {
        finalMessages.unshift({ role: 'system', content: effectiveSystemPrompt });
      }
    }

    // Format request based on provider type
    const providerType = provider.provider_type;
    const formatter = formatters[providerType] || formatters.custom;
    const requestBody = formatter(finalMessages, finalModel, options);

    console.log(`LLM Request: provider=${providerType}, model=${finalModel}, module=${module_type}`);

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Provider-specific auth headers
    if (providerType === 'anthropic') {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Make the request
    const response = await fetch(provider.api_endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM API error: ${response.status}`, errorText);
      
      // Handle rate limits
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`LLM API error: ${response.status}`);
    }

    // Handle streaming response
    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Parse non-streaming response
    const data = await response.json();
    const parser = parsers[providerType] || parsers.custom;
    const parsed = parser(data);

    const latency = Date.now() - startTime;

    // Log usage (async, don't wait)
    if (userId) {
      const usageLog = {
        user_id: userId,
        agent_id: agent_id || null,
        provider_id: provider.id || null,
        module_type,
        model_name: finalModel,
        prompt_tokens: parsed.usage?.prompt_tokens || parsed.usage?.input_tokens || 0,
        completion_tokens: parsed.usage?.completion_tokens || parsed.usage?.output_tokens || 0,
        total_tokens: parsed.usage?.total_tokens || 0,
        latency_ms: latency,
        success: true,
      };

      supabase.from("llm_usage_logs").insert(usageLog).then(() => {});
    }

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
  } catch (error: any) {
    console.error("LLM Gateway error:", error);
    
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later.", code: "LLM_GATEWAY_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
