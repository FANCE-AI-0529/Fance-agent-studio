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
    const { action, agentId, containerId, content } = await req.json();

    switch (action) {
      case 'read': {
        // 从数据库读取 Agent 的记忆并生成 CLAUDE.md
        const { data: memories, error } = await supabase
          .from('core_memories')
          .select('*')
          .eq('agent_id', agentId)
          .eq('user_id', userId)
          .order('priority', { ascending: false });

        if (error) throw error;

        // 获取 Agent 名称
        const { data: agent } = await supabase
          .from('agents')
          .select('name')
          .eq('id', agentId)
          .single();

        const agentName = agent?.name || 'Agent';

        // 构建 sections
        const sections: Record<string, Array<{ key: string; value: string }>> = {};
        for (const mem of memories || []) {
          if (!sections[mem.category]) sections[mem.category] = [];
          sections[mem.category].push({ key: mem.key, value: mem.value });
        }

        // 生成 CLAUDE.md
        const sectionTitles: Record<string, string> = {
          identity: '身份 (Identity)',
          task_plan: '任务计划 (Task Plan)',
          progress: '进度 (Progress)',
          preferences: '偏好 (Preferences)',
          knowledge: '知识 (Knowledge)',
          relationships: '关系 (Relationships)',
          pending_tasks: '未完成任务 (Pending Tasks)',
        };

        let claudeMd = `# ${agentName} - CLAUDE.md\n\n`;
        claudeMd += `> 生成于 ${new Date().toISOString()}\n\n`;

        for (const [section, title] of Object.entries(sectionTitles)) {
          const items = sections[section];
          if (!items || items.length === 0) continue;
          claudeMd += `## ${title}\n\n`;
          for (const item of items) {
            if (item.key.startsWith('item_')) {
              claudeMd += `- ${item.value}\n`;
            } else {
              claudeMd += `- **${item.key}**: ${item.value}\n`;
            }
          }
          claudeMd += '\n';
        }

        return new Response(
          JSON.stringify({ content: claudeMd, memoriesCount: memories?.length || 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'write': {
        // 解析 CLAUDE.md 并写入数据库
        if (!content) {
          return new Response(
            JSON.stringify({ error: 'Content is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 简单的 CLAUDE.md 解析
        const lines = content.split('\n');
        let currentSection = '';
        const sectionMap: Record<string, string> = {
          '身份': 'identity',
          'identity': 'identity',
          '任务计划': 'task_plan',
          'task plan': 'task_plan',
          '进度': 'progress',
          'progress': 'progress',
          '偏好': 'preferences',
          'preferences': 'preferences',
          '知识': 'knowledge',
          'knowledge': 'knowledge',
          '关系': 'relationships',
          'relationships': 'relationships',
          '未完成任务': 'pending_tasks',
          'pending tasks': 'pending_tasks',
        };

        const memories: Array<{ category: string; key: string; value: string; priority: number }> = [];
        let itemIndex = 0;

        for (const line of lines) {
          const headerMatch = line.match(/^##\s+(.+?)(\s*\(.*\))?$/);
          if (headerMatch) {
            const title = headerMatch[1].toLowerCase().trim();
            currentSection = sectionMap[title] || '';
            itemIndex = 0;
            continue;
          }

          if (!currentSection) continue;

          const kvMatch = line.match(/^-\s+\*?\*?(.+?)\*?\*?:\s+(.+)$/);
          if (kvMatch) {
            memories.push({
              category: currentSection,
              key: kvMatch[1].trim(),
              value: kvMatch[2].trim(),
              priority: currentSection === 'identity' ? 10 : 5,
            });
          } else if (line.startsWith('- ')) {
            memories.push({
              category: currentSection,
              key: `item_${itemIndex++}`,
              value: line.substring(2).trim(),
              priority: 5,
            });
          }
        }

        // 批量 upsert
        for (const mem of memories) {
          await supabase
            .from('core_memories')
            .upsert({
              agent_id: agentId,
              user_id: userId,
              category: mem.category,
              key: mem.key,
              value: mem.value,
              priority: mem.priority,
            }, {
              onConflict: 'agent_id,key',
            });
        }

        return new Response(
          JSON.stringify({ success: true, memoriesWritten: memories.length }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'extract_pending': {
        // 提取未完成任务
        const { data: pendingMemories, error } = await supabase
          .from('core_memories')
          .select('value')
          .eq('agent_id', agentId)
          .eq('user_id', userId)
          .eq('category', 'pending_tasks');

        if (error) throw error;

        return new Response(
          JSON.stringify({ 
            tasks: (pendingMemories || []).map(m => m.value),
            count: pendingMemories?.length || 0,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[nanoclaw-memory] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
