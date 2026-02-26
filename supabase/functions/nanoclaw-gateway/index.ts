import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Security: SSRF Prevention ──────────────────────────────────
function isPrivateOrBlockedIP(ip: string): boolean {
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    if (a === 127) return true;         // Loopback
    if (a === 10) return true;          // Private 10/8
    if (a === 172 && b >= 16 && b <= 31) return true; // Private 172.16/12
    if (a === 192 && b === 168) return true;           // Private 192.168/16
    if (a === 169 && b === 254) return true;           // Link-local
    if (a === 0) return true;           // 0.0.0.0/8
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;
  }
  // IPv6 checks
  if (ip === '::1' || ip === '[::1]') return true;
  if (ip.toLowerCase().startsWith('fe80')) return true;
  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true; // ULA
  return false;
}

function isPrivateOrBlockedHost(hostname: string): boolean {
  const blockedHosts = [
    'localhost', '169.254.169.254', 'metadata.google.internal',
    'metadata.google', 'metadata', '0.0.0.0',
  ];
  if (blockedHosts.includes(hostname.toLowerCase())) return true;
  return isPrivateOrBlockedIP(hostname);
}

/**
 * DNS rebinding defense: resolve hostname and verify resolved IPs
 * are not private/internal addresses.
 */
async function validateResolvedDns(hostname: string): Promise<{ ok: boolean; error?: string }> {
  // Skip if hostname is already an IP literal
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) {
    return isPrivateOrBlockedIP(hostname)
      ? { ok: false, error: 'Blocked endpoint: resolved to private/internal IP' }
      : { ok: true };
  }
  try {
    const aRecords = await Deno.resolveDns(hostname, 'A');
    for (const ip of aRecords) {
      if (isPrivateOrBlockedIP(ip)) {
        return { ok: false, error: `Blocked endpoint: "${hostname}" resolves to private IP ${ip}` };
      }
    }
  } catch {
    // DNS resolution failed — allow through (the actual fetch will fail anyway)
  }
  return { ok: true };
}

// ── Security: Path Traversal Prevention ────────────────────────
function validateFilePath(filePath: string): { ok: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { ok: false, error: 'filePath is required' };
  }
  // Block absolute paths
  if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) {
    return { ok: false, error: 'Absolute paths are not allowed — path escapes project root' };
  }
  // Block directory traversal
  const segments = filePath.split(/[\\/]/);
  if (segments.some(s => s === '..' || s === '~')) {
    return { ok: false, error: 'Path traversal (..) detected — path escapes project root' };
  }
  // Block null bytes
  if (filePath.includes('\0')) {
    return { ok: false, error: 'Null bytes in path are not allowed' };
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const { action, nanoclawEndpoint, authToken, ...params } = await req.json();

    // ── SSRF check on endpoint ──
    if (nanoclawEndpoint) {
      try {
        const url = new URL(nanoclawEndpoint);
        // Layer 1: hostname literal check
        if (isPrivateOrBlockedHost(url.hostname)) {
          return new Response(
            JSON.stringify({ error: 'Blocked endpoint: private/internal address' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Layer 2: DNS rebinding defense — resolve and verify IPs
        const dnsCheck = await validateResolvedDns(url.hostname);
        if (!dnsCheck.ok) {
          return new Response(
            JSON.stringify({ error: dnsCheck.error }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Block non-HTTP(S) protocols
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          return new Response(
            JSON.stringify({ error: 'Only HTTP(S) endpoints are allowed' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Path validation for file operations ──
    if ((action === 'write_file' || action === 'read_file') && params.filePath) {
      const pathCheck = validateFilePath(params.filePath);
      if (!pathCheck.ok) {
        return new Response(
          JSON.stringify({ error: pathCheck.error }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let result;
    const baseHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'X-User-ID': userId,
    };

    switch (action) {
      case 'health': {
        const response = await fetch(`${nanoclawEndpoint}/health`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
          signal: AbortSignal.timeout(5000),
        });
        result = await response.json();
        break;
      }

      case 'create_container': {
        const response = await fetch(`${nanoclawEndpoint}/containers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify(params.config),
        });
        result = await response.json();
        break;
      }

      case 'terminate_container': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}`, {
          method: 'DELETE',
          headers: baseHeaders,
        });
        result = await response.json();
        break;
      }

      case 'container_status': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/status`, {
          headers: baseHeaders,
        });
        result = await response.json();
        break;
      }

      case 'list_containers': {
        const response = await fetch(`${nanoclawEndpoint}/containers?userId=${userId}`, {
          headers: baseHeaders,
        });
        result = await response.json();
        break;
      }

      case 'execute': {
        const response = await fetch(`${nanoclawEndpoint}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify(params.request),
          signal: AbortSignal.timeout(60000),
        });
        result = await response.json();
        break;
      }

      case 'deploy_skill': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify({ name: params.skillName, content: params.skillMd }),
        });
        result = await response.json();
        break;
      }

      case 'apply_skill': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/skills/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify({ skillDir: params.skillDir }),
        });
        result = await response.json();
        break;
      }

      case 'unapply_skill': {
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/skills/unapply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify({
            skillName: params.skillName,
            skillDir: params.skillDir,
            restoreBackup: params.restoreBackup ?? true,
          }),
        });
        result = await response.json();
        break;
      }

      case 'read_file': {
        // Path already validated above
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/files?path=${encodeURIComponent(params.filePath)}`, {
          headers: baseHeaders,
        });
        result = await response.json();
        break;
      }

      case 'write_file': {
        // Path already validated above
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify({ path: params.filePath, content: params.content }),
        });
        result = await response.json();
        break;
      }

      case 'delete_file': {
        // Validate path for delete operations too
        if (params.filePath) {
          const pathCheck = validateFilePath(params.filePath);
          if (!pathCheck.ok) {
            return new Response(
              JSON.stringify({ error: pathCheck.error }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        const response = await fetch(`${nanoclawEndpoint}/containers/${params.containerId}/files?path=${encodeURIComponent(params.filePath)}`, {
          method: 'DELETE',
          headers: baseHeaders,
        });
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[nanoclaw-gateway] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
