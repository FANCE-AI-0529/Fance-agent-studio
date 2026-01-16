import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenCode Mode Types
type OpenCodeMode = 'plan' | 'build';
type OperationType = 'list' | 'read' | 'write' | 'edit' | 'bash' | 'search';

interface OpenCodeRequest {
  agentId: string;
  sessionId: string;
  operation: OperationType;
  params: Record<string, unknown>;
  requestMode?: OpenCodeMode; // Requested mode for operation
  approvalToken?: string; // Required for BUILD mode
}

interface StyleViolation {
  rule: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface OpenCodeResponse {
  success: boolean;
  mode: OpenCodeMode;
  result?: unknown;
  styleViolations?: StyleViolation[];
  modeBlockReason?: string;
  planGenerated?: string;
  error?: string;
}

// Operations that require BUILD mode
const BUILD_MODE_OPERATIONS: OperationType[] = ['write', 'edit', 'bash'];

// Style checking rules (simplified server-side version)
function checkStyleViolations(code: string): StyleViolation[] {
  const violations: StyleViolation[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    // Check for let statements
    if (/\blet\s+\w+/.test(line)) {
      violations.push({
        rule: 'no-let',
        line: index + 1,
        column: line.indexOf('let'),
        message: 'Use const with ternary instead of let',
        severity: 'error'
      });
    }

    // Check for else statements
    if (/\belse\s*{|\belse\s+if/.test(line)) {
      violations.push({
        rule: 'no-else',
        line: index + 1,
        column: line.indexOf('else'),
        message: 'Use early return instead of else',
        severity: 'error'
      });
    }

    // Check for any type
    if (/:\s*any\b/.test(line)) {
      violations.push({
        rule: 'no-any',
        line: index + 1,
        column: line.indexOf('any'),
        message: 'Avoid using any type',
        severity: 'error'
      });
    }
  });

  return violations;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const request: OpenCodeRequest = await req.json();
    const { agentId, sessionId, operation, params, requestMode, approvalToken } = request;

    // Get or create session
    let { data: session } = await supabase
      .from('opencode_sessions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('session_id', sessionId)
      .single();

    if (!session) {
      // Create new session in PLAN mode
      const { data: newSession, error: createError } = await supabase
        .from('opencode_sessions')
        .insert({
          agent_id: agentId,
          session_id: sessionId,
          user_id: user.id,
          current_mode: 'plan'
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create session: ${createError.message}`);
      }
      session = newSession;
    }

    const currentMode: OpenCodeMode = session.current_mode;

    // Check if operation requires BUILD mode
    if (BUILD_MODE_OPERATIONS.includes(operation)) {
      if (currentMode !== 'build') {
        // Check if trying to switch to BUILD mode
        if (requestMode === 'build' && approvalToken) {
          // Verify approval token
          if (approvalToken === session.approval_token) {
            // Switch to BUILD mode
            await supabase
              .from('opencode_sessions')
              .update({ 
                current_mode: 'build',
                approved_at: new Date().toISOString()
              })
              .eq('id', session.id);
          } else {
            const response: OpenCodeResponse = {
              success: false,
              mode: currentMode,
              modeBlockReason: 'Invalid approval token. Please generate a new plan and get approval.',
              error: 'INVALID_APPROVAL_TOKEN'
            };
            return new Response(
              JSON.stringify(response),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Block operation - require approval
          const response: OpenCodeResponse = {
            success: false,
            mode: currentMode,
            modeBlockReason: `Operation "${operation}" requires BUILD mode. Current mode is PLAN. Please generate a plan and request approval first.`,
            error: 'BUILD_MODE_REQUIRED'
          };
          return new Response(
            JSON.stringify(response),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Execute operation based on type
    let result: unknown;
    let styleViolations: StyleViolation[] = [];

    switch (operation) {
      case 'list':
        // File listing (PLAN mode allowed)
        result = {
          operation: 'list',
          path: params.path,
          message: 'File listing simulated - integrate with actual filesystem MCP'
        };
        break;

      case 'read':
        // File reading (PLAN mode allowed)
        result = {
          operation: 'read',
          path: params.path,
          message: 'File read simulated - integrate with actual filesystem MCP'
        };
        break;

      case 'write':
        // File writing (BUILD mode only)
        const content = params.content as string;
        if (content && (content.includes('const ') || content.includes('let '))) {
          styleViolations = checkStyleViolations(content);
        }
        result = {
          operation: 'write',
          path: params.path,
          styleViolations,
          message: 'File write simulated - integrate with actual filesystem MCP'
        };

        // Store violations in session
        if (styleViolations.length > 0) {
          await supabase
            .from('opencode_sessions')
            .update({ style_violations: styleViolations })
            .eq('id', session.id);
        }
        break;

      case 'edit':
        // File editing (BUILD mode only)
        result = {
          operation: 'edit',
          path: params.path,
          message: 'File edit simulated - integrate with actual filesystem MCP'
        };
        break;

      case 'bash':
        // Shell execution (BUILD mode only)
        result = {
          operation: 'bash',
          command: params.command,
          message: 'Bash execution simulated - integrate with actual terminal MCP'
        };
        break;

      case 'search':
        // Code search (PLAN mode allowed)
        result = {
          operation: 'search',
          query: params.query,
          message: 'Code search simulated - integrate with actual search MCP'
        };
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Generate plan for PLAN mode write attempts
    let planGenerated: string | undefined;
    if (operation === 'write' && currentMode === 'plan' && !BUILD_MODE_OPERATIONS.includes(operation)) {
      // Generate approval token
      const newApprovalToken = crypto.randomUUID();
      await supabase
        .from('opencode_sessions')
        .update({ 
          approval_token: newApprovalToken,
          plan_content: JSON.stringify(params)
        })
        .eq('id', session.id);

      planGenerated = `Plan generated. Use approval token to switch to BUILD mode.`;
    }

    const response: OpenCodeResponse = {
      success: true,
      mode: currentMode,
      result,
      styleViolations: styleViolations.length > 0 ? styleViolations : undefined,
      planGenerated
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("OpenCode execute error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
