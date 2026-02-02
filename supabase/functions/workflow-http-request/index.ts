import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  // Set content-type for body
  if (body && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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
    
    // Retry logic
    if (attempt < (payload.retryCount || 0) + 1) {
      console.log(`Request failed, retrying (attempt ${attempt + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
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
    const payload: HTTPRequestPayload = await req.json();

    // Validate required fields
    if (!payload.url) {
      return new Response(
        JSON.stringify({ error: "URL is required", success: false }),
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
      case "binary":
        const buffer = await response.arrayBuffer();
        responseBody = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        break;
      default:
        responseBody = await response.text();
    }

    // Build response headers map
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
        error: isTimeout ? "Request timeout" : errorMessage,
        statusCode: isTimeout ? 408 : 500,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
