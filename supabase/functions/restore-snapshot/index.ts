import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RestoreSnapshotRequest {
  snapshotId: string;
  agentId: string;
  createBackup?: boolean;
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

    const { snapshotId, agentId, createBackup = true }: RestoreSnapshotRequest = await req.json();

    if (!snapshotId || !agentId) {
      return new Response(
        JSON.stringify({ error: "snapshotId and agentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Restoring snapshot ${snapshotId} for agent ${agentId}`);

    // 1. 获取目标快照
    const { data: snapshot, error: snapshotError } = await supabase
      .from('agent_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (snapshotError || !snapshot) {
      return new Response(
        JSON.stringify({ error: "Snapshot not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. 可选：在恢复前创建备份快照
    let backupSnapshotId = null;
    if (createBackup) {
      const { data: currentAgent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      const [nodesResult, edgesResult] = await Promise.all([
        supabase.from('agent_graph_nodes').select('*').eq('agent_id', agentId),
        supabase.from('agent_graph_edges').select('*').eq('agent_id', agentId),
      ]);

      if (currentAgent) {
        const { data: backupSnapshot } = await supabase
          .from('agent_snapshots')
          .insert({
            agent_id: agentId,
            user_id: user.id,
            commit_message: `回滚前备份 (恢复到 ${snapshot.commit_hash})`,
            parent_snapshot_id: null,
            manifest: currentAgent.manifest || {},
            graph_data: {
              nodes: (nodesResult.data || []).map((n: any) => ({
                id: n.id,
                nodeId: n.node_id,
                nodeType: n.node_type,
                positionX: n.position_x,
                positionY: n.position_y,
                data: n.data,
              })),
              edges: (edgesResult.data || []).map((e: any) => ({
                id: e.id,
                edgeId: e.edge_id,
                edgeType: e.edge_type,
                sourceNode: e.source_node,
                targetNode: e.target_node,
                data: e.data,
              })),
            },
            mounted_skills: [],
            system_prompt: currentAgent.manifest?.system_prompt,
            mplp_policy: currentAgent.mplp_policy,
            personality_config: currentAgent.personality_config,
            is_auto_save: false,
            trigger_source: 'rollback',
          })
          .select()
          .single();

        backupSnapshotId = backupSnapshot?.id;
        console.log(`Backup snapshot created: ${backupSnapshot?.commit_hash}`);
      }
    }

    // 3. 清除当前图数据
    await Promise.all([
      supabase.from('agent_graph_nodes').delete().eq('agent_id', agentId),
      supabase.from('agent_graph_edges').delete().eq('agent_id', agentId),
    ]);

    // 4. 恢复图节点
    const graphData = snapshot.graph_data as any;
    if (graphData.nodes && graphData.nodes.length > 0) {
      const nodesToInsert = graphData.nodes.map((n: any) => ({
        agent_id: agentId,
        node_id: n.nodeId,
        node_type: n.nodeType,
        position_x: n.positionX,
        position_y: n.positionY,
        data: n.data,
        version: 1,
      }));

      const { error: nodesError } = await supabase
        .from('agent_graph_nodes')
        .insert(nodesToInsert);

      if (nodesError) {
        console.error('Failed to restore nodes:', nodesError);
      }
    }

    // 5. 恢复图边
    if (graphData.edges && graphData.edges.length > 0) {
      const edgesToInsert = graphData.edges.map((e: any) => ({
        agent_id: agentId,
        edge_id: e.edgeId,
        edge_type: e.edgeType,
        source_node: e.sourceNode,
        target_node: e.targetNode,
        data: e.data,
        version: 1,
      }));

      const { error: edgesError } = await supabase
        .from('agent_graph_edges')
        .insert(edgesToInsert);

      if (edgesError) {
        console.error('Failed to restore edges:', edgesError);
      }
    }

    // 6. 更新 Agent 主表
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        manifest: snapshot.manifest,
        mplp_policy: snapshot.mplp_policy,
        personality_config: snapshot.personality_config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('Failed to update agent:', updateError);
    }

    // 7. 创建恢复记录快照
    const { data: restoreSnapshot } = await supabase
      .from('agent_snapshots')
      .insert({
        agent_id: agentId,
        user_id: user.id,
        commit_message: `已恢复到版本 ${snapshot.commit_hash}`,
        parent_snapshot_id: backupSnapshotId,
        manifest: snapshot.manifest,
        graph_data: snapshot.graph_data,
        mounted_skills: snapshot.mounted_skills,
        system_prompt: snapshot.system_prompt,
        mplp_policy: snapshot.mplp_policy,
        personality_config: snapshot.personality_config,
        is_auto_save: false,
        trigger_source: 'rollback',
        change_stats: {
          nodesAdded: 0,
          nodesRemoved: 0,
          nodesModified: 0,
          edgesAdded: 0,
          edgesRemoved: 0,
          manifestChanged: true,
          skillsChanged: false,
        },
      })
      .select()
      .single();

    console.log(`Snapshot restored successfully. New snapshot: ${restoreSnapshot?.commit_hash}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        restoredFromSnapshot: snapshot,
        backupSnapshotId,
        newSnapshotId: restoreSnapshot?.id,
        restoredAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error restoring snapshot:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
