import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const { nanoclawEndpoint, authToken, command, containerId, workingDir } = await req.json();

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

    // 代理到 NanoClaw 的流式执行端点
    const streamResponse = await fetch(`${nanoclawEndpoint}/execute/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-User-ID': userId,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        command,
        containerId,
        workingDir,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.error('[nanoclaw-stream] Upstream error:', streamResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Upstream error: ${streamResponse.status}` }),
        { status: streamResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 如果上游返回 SSE 流，直接透传
    if (streamResponse.headers.get('content-type')?.includes('text/event-stream')) {
      return new Response(streamResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 如果上游返回 JSON（非流式回退），将其转换为 SSE 格式
    const jsonResult = await streamResponse.json();
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        // 发送 stdout
        if (jsonResult.stdout) {
          const lines = jsonResult.stdout.split('\n');
          for (const line of lines) {
            controller.enqueue(encoder.encode(
              `event: stdout\ndata: ${JSON.stringify({ content: line + '\n' })}\n\n`
            ));
          }
        }
        // 发送 stderr
        if (jsonResult.stderr) {
          const lines = jsonResult.stderr.split('\n');
          for (const line of lines) {
            controller.enqueue(encoder.encode(
              `event: stderr\ndata: ${JSON.stringify({ content: line + '\n' })}\n\n`
            ));
          }
        }
        // 发送退出事件
        controller.enqueue(encoder.encode(
          `event: exit\ndata: ${JSON.stringify({ 
            exitCode: jsonResult.exitCode ?? 0, 
            durationMs: jsonResult.durationMs ?? 0 
          })}\n\n`
        ));
        controller.close();
      },
    });

    return new Response(body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[nanoclaw-stream] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
