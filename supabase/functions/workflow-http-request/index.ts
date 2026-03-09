/**
 * @file workflow-http-request/index.ts
 * @description HTTP request proxy for workflow nodes with SSRF protection
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HTTPRequestPayload {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  queryParams?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  authType?: "none" | "bearer" | "basic" | "api_key";
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
    apiKeyHeader?: string;
    apiKey?: string;
  };
  responseFormat?: "json" | "xml" | "text" | "binary";
}

// --- SSRF Protection ---
const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",           // AWS/GCP metadata
  "metadata.google.internal",
  "100.100.100.200",           // Alibaba Cloud metadata
];

const PRIVATE_CIDR_PREFIXES = [
  "10.",
  "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.",
  "172.24.", "172.25.", "172.26.", "172.27.",
  "172.28.", "172.29.", "172.30.", "172.31.",
  "192.168.",
  "fc00:", "fd00:",
  "fe80:",
];

function isBlockedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block non-http(s) schemes
    if (!["http:", "https:"].includes(url.protocol)) {
      return true;
    }

    // Block known internal hosts
    if (BLOCKED_HOSTS.includes(hostname)) {
      return true;
    }

    // Block private IP ranges
    for (const prefix of PRIVATE_CIDR_PREFIXES) {
      if (hostname.startsWith(prefix)) {
        return true;
      }
    }

    // Block .local and .internal domains
    if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".svc")) {
      return true;
    }

    // Block supabase internal URLs
    if (hostname.includes("supabase.co") && hostname.includes("internal")) {
      return true;
    }

    return false;
  } catch {
    return true; // Block malformed URLs
  }
}

// DNS rebinding protection: resolve and re-check
async function validateResolvedAddress(hostname: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(hostname, "A");
    for (const ip of records) {
      for (const prefix of PRIVATE_CIDR_PREFIXES) {
        if (ip.startsWith(prefix)) return false;
      }
      if (BLOCKED_HOSTS.includes(ip)) return false;
    }
    return true;
  } catch {
    // If DNS resolution fails, allow (could be an IP already validated)
    return true;
  }
}

async function makeRequest(
  payload: HTTPRequestPayload,
  attempt: number = 1
): Promise<Response> {
  const { method, url, headers = {}, body, queryParams, timeout = 30000, authType, authConfig } = payload;

  // Build URL with query params
  let finalUrl = url;
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams(queryParams);
    finalUrl += (url.includes("?") ? "&" : "?") + params.toString();
  }

  // Build headers with auth
  const requestHeaders: Record<string, string> = { ...headers };

  if (authType === "bearer" && authConfig?.token) {
    requestHeaders["Authorization"] = `Bearer ${authConfig.token}`;
  } else if (authType === "basic" && authConfig?.username && authConfig?.password) {
    const credentials = btoa(`${authConfig.username}:${authConfig.password}`);
    requestHeaders["Authorization"] = `Basic ${credentials}`;
  } else if (authType === "api_key" && authConfig?.apiKeyHeader && authConfig?.apiKey) {
    requestHeaders[authConfig.apiKeyHeader] = authConfig.apiKey;
  }

  if (body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.min(timeout, 60000));

  try {
    const response = await fetch(finalUrl, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (attempt < Math.min((payload.retryCount || 0) + 1, 3)) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      return makeRequest(payload, attempt + 1);
    }

    throw error;
  }
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
        JSON.stringify({ error: "Authentication required", success: false }),
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
        JSON.stringify({ error: "Invalid or expired token", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: HTTPRequestPayload = await req.json();

    // Validate required fields
    if (!payload.url) {
      return new Response(
        JSON.stringify({ error: "URL is required", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SSRF Protection ---
    if (isBlockedUrl(payload.url)) {
      return new Response(
        JSON.stringify({ error: "URL is not allowed: private or internal network addresses are blocked", success: false }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DNS rebinding protection
    try {
      const parsedUrl = new URL(payload.url);
      const dnsValid = await validateResolvedAddress(parsedUrl.hostname);
      if (!dnsValid) {
        return new Response(
          JSON.stringify({ error: "URL resolves to a blocked address", success: false }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await makeRequest(payload);

    // Parse response based on format
    let responseBody: unknown;
    const contentType = response.headers.get("content-type") || "";
    const format = payload.responseFormat || (contentType.includes("application/json") ? "json" : "text");

    switch (format) {
      case "json":
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
        break;
      case "binary": {
        const buffer = await response.arrayBuffer();
        responseBody = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        break;
      }
      default:
        responseBody = await response.text();
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const result = {
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      body: responseBody,
      headers: responseHeaders,
      error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("workflow-http-request error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = errorMessage.includes("abort");

    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout ? "Request timeout" : "An internal error occurred",
        statusCode: isTimeout ? 408 : 500,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
