import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CodeExecutionRequest {
  language: "javascript";
  code: string;
  variables?: Record<string, unknown>;
  timeout?: number;
}

interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  logs?: string[];
  executionTime?: number;
}

// Safe execution context with limited APIs
function createSandboxContext(variables: Record<string, unknown>) {
  return {
    // Input variables
    inputs: { ...variables },
    
    // Safe built-ins
    console: {
      log: (...args: unknown[]) => logs.push(args.map(a => JSON.stringify(a)).join(" ")),
      error: (...args: unknown[]) => logs.push("[ERROR] " + args.map(a => JSON.stringify(a)).join(" ")),
      warn: (...args: unknown[]) => logs.push("[WARN] " + args.map(a => JSON.stringify(a)).join(" ")),
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    
    // Utility functions
    btoa,
    atob,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
  };
}

const logs: string[] = [];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { language, code, variables = {}, timeout = 5000 }: CodeExecutionRequest = await req.json();

    // Validate input
    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: "Code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (language !== "javascript") {
      return new Response(
        JSON.stringify({ success: false, error: "Only JavaScript is supported in Edge Functions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear logs
    logs.length = 0;

    const startTime = Date.now();
    let result: ExecutionResult;

    try {
      // Wrap user code in a function with limited context
      const wrappedCode = `
        "use strict";
        const { inputs, console, JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Map, Set, btoa, atob, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI } = this;
        
        // User code starts here
        ${code}
      `;

      const context = createSandboxContext(variables);
      
      // Execute with timeout using Promise.race
      const executionPromise = new Promise((resolve, reject) => {
        try {
          const fn = new Function(wrappedCode);
          const fnResult = fn.call(context);
          
          // Handle async functions
          if (fnResult instanceof Promise) {
            fnResult.then(resolve).catch(reject);
          } else {
            resolve(fnResult);
          }
        } catch (e) {
          reject(e);
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Execution timeout")), timeout);
      });

      const executionResult = await Promise.race([executionPromise, timeoutPromise]);

      result = {
        success: true,
        result: executionResult,
        logs: [...logs],
        executionTime: Date.now() - startTime,
      };

    } catch (execError) {
      result = {
        success: false,
        error: execError instanceof Error ? execError.message : "Execution failed",
        logs: [...logs],
        executionTime: Date.now() - startTime,
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("workflow-code-executor error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
