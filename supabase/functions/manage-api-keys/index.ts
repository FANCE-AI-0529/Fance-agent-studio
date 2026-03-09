/**
 * @file manage-api-keys/index.ts
 * @description API Key 安全管理服务 - AES-256-GCM 加密存储和验证用户的 LLM 供应商 API Key
 * @module EdgeFunctions/ManageApiKeys
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { encryptAES, decryptAES } from "../_shared/crypto.ts";

type Operation = 'store' | 'validate' | 'delete' | 'get_preview';

interface RequestBody {
  operation: Operation;
  providerId?: string;
  apiKey?: string;
  providerType?: string;
  testEndpoint?: string;
}

function generateKeyPreview(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return '***';
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

async function validateApiKey(
  apiKey: string, 
  providerType: string,
  testEndpoint?: string
): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  try {
    switch (providerType) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (response.ok) {
          const data = await response.json();
          const models = data.data?.slice(0, 10).map((m: any) => m.id) || [];
          return { valid: true, models };
        }
        return { valid: false, error: `OpenAI API error: ${response.status}` };
      }
      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (response.status === 401) return { valid: false, error: 'Invalid API key' };
        return { valid: true, models: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus', 'claude-sonnet-4'] };
      }
      case 'google': {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (response.ok) {
          const data = await response.json();
          const models = data.models?.slice(0, 10).map((m: any) => m.name?.replace('models/', '')) || [];
          return { valid: true, models };
        }
        return { valid: false, error: `Google AI error: ${response.status}` };
      }
      case 'azure':
      case 'custom': {
        if (!testEndpoint) return { valid: true };
        const response = await fetch(testEndpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
        });
        if (response.status === 401) return { valid: false, error: 'Invalid API key' };
        return { valid: true };
      }
      default:
        return { valid: true };
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

serve(async (req: Request) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mandatory auth via getClaims
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    const body: RequestBody = await req.json();
    const { operation, providerId, apiKey, providerType, testEndpoint } = body;

    switch (operation) {
      case 'store': {
        if (!providerId || !apiKey) {
          return new Response(
            JSON.stringify({ error: "providerId and apiKey are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: provider, error: providerError } = await supabase
          .from('llm_providers')
          .select('id, user_id, provider_type')
          .eq('id', providerId)
          .single();

        if (providerError || !provider || provider.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "Provider not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const encrypted = await encryptAES(apiKey);
        const preview = generateKeyPreview(apiKey);

        const { error: updateError } = await supabase
          .from('llm_providers')
          .update({ api_key_encrypted: encrypted, api_key_preview: preview, updated_at: new Date().toISOString() })
          .eq('id', providerId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "Failed to store API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, preview }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'validate': {
        if (!apiKey || !providerType) {
          return new Response(
            JSON.stringify({ error: "apiKey and providerType are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const result = await validateApiKey(apiKey, providerType, testEndpoint);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'delete': {
        if (!providerId) {
          return new Response(
            JSON.stringify({ error: "providerId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: provider } = await supabase
          .from('llm_providers')
          .select('id, user_id')
          .eq('id', providerId)
          .single();

        if (!provider || provider.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "Provider not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabase
          .from('llm_providers')
          .update({ api_key_encrypted: null, api_key_preview: null, updated_at: new Date().toISOString() })
          .eq('id', providerId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "Failed to delete API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'get_preview': {
        if (!providerId) {
          return new Response(
            JSON.stringify({ error: "providerId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: provider } = await supabase
          .from('llm_providers')
          .select('id, user_id, api_key_preview')
          .eq('id', providerId)
          .single();

        if (!provider || provider.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: "Provider not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ preview: provider.api_key_preview || null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid operation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[manage-api-keys] Error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

export { decryptAES as decryptApiKey };
