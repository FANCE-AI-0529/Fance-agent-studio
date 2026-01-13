import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { templateId, templateKey } = await req.json();

    // Fetch template by ID or key
    let query = supabase.from("agent_templates").select("*");
    
    if (templateId) {
      query = query.eq("id", templateId);
    } else if (templateKey) {
      query = query.eq("template_key", templateKey);
    } else {
      return new Response(
        JSON.stringify({ error: "templateId or templateKey is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: template, error: templateError } = await query.single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create agent from template
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name: template.name,
        department: template.department,
        model: template.model,
        mplp_policy: template.mplp_policy || "default",
        personality_config: {
          ...template.personality_config,
          systemPrompt: template.system_prompt,
        },
        category: template.category,
        tags: template.tags,
        status: "draft",
        author_id: user.id,
        manifest: {
          template_id: template.id,
          template_key: template.template_key,
          icon_id: template.icon_id,
          color: template.color,
          bg_gradient: template.bg_gradient,
        },
        build_metadata: {
          source: "template",
          template_name: template.name,
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (agentError) {
      console.error("Failed to create agent:", agentError);
      return new Response(
        JSON.stringify({ error: "Failed to create agent", details: agentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create initial graph nodes (Trigger + Output)
    const triggerId = crypto.randomUUID();
    const outputId = crypto.randomUUID();

    await supabase.from("agent_graph_nodes").insert([
      {
        agent_id: agent.id,
        node_id: triggerId,
        node_type: "trigger",
        position_x: 100,
        position_y: 200,
        data: {
          label: "用户输入",
          type: "user_message",
        },
      },
      {
        agent_id: agent.id,
        node_id: outputId,
        node_type: "output",
        position_x: 500,
        position_y: 200,
        data: {
          label: "智能体回复",
          type: "agent_response",
        },
      },
    ]);

    // Create edge connecting trigger to output
    await supabase.from("agent_graph_edges").insert({
      agent_id: agent.id,
      edge_id: crypto.randomUUID(),
      source_node: triggerId,
      target_node: outputId,
      edge_type: "default",
    });

    // Update template usage count
    await supabase
      .from("agent_templates")
      .update({ usage_count: template.usage_count + 1 })
      .eq("id", template.id);

    return new Response(
      JSON.stringify({
        success: true,
        agentId: agent.id,
        agentName: agent.name,
        message: `已创建 ${agent.name}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
