import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HandshakeRequest {
  action: "initiate" | "accept" | "reject" | "heartbeat" | "disconnect";
  targetAgentId?: string;
  initiatorAgentId?: string;
  collaborationId?: string;
  capabilities?: string[];
}

// Generate secure handshake token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, targetAgentId, initiatorAgentId, collaborationId, capabilities }: HandshakeRequest = await req.json();

    console.log(`Handshake action: ${action} by user: ${user.id}`);

    switch (action) {
      case "initiate": {
        if (!initiatorAgentId || !targetAgentId) {
          return new Response(JSON.stringify({ error: "Both initiator and target agent IDs required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify agents exist and belong to user
        const { data: agents, error: agentsError } = await supabase
          .from("agents")
          .select("id, name, manifest")
          .in("id", [initiatorAgentId, targetAgentId]);

        if (agentsError || !agents || agents.length !== 2) {
          return new Response(JSON.stringify({ error: "Invalid agent IDs" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const handshakeToken = generateToken();

        // Create collaboration record
        const { data: collaboration, error: collabError } = await supabase
          .from("agent_collaborations")
          .insert({
            initiator_agent_id: initiatorAgentId,
            target_agent_id: targetAgentId,
            user_id: user.id,
            status: "pending",
            handshake_token: handshakeToken,
            capabilities: capabilities || [],
          })
          .select()
          .single();

        if (collabError) {
          console.error("Failed to create collaboration:", collabError);
          return new Response(JSON.stringify({ error: "Failed to create collaboration" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create handshake request message
        await supabase.from("collaboration_messages").insert({
          collaboration_id: collaboration.id,
          sender_agent_id: initiatorAgentId,
          receiver_agent_id: targetAgentId,
          message_type: "handshake_request",
          payload: {
            token: handshakeToken,
            capabilities: capabilities || [],
            timestamp: new Date().toISOString(),
            protocol_version: "1.0",
          },
        });

        console.log(`Handshake initiated: ${initiatorAgentId} -> ${targetAgentId}`);

        return new Response(
          JSON.stringify({
            success: true,
            collaboration,
            message: "Handshake request sent",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "accept": {
        if (!collaborationId) {
          return new Response(JSON.stringify({ error: "Collaboration ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update collaboration status
        const { data: collaboration, error: updateError } = await supabase
          .from("agent_collaborations")
          .update({
            status: "connected",
            last_heartbeat: new Date().toISOString(),
            trust_level: 0.7, // Initial trust after acceptance
          })
          .eq("id", collaborationId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to accept handshake" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Send response message
        await supabase.from("collaboration_messages").insert({
          collaboration_id: collaborationId,
          sender_agent_id: collaboration.target_agent_id,
          receiver_agent_id: collaboration.initiator_agent_id,
          message_type: "handshake_response",
          payload: {
            accepted: true,
            timestamp: new Date().toISOString(),
            capabilities: capabilities || [],
          },
        });

        console.log(`Handshake accepted for collaboration: ${collaborationId}`);

        return new Response(
          JSON.stringify({
            success: true,
            collaboration,
            message: "Handshake accepted, connection established",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reject": {
        if (!collaborationId) {
          return new Response(JSON.stringify({ error: "Collaboration ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: collaboration, error: updateError } = await supabase
          .from("agent_collaborations")
          .update({ status: "rejected" })
          .eq("id", collaborationId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to reject handshake" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from("collaboration_messages").insert({
          collaboration_id: collaborationId,
          sender_agent_id: collaboration.target_agent_id,
          receiver_agent_id: collaboration.initiator_agent_id,
          message_type: "handshake_response",
          payload: {
            accepted: false,
            timestamp: new Date().toISOString(),
            reason: "Rejected by target agent",
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Handshake rejected",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "heartbeat": {
        if (!collaborationId) {
          return new Response(JSON.stringify({ error: "Collaboration ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await supabase
          .from("agent_collaborations")
          .update({ last_heartbeat: new Date().toISOString() })
          .eq("id", collaborationId)
          .eq("user_id", user.id)
          .eq("status", "connected");

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to update heartbeat" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        if (!collaborationId) {
          return new Response(JSON.stringify({ error: "Collaboration ID required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await supabase
          .from("agent_collaborations")
          .update({ status: "disconnected" })
          .eq("id", collaborationId)
          .eq("user_id", user.id);

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to disconnect" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Disconnected successfully",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Handshake error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later.", code: "HANDSHAKE_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
