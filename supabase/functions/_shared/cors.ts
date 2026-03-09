/**
 * @file _shared/cors.ts
 * @description Shared CORS configuration with environment-based origin control
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */

/**
 * Allowed origins for CORS.
 * In production, restrict to known domains.
 * Set ALLOWED_ORIGINS env var as comma-separated list of domains.
 * Falls back to '*' if not configured (development mode).
 */
function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim()).filter(Boolean);
  }
  return [];
}

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  let origin = "*";
  if (allowedOrigins.length > 0 && requestOrigin) {
    // Check if request origin is in the allowed list
    if (allowedOrigins.includes(requestOrigin)) {
      origin = requestOrigin;
    } else {
      // In strict mode, don't set a permissive origin
      origin = allowedOrigins[0];
    }
  } else if (allowedOrigins.length > 0) {
    origin = allowedOrigins[0];
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    ...(allowedOrigins.length > 0 ? { "Vary": "Origin" } : {}),
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    return new Response(null, { headers: getCorsHeaders(origin) });
  }
  return null;
}
