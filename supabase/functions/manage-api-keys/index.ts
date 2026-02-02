/**
 * @file manage-api-keys/index.ts
 * @description API Key 安全管理服务 - 加密存储和验证用户的 LLM 供应商 API Key
 * @module EdgeFunctions/ManageApiKeys
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 支持的操作类型
 */
type Operation = 'store' | 'validate' | 'delete' | 'get_preview';

interface RequestBody {
  operation: Operation;
  providerId?: string;
  apiKey?: string;
  providerType?: string;
  testEndpoint?: string;
}

/**
 * 生成 API Key 预览 (脱敏显示)
 * 例如: sk-proj-abc...xyz
 */
function generateKeyPreview(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '***';
  }
  
  const prefix = apiKey.slice(0, 7);
  const suffix = apiKey.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * 简单的 XOR 加密 (用于演示，生产环境应使用更强的加密)
 * 在生产环境中，建议使用 Supabase Vault 或专门的加密服务
 */
function encryptApiKey(apiKey: string): string {
  const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || 'default-encryption-key-32chars!!';
  const keyBytes = new TextEncoder().encode(encryptionKey);
  const dataBytes = new TextEncoder().encode(apiKey);
  
  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Base64 编码
  return btoa(String.fromCharCode(...encrypted));
}

/**
 * 解密 API Key
 */
function decryptApiKey(encryptedKey: string): string {
  const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || 'default-encryption-key-32chars!!';
  const keyBytes = new TextEncoder().encode(encryptionKey);
  
  // Base64 解码
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

/**
 * 验证 API Key 有效性
 */
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
        // Anthropic 没有简单的验证端点，尝试发送一个最小请求
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
        // 即使请求失败，只要不是 401 就说明 key 有效
        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' };
        }
        return { valid: true, models: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus', 'claude-sonnet-4'] };
      }
      
      case 'google': {
        // Google AI Studio API 验证
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
        // 对于 Azure 和自定义供应商，尝试调用提供的端点
        if (!testEndpoint) {
          return { valid: true }; // 无法验证，假定有效
        }
        const response = await fetch(testEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
          }),
        });
        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' };
        }
        return { valid: true };
      }
      
      default:
        return { valid: true }; // 未知类型，假定有效
    }
  } catch (error) {
    console.error('API key validation error:', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 验证用户身份
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

        // 验证用户拥有这个 provider
        const { data: provider, error: providerError } = await supabase
          .from('llm_providers')
          .select('id, user_id, provider_type')
          .eq('id', providerId)
          .single();

        if (providerError || !provider || provider.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Provider not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 加密并存储
        const encrypted = encryptApiKey(apiKey);
        const preview = generateKeyPreview(apiKey);

        const { error: updateError } = await supabase
          .from('llm_providers')
          .update({ 
            api_key_encrypted: encrypted,
            api_key_preview: preview,
            updated_at: new Date().toISOString(),
          })
          .eq('id', providerId);

        if (updateError) {
          console.error('Store error:', updateError);
          return new Response(
            JSON.stringify({ error: "Failed to store API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, preview }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'validate': {
        if (!apiKey || !providerType) {
          return new Response(
            JSON.stringify({ error: "apiKey and providerType are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const result = await validateApiKey(apiKey, providerType, testEndpoint);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'delete': {
        if (!providerId) {
          return new Response(
            JSON.stringify({ error: "providerId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 验证用户拥有这个 provider
        const { data: provider } = await supabase
          .from('llm_providers')
          .select('id, user_id')
          .eq('id', providerId)
          .single();

        if (!provider || provider.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Provider not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 清除加密的 key
        const { error: updateError } = await supabase
          .from('llm_providers')
          .update({ 
            api_key_encrypted: null,
            api_key_preview: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', providerId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "Failed to delete API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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

        if (!provider || provider.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Provider not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ preview: provider.api_key_preview || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid operation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("manage-api-keys error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// 导出解密函数供 llm-gateway 使用
export { decryptApiKey };
