/**
 * @file workflow-code-executor/index.ts
 * @description Sandboxed JavaScript code execution for workflow nodes
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Dangerous patterns that indicate code injection or sandbox escape attempts
const BLOCKED_PATTERNS = [
  /\bDeno\b/,
  /\bprocess\b/,
  /\brequire\b/,
  /\bimport\b/,
  /\bglobalThis\b/,
  /\beval\b/,
  /\bFunction\s*\(/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\b__proto__\b/,
  /\bconstructor\s*\[/,
  /\bprototype\b/,
  /Deno\.env/,
  /Deno\.run/,
  /Deno\.Command/,
  /Deno\.readFile/,
  /Deno\.writeFile/,
  /Deno\.open/,
  /Deno\.connect/,
  /Deno\.listen/,
];

// Max code length to prevent resource exhaustion
const MAX_CODE_LENGTH = 10_000;
const MAX_TIMEOUT = 10_000;

function validateCode(code: string): string | null {
  if (code.length > MAX_CODE_LENGTH) {
    return `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`;
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return `Code contains blocked pattern: ${pattern.source}`;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Input Validation ---
    const { language, code, variables = {}, timeout = 5000 }: CodeExecutionRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: "Code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (language !== "javascript") {
      return new Response(
        JSON.stringify({ success: false, error: "Only JavaScript is supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate code for dangerous patterns
    const validationError = validateCode(code);
    if (validationError) {
      return new Response(
        JSON.stringify({ success: false, error: `Code validation failed: ${validationError}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveTimeout = Math.min(timeout, MAX_TIMEOUT);

    // --- Execution ---
    const logs: string[] = [];
    const startTime = Date.now();
    let result: ExecutionResult;

    try {
      const sandboxConsole = {
        log: (...args: unknown[]) => { if (logs.length < 100) logs.push(args.map(a => JSON.stringify(a)).join(" ")); },
        error: (...args: unknown[]) => { if (logs.length < 100) logs.push("[ERROR] " + args.map(a => JSON.stringify(a)).join(" ")); },
        warn: (...args: unknown[]) => { if (logs.length < 100) logs.push("[WARN] " + args.map(a => JSON.stringify(a)).join(" ")); },
      };

      const context = {
        inputs: Object.freeze({ ...variables }),
        console: sandboxConsole,
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
        btoa,
        atob,
        encodeURIComponent,
        decodeURIComponent,
        encodeURI,
        decodeURI,
      };

      const wrappedCode = `
        "use strict";
        const { inputs, console, JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Map, Set, btoa, atob, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI } = this;
        ${code}
      `;

      const executionPromise = new Promise((resolve, reject) => {
        try {
          const fn = new Function(wrappedCode);
          const fnResult = fn.call(context);
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
        setTimeout(() => reject(new Error("Execution timeout")), effectiveTimeout);
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
        error: "An internal error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
