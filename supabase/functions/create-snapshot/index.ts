import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSnapshotRequest {
  agentId: string;
  message: string;
  isAutoSave?: boolean;
  triggerSource?: 'manual' | 'auto' | 'deploy' | 'import' | 'rollback';
  tags?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 获取当前用户
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { agentId, message, isAutoSave = false, triggerSource = 'manual', tags = [] }: CreateSnapshotRequest = await req.json();

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "agentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating snapshot for agent ${agentId} by user ${user.id}`);

    // 1. 获取当前 Agent 完整状态
    const [agentResult, nodesResult, edgesResult, skillsResult] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentId).single(),
      supabase.from('agent_graph_nodes').select('*').eq('agent_id', agentId),
      supabase.from('agent_graph_edges').select('*').eq('agent_id', agentId),
      supabase.from('agent_skills').select('skill_id, skills(id, name, version)').eq('agent_id', agentId),
    ]);

    if (agentResult.error) {
      console.error('Failed to fetch agent:', agentResult.error);
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agent = agentResult.data;
    const nodes = nodesResult.data || [];
    const edges = edgesResult.data || [];
    const skills = skillsResult.data || [];

    // 2. 获取父快照 (最近的一个)
    const { data: parentSnapshot } = await supabase
      .from('agent_snapshots')
      .select('id, graph_data, manifest, mounted_skills')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. 计算变更统计
    const changeStats = calculateChangeStats(parentSnapshot, nodes, edges, agent);

    // 4. 构建技能引用
    const mountedSkills = skills.map((s: any) => ({
      skillId: s.skill_id,
      skillVersionId: null,
      skillName: s.skills?.name || 'Unknown',
      versionNumber: s.skills?.version || 1,
    }));

    // 5. 构建图数据
    const graphData = {
      nodes: nodes.map((n: any) => ({
        id: n.id,
        nodeId: n.node_id,
        nodeType: n.node_type,
        positionX: n.position_x,
        positionY: n.position_y,
        data: n.data,
      })),
      edges: edges.map((e: any) => ({
        id: e.id,
        edgeId: e.edge_id,
        edgeType: e.edge_type,
        sourceNode: e.source_node,
        targetNode: e.target_node,
        data: e.data,
      })),
    };

    // 6. 插入快照
    const { data: snapshot, error: insertError } = await supabase
      .from('agent_snapshots')
      .insert({
        agent_id: agentId,
        user_id: user.id,
        commit_hash: '', // 触发器会自动生成
        commit_message: message || '保存更改',
        parent_snapshot_id: parentSnapshot?.id || null,
        manifest: agent.manifest || {},
        graph_data: graphData,
        mounted_skills: mountedSkills,
        system_prompt: agent.manifest?.system_prompt || null,
        mplp_policy: agent.mplp_policy || 'default',
        personality_config: agent.personality_config,
        is_auto_save: isAutoSave,
        trigger_source: triggerSource,
        change_stats: changeStats,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create snapshot:', insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create snapshot", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. 添加标签 (如果有)
    if (tags.length > 0 && snapshot) {
      const tagInserts = tags.map(tagName => ({
        snapshot_id: snapshot.id,
        user_id: user.id,
        name: tagName,
        color: getTagColor(tagName),
      }));

      await supabase.from('snapshot_tags').insert(tagInserts);
    }

    console.log(`Snapshot created successfully: ${snapshot.commit_hash}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        snapshot,
        changeStats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error creating snapshot:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateChangeStats(
  parentSnapshot: any,
  nodes: any[],
  edges: any[],
  agent: any
) {
  const stats = {
    nodesAdded: 0,
    nodesRemoved: 0,
    nodesModified: 0,
    edgesAdded: 0,
    edgesRemoved: 0,
    manifestChanged: false,
    skillsChanged: false,
  };

  if (!parentSnapshot) {
    stats.nodesAdded = nodes.length;
    stats.edgesAdded = edges.length;
    return stats;
  }

  const oldNodes = new Set(parentSnapshot.graph_data?.nodes?.map((n: any) => n.nodeId) || []);
  const newNodes = new Set(nodes.map((n: any) => n.node_id));

  const oldEdges = new Set(parentSnapshot.graph_data?.edges?.map((e: any) => e.edgeId) || []);
  const newEdges = new Set(edges.map((e: any) => e.edge_id));

  // 节点变更
  for (const nodeId of newNodes) {
    if (!oldNodes.has(nodeId)) {
      stats.nodesAdded++;
    }
  }
  for (const nodeId of oldNodes) {
    if (!newNodes.has(nodeId)) {
      stats.nodesRemoved++;
    }
  }

  // 边变更
  for (const edgeId of newEdges) {
    if (!oldEdges.has(edgeId)) {
      stats.edgesAdded++;
    }
  }
  for (const edgeId of oldEdges) {
    if (!newEdges.has(edgeId)) {
      stats.edgesRemoved++;
    }
  }

  // Manifest 变更检测
  stats.manifestChanged = JSON.stringify(parentSnapshot.manifest) !== JSON.stringify(agent.manifest || {});

  // 技能变更检测
  const oldSkillIds = new Set(parentSnapshot.mounted_skills?.map((s: any) => s.skillId) || []);
  const newSkillIds = new Set(nodes.filter((n: any) => n.node_type === 'skill').map((n: any) => n.data?.skillId).filter(Boolean));

  stats.skillsChanged = oldSkillIds.size !== newSkillIds.size ||
    [...oldSkillIds].some(id => !newSkillIds.has(id));

  return stats;
}

function getTagColor(tagName: string): string {
  const tagColors: Record<string, string> = {
    production: '#22c55e',
    staging: '#f59e0b',
    release: '#3b82f6',
    milestone: '#8b5cf6',
    backup: '#6b7280',
  };
  return tagColors[tagName.toLowerCase()] || '#6366f1';
}
