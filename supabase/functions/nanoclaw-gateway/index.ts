import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const { action, nanoclawEndpoint, authToken, ...params } = await req.json();

    // 安全检查：验证 NanoClaw endpoint 不是内部地址
    if (nanoclawEndpoint) {
      const url = new URL(nanoclawEndpoint);
      const blockedHosts = ['169.254.169.254', 'metadata.google.internal'];
      if (blockedHosts.includes(url.hostname)) {
        return new Response(
          JSON.stringify({ error: 'Blocked endpoint' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let result;

    switch (action) {
      case 'health': {
        // 健康检查 - 代理到 NanoClaw 实例
        const response = await fetch(`${nanoclawEndpoint}/health`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
          signal: AbortSignal.timeout(5000),
        });
        result = await response.json();
        break;
      }

      case 'create_container': {
        const response = await fetch(`${nanoclawEndpoint}/containers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
          body: JSON.stringify(params.config),
        });
        result = await response.json();
        break;
      }

      case 'terminate_container': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
        });
        result = await response.json();
        break;
      }

      case 'container_status': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/status`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
        });
        result = await response.json();
        break;
      }

      case 'list_containers': {
        const response = await fetch(`${nanoclawEndpoint}/containers?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
        });
        result = await response.json();
        break;
      }

      case 'execute': {
        const response = await fetch(`${nanoclawEndpoint}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
          body: JSON.stringify(params.request),
          signal: AbortSignal.timeout(60000),
        });
        result = await response.json();
        break;
      }

      case 'deploy_skill': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/skills`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
          body: JSON.stringify({
            name: params.skillName,
            content: params.skillMd,
          }),
        });
        result = await response.json();
        break;
      }

      case 'apply_skill': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/skills/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
          body: JSON.stringify({
            skillDir: params.skillDir,
          }),
        });
        result = await response.json();
        break;
      }

      case 'read_file': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/files?path=${encodeURIComponent(params.filePath)}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
        });
        result = await response.json();
        break;
      }

      case 'write_file': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'X-User-ID': userId,
          },
          body: JSON.stringify({
            path: params.filePath,
            content: params.content,
          }),
        });
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[nanoclaw-gateway] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
