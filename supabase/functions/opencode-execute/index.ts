import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
type OpenCodeMode = 'plan' | 'build';
type OperationType = 'list' | 'read' | 'write' | 'edit' | 'bash' | 'search' | 'style-check';
type StyleRule = 'no-let' | 'no-else' | 'single-word' | 'no-destructure' | 'no-any' | 'no-try-catch' | 'prefer-bun-api' | 'no-nested-ternary';

interface OpenCodeRequest {
  agentId: string;
  sessionId: string;
  operation: OperationType;
  params: Record<string, unknown>;
  requestMode?: OpenCodeMode;
  approvalToken?: string;
}

interface OpenCodeResponse {
  success: boolean;
  mode: OpenCodeMode;
  result?: unknown;
  styleViolations?: StyleViolation[];
  selfCheckReport?: string;
  autoRefactored?: boolean;
  refactoredCode?: string;
  modeBlockReason?: string;
  planGenerated?: string;
  error?: string;
}

interface StyleViolation {
  rule: StyleRule;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  autoFix?: string;
  original?: string;
}

interface KernelRules {
  planFirst?: boolean;
  requireApprovalForBuild?: boolean;
  styleCheckOnWrite?: boolean;
  selfRefactorOnViolation?: boolean;
  noLetStatements?: boolean;
  noElseStatements?: boolean;
  noAnyType?: boolean;
  singleWordNaming?: boolean;
  avoidDestructuring?: boolean;
  avoidTryCatch?: boolean;
  preferBunAPIs?: boolean;
}

interface SelfCheckQuestions {
  usedLet: boolean;
  usedElse: boolean;
  usedAny: boolean;
  usedDestructuring: boolean;
  usedTryCatch: boolean;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Operations that require BUILD mode
const BUILD_MODE_OPERATIONS: OperationType[] = ['write', 'edit', 'bash'];

// Enhanced style checking with all OpenCode rules
function checkStyleViolations(code: string): StyleViolation[] {
  const violations: StyleViolation[] = [];
  const lines = code.split('\n');

  const ruleConfigs: Array<{
    rule: StyleRule;
    pattern: RegExp;
    message: string;
    severity: 'error' | 'warning' | 'info';
    autoFix?: (line: string) => string;
  }> = [
    {
      rule: 'no-let',
      pattern: /\blet\s+\w+/,
      message: 'Use const with ternary instead of let',
      severity: 'error',
      autoFix: (line) => line.replace(/\blet\b/, 'const')
    },
    {
      rule: 'no-else',
      pattern: /\belse\s*{|\belse\s+if/,
      message: 'Use early return instead of else',
      severity: 'error'
    },
    {
      rule: 'no-any',
      pattern: /:\s*any\b/,
      message: 'Use specific types instead of any',
      severity: 'error',
      autoFix: (line) => line.replace(/:\s*any\b/, ': unknown')
    },
    {
      rule: 'no-destructure',
      pattern: /(?:const|let|var)\s*\{\s*\w+/,
      message: 'Avoid destructuring, use direct property access',
      severity: 'warning'
    },
    {
      rule: 'no-try-catch',
      pattern: /\btry\s*\{/,
      message: 'Consider Result pattern instead of try/catch',
      severity: 'warning'
    },
    {
      rule: 'prefer-bun-api',
      pattern: /require\s*\(\s*['"]fs['"]\)|from\s+['"]fs['"]/,
      message: 'Use Bun.file() instead of Node.js fs',
      severity: 'warning'
    },
    {
      rule: 'single-word',
      pattern: /\b(const|let|var)\s+([a-z]+[A-Z][a-zA-Z]*)\s*[=:]/,
      message: 'Prefer single-word variable names',
      severity: 'info'
    }
  ];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    ruleConfigs.forEach(config => {
      const match = line.match(config.pattern);
      if (match) {
        violations.push({
          rule: config.rule,
          line: lineNumber,
          column: match.index ? match.index + 1 : 1,
          message: config.message,
          severity: config.severity,
          autoFix: config.autoFix ? config.autoFix(line) : undefined,
          original: trimmed
        });
      }
    });
  });

  return violations;
}

// Generate self-check report
function generateSelfCheckReport(violations: StyleViolation[]): { questions: SelfCheckQuestions; report: string } {
  const questions: SelfCheckQuestions = {
    usedLet: violations.some(v => v.rule === 'no-let'),
    usedElse: violations.some(v => v.rule === 'no-else'),
    usedAny: violations.some(v => v.rule === 'no-any'),
    usedDestructuring: violations.some(v => v.rule === 'no-destructure'),
    usedTryCatch: violations.some(v => v.rule === 'no-try-catch')
  };

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const passed = errorCount === 0;
  const score = Math.max(0, 100 - (errorCount * 15) - (violations.filter(v => v.severity === 'warning').length * 5));

  const report = `## OpenCode Self-Check Report

**Score**: ${score}/100
**Status**: ${passed ? '✅ PASSED' : '❌ NEEDS REFACTORING'}

### Self-Check Questions
1. Did I use 'let'? ${questions.usedLet ? '⚠️ YES - Rewrite needed' : '✓ NO'}
2. Did I use 'else'? ${questions.usedElse ? '⚠️ YES - Rewrite needed' : '✓ NO'}
3. Did I use 'any' type? ${questions.usedAny ? '⚠️ YES - Rewrite needed' : '✓ NO'}
4. Did I use destructuring? ${questions.usedDestructuring ? '⚠️ YES - Consider refactor' : '✓ NO'}
5. Did I use try/catch? ${questions.usedTryCatch ? '⚠️ YES - Consider Result pattern' : '✓ NO'}

### Violations Found: ${violations.length}`;

  return { questions, report };
}

// Apply auto-fixes to code
function applyAutoFixes(code: string, violations: StyleViolation[]): string {
  const lines = code.split('\n');
  
  const fixable = violations
    .filter(v => v.autoFix)
    .sort((a, b) => b.line - a.line);
  
  fixable.forEach(v => {
    const lineIndex = v.line - 1;
    if (lineIndex >= 0 && lineIndex < lines.length && v.autoFix) {
      lines[lineIndex] = v.autoFix;
    }
  });
  
  return lines.join('\n');
}

// Fetch kernel rules from database
async function getKernelRules(supabase: unknown): Promise<KernelRules> {
  const client = supabase as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: { rules: KernelRules } | null }> } } } };
  const { data } = await client
    .from('kernel_skills')
    .select('rules')
    .eq('skill_id', 'core-opencode')
    .single();
  
  return data?.rules ?? {
    styleCheckOnWrite: true,
    selfRefactorOnViolation: true
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !userData.user) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const user = userData.user;

  // Parse request
  const request: OpenCodeRequest = await req.json();
  const { agentId, sessionId, operation, params, requestMode, approvalToken } = request;

  // Handle style-check operation (no mode restriction)
  if (operation === 'style-check') {
    const code = params.code as string;
    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing code parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const violations = checkStyleViolations(code);
    const { questions, report } = generateSelfCheckReport(violations);
    const kernelRules = await getKernelRules(supabase);
    
    const refactoredCode = kernelRules.selfRefactorOnViolation && violations.some(v => v.autoFix)
      ? applyAutoFixes(code, violations)
      : undefined;

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'plan' as OpenCodeMode,
        styleViolations: violations,
        selfCheckReport: report,
        refactoredCode,
        autoRefactored: !!refactoredCode,
        result: { questions, score: Math.max(0, 100 - violations.filter(v => v.severity === 'error').length * 15) }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get or create session
  const { data: existingSession } = await supabase
    .from('opencode_sessions')
    .select('*')
    .eq('agent_id', agentId)
    .eq('session_id', sessionId)
    .single();

  const session = existingSession ?? await (async () => {
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
    return newSession;
  })();

  const currentMode: OpenCodeMode = session.current_mode;
  const kernelRules = await getKernelRules(supabase);

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
  let selfCheckReport: string | undefined;
  let refactoredCode: string | undefined;
  let autoRefactored = false;

  switch (operation) {
    case 'list':
      result = {
        operation: 'list',
        path: params.path,
        message: 'File listing simulated - integrate with actual filesystem MCP'
      };
      break;

    case 'read':
      result = {
        operation: 'read',
        path: params.path,
        message: 'File read simulated - integrate with actual filesystem MCP'
      };
      break;

    case 'write': {
      const content = params.content as string;
      
      // Run style check if enabled
      if (content && kernelRules.styleCheckOnWrite) {
        styleViolations = checkStyleViolations(content);
        const checkResult = generateSelfCheckReport(styleViolations);
        selfCheckReport = checkResult.report;
        
        // Auto-refactor if enabled and there are fixable violations
        if (kernelRules.selfRefactorOnViolation && styleViolations.some(v => v.autoFix)) {
          refactoredCode = applyAutoFixes(content, styleViolations);
          autoRefactored = true;
        }
      }
      
      result = {
        operation: 'write',
        path: params.path,
        originalContent: content,
        refactoredContent: refactoredCode,
        styleViolations,
        autoRefactored,
        message: autoRefactored 
          ? 'Code auto-refactored to comply with OpenCode style guide'
          : 'File write simulated - integrate with actual filesystem MCP'
      };

      // Store violations in session
      if (styleViolations.length > 0) {
        await supabase
          .from('opencode_sessions')
          .update({ style_violations: styleViolations })
          .eq('id', session.id);
      }
      break;
    }

    case 'edit':
      result = {
        operation: 'edit',
        path: params.path,
        message: 'File edit simulated - integrate with actual filesystem MCP'
      };
      break;

    case 'bash':
      result = {
        operation: 'bash',
        command: params.command,
        message: 'Bash execution simulated - integrate with actual terminal MCP'
      };
      break;

    case 'search':
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
    selfCheckReport,
    autoRefactored,
    refactoredCode,
    planGenerated
  };

  return new Response(
    JSON.stringify(response),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
