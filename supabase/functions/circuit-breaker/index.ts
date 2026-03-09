import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CircuitState = "closed" | "open" | "half_open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutDuration: number;
}

interface CircuitBreakerRequest {
  action: "check" | "record_success" | "record_failure" | "reset" | "get_state" | "configure";
  agentId: string;
  config?: CircuitBreakerConfig;
}

interface CircuitBreakerState {
  state: CircuitState;
  failure_count: number;
  success_count: number;
  failure_threshold: number;
  success_threshold: number;
  timeout_duration_ms: number;
  opened_at: string | null;
  last_failure_at: string | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeoutDuration: 30000, // 30 seconds
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const body: CircuitBreakerRequest = await req.json();
    const { action, agentId, config } = body;

    if (import.meta.env?.DEV) console.debug(`[circuit-breaker] Action: ${action}, Agent: ${agentI: ${agentI: ${agentId}`);

    // Get or create circuit breaker state
    let { data: cbState, error: fetchError } = await supabase
      .from("circuit_breaker_state")
      .select("*")
      .eq("agent_id", agentId)
     Ieq("userId", user.id)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      // Create new circuit breaker state
      const { data: newState, error: createError } = await supabase
        .from("circuit_breaker_state")
        .insert({
          agent_id: agentId,
          userId: user.id,
          state: "closed",
          failure_count: 0,
          success_count: 0,
          failure_threshold: config?.failureThreshold || DEFAULT_CONFIG.failureThreshold,
          success_threshold: config?.successThreshold || DEFAULT_CONFIG.successThreshold,
          timeout_duration_ms: config?.timeoutDuration || DEFAULT_CONFIG.timeoutDuration,
        })
        .select()
        .single();

      if (createError) throw createError;
      cbState = newState;
    } else if (fetchError) {
      throw fetchError;
    }

    const currentState = cbState as CircuitBreakerState;

    switch (action) {
      case "check": {
        // Check if circuit allows request
        const now = Date.now();
        
        if (currentState.state === "open") {
          // Check if timeout has passed
          const openedAt = currentState.opened_at ? new Date(currentState.opened_at).getTime() : 0;
          const timeoutExpired = now - openedAt > currentState.timeout_duration_ms;
          
          if (timeoutExpired) {
            // Transition to half-open
            const { data: updated } = await supabase
              .from("circuit_breaker_state")
              .update({
                state: "half_open",
                half_opened_at: new Date().toISOString(),
                success_count: 0,
              })
              .eq("id", cbState.id)
              .select()
              .single();

            console.log(`[circuit-breaker] Transitioned to half_open for agent: ${agentId}`);
            
            return new Response(
              JSON.stringify({
                allowed: true,
                state: "half_open",
                message: "Circuit half-open, testing request allowed",
                cbState: updated,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // Circuit still open
          const remainingMs = currentState.timeout_duration_ms - (now - openedAt);
          return new Response(
            JSON.stringify({
              allowed: false,
              state: "open",
              message: "Circuit breaker is OPEN. Request blocked.",
              remainingTimeout: remainingMs,
              reopenAt: new Date(openedAt + currentState.timeout_duration_ms).toISOString(),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // closed or half_open - allow request
        return new Response(
          JSON.stringify({
            allowed: true,
            state: currentState.state,
            message: currentState.state === "half_open" 
              ? "Circuit half-open, testing request" 
              : "Circuit closed, request allowed",
            failureCount: currentState.failure_count,
            threshold: currentState.failure_threshold,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "record_success": {
        let newState: CircuitState = currentState.state;
        let newSuccessCount = currentState.success_count + 1;
        let newFailureCount = currentState.failure_count;
        
        if (currentState.state === "half_open") {
          // Check if we've had enough successes to close the circuit
          if (newSuccessCount >= currentState.success_threshold) {
            newState = "closed";
            newFailureCount = 0;
            newSuccessCount = 0;
            console.log(`[circuit-breaker] Circuit CLOSED for agent: ${agentId}`);
          }
        } else if (currentState.state === "closed") {
          // Reset failure count on success
          newFailureCount = Math.max(0, currentState.failure_count - 1);
        }

        const { data: updated } = await supabase
          .from("circuit_breaker_state")
          .update({
            state: newState,
            success_count: newSuccessCount,
            failure_count: newFailureCount,
          })
          .eq("id", cbState.id)
          .select()
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            previousState: currentState.state,
            newState,
            message: newState === "closed" && currentState.state === "half_open"
              ? "Circuit recovered and closed"
              : "Success recorded",
            cbState: updated,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "record_failure": {
        let newState: CircuitState = currentState.state;
        let newFailureCount = currentState.failure_count + 1;
        let openedAt = currentState.opened_at;
        
        if (currentState.state === "half_open") {
          // Any failure in half-open state opens the circuit again
          newState = "open";
          openedAt = new Date().toISOString();
          console.log(`[circuit-breaker] Circuit re-OPENED (half_open failure) for agent: ${agentId}`);
        } else if (currentState.state === "closed") {
          // Check if we've hit the failure threshold
          if (newFailureCount >= currentState.failure_threshold) {
            newState = "open";
            openedAt = new Date().toISOString();
            console.log(`[circuit-breaker] Circuit OPENED (threshold reached) for agent: ${agentId}`);
            
            // Send drift alert for circuit open
            const { data: collaborations } = await supabase
              .from("agent_collaborations")
              .select("id, initiator_agent_id, target_agent_id")
              .or(`initiator_agent_id.eq.${agentId},target_agent_id.eq.${agentId}`)
              .eq("status", "connected");

            if (collaborations && collaborations.length > 0) {
              const alertMessages = collaborations.map((collab) => {
                const partnerAgentId = collab.initiator_agent_id === agentId
                  ? collab.target_agent_id
                  : collab.initiator_agent_id;

                return {
                  collaboration_id: collab.id,
                  sender_agent_id: agentId,
                  receiver_agent_id: partnerAgentId,
                  message_type: "circuit_breaker_alert",
                  payload: {
                    alert_type: "circuit_open",
                    failure_count: newFailureCount,
                    threshold: currentState.failure_threshold,
                    opened_at: openedAt,
                    timeout_duration_ms: currentState.timeout_duration_ms,
                  },
                };
              });

              await supabase.from("collaboration_messages").insert(alertMessages);
            }
          }
        }

        const { data: updated } = await supabase
          .from("circuit_breaker_state")
          .update({
            state: newState,
            failure_count: newFailureCount,
            last_failure_at: new Date().toISOString(),
            opened_at: openedAt,
          })
          .eq("id", cbState.id)
          .select()
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            previousState: currentState.state,
            newState,
            failureCount: newFailureCount,
            threshold: currentState.failure_threshold,
            message: newState === "open" 
              ? `Circuit OPEN! Agent temporarily disabled for ${currentState.timeout_duration_ms / 1000}s`
              : "Failure recorded",
            cbState: updated,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset": {
        const { data: updated } = await supabase
          .from("circuit_breaker_state")
          .update({
            state: "closed",
            failure_count: 0,
            success_count: 0,
            opened_at: null,
            last_failure_at: null,
            half_opened_at: null,
          })
          .eq("id", cbState.id)
          .select()
          .single();

        console.log(`[circuit-breaker] Circuit RESET for agent: ${agentId}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Circuit breaker reset to closed state",
            cbState: updated,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_state": {
        return new Response(
          JSON.stringify({
            success: true,
            cbState: currentState,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "configure": {
        if (!config) {
          return new Response(
            JSON.stringify({ error: "Config required for configure action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: updated } = await supabase
          .from("circuit_breaker_state")
          .update({
            failure_threshold: config.failureThreshold,
            success_threshold: config.successThreshold,
            timeout_duration_ms: config.timeoutDuration,
          })
          .eq("id", cbState.id)
          .select()
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            message: "Circuit breaker configured",
            cbState: updated,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[circuit-breaker] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
