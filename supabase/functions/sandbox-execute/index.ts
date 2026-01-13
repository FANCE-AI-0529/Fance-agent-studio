import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MPLP 权限到网络域名的映射
const MPLP_NETWORK_MAPPINGS: Record<string, string[]> = {
  'network:openai': ['api.openai.com', '*.openai.azure.com'],
  'network:anthropic': ['api.anthropic.com'],
  'network:google': ['generativelanguage.googleapis.com', '*.googleapis.com'],
  'network:lovable': ['ai.gateway.lovable.dev'],
  'network:aws': ['*.amazonaws.com', '*.aws.amazon.com'],
  'network:gcp': ['*.googleapis.com', '*.google.com'],
  'network:azure': ['*.azure.com', '*.microsoft.com'],
  'network:github': ['api.github.com', 'github.com', 'raw.githubusercontent.com'],
  'network:slack': ['slack.com', '*.slack.com', 'api.slack.com'],
  'network:notion': ['api.notion.com'],
  'network:internal': ['*.supabase.co', 'localhost', '127.0.0.1'],
};

interface SandboxConfig {
  limits: {
    maxCpuMs: number;
    maxMemoryMb: number;
    maxExecutionMs: number;
    maxNetworkRequests: number;
    maxOutputSizeKb: number;
  };
  networkPolicy: {
    mode: 'deny_all' | 'allow_whitelist' | 'mplp_controlled';
    whitelist: Array<{ pattern: string; protocols: string[] }>;
    mplpBindings: Array<{ permission: string; domains: string[] }>;
  };
  timeoutMs: number;
  auditEnabled: boolean;
}

interface NetworkLog {
  timestamp: string;
  method: string;
  url: string;
  domain: string;
  status: 'allowed' | 'blocked' | 'rate_limited';
  responseStatus?: number;
  durationMs?: number;
  bytesIn?: number;
  bytesOut?: number;
  blockReason?: string;
}

interface ExecutionMetrics {
  cpuTimeMs: number;
  memoryPeakMb: number;
  executionTimeMs: number;
  networkRequestsCount: number;
  networkBytesIn: number;
  networkBytesOut: number;
}

// 域名匹配
function matchDomain(domain: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return domain === suffix || domain.endsWith('.' + suffix);
  }
  return domain === pattern;
}

// 检查网络访问权限
function checkNetworkAccess(
  domain: string,
  policy: SandboxConfig['networkPolicy'],
  grantedPermissions: string[]
): { allowed: boolean; reason?: string } {
  // 1. 检查白名单
  if (policy.whitelist.some(rule => matchDomain(domain, rule.pattern))) {
    return { allowed: true };
  }
  
  // 2. deny_all 模式
  if (policy.mode === 'deny_all') {
    return { allowed: false, reason: 'Network access denied by policy' };
  }
  
  // 3. 检查 MPLP 绑定
  for (const binding of policy.mplpBindings) {
    if (grantedPermissions.includes(binding.permission)) {
      if (binding.domains.some(d => matchDomain(domain, d))) {
        return { allowed: true };
      }
    }
  }
  
  // 4. 检查全局 MPLP 映射
  for (const [permission, domains] of Object.entries(MPLP_NETWORK_MAPPINGS)) {
    if (grantedPermissions.includes(permission)) {
      if (domains.some(d => matchDomain(domain, d))) {
        return { allowed: true };
      }
    }
  }
  
  // 5. 获取所需权限
  let requiredPermission: string | null = null;
  for (const [perm, domains] of Object.entries(MPLP_NETWORK_MAPPINGS)) {
    if (domains.some(d => matchDomain(domain, d))) {
      requiredPermission = perm;
      break;
    }
  }
  
  return { 
    allowed: false, 
    reason: requiredPermission 
      ? `Requires permission: ${requiredPermission}` 
      : `Domain not in whitelist: ${domain}`,
  };
}

// 创建网络代理
function createNetworkProxy(
  policy: SandboxConfig['networkPolicy'],
  grantedPermissions: string[],
  networkLogs: NetworkLog[],
  metrics: ExecutionMetrics,
  maxRequests: number
): (url: string | URL | Request, options?: RequestInit) => Promise<Response> {
  return async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    const parsedUrl = new URL(urlString);
    const domain = parsedUrl.hostname;
    const method = options?.method || (url instanceof Request ? url.method : 'GET');
    
    // 检查请求数量限制
    if (metrics.networkRequestsCount >= maxRequests) {
      const log: NetworkLog = {
        timestamp: new Date().toISOString(),
        method,
        url: urlString,
        domain,
        status: 'rate_limited',
        blockReason: 'Max network requests exceeded',
      };
      networkLogs.push(log);
      
      throw new Error(`NETWORK_RATE_LIMITED: Maximum ${maxRequests} requests exceeded`);
    }
    
    // 检查网络访问权限
    const accessCheck = checkNetworkAccess(domain, policy, grantedPermissions);
    
    if (!accessCheck.allowed) {
      const log: NetworkLog = {
        timestamp: new Date().toISOString(),
        method,
        url: urlString,
        domain,
        status: 'blocked',
        blockReason: accessCheck.reason,
      };
      networkLogs.push(log);
      
      throw new Error(`NETWORK_BLOCKED: ${accessCheck.reason}`);
    }
    
    // 执行实际请求
    const startTime = performance.now();
    try {
      const response = await fetch(urlString, options);
      const durationMs = Math.round(performance.now() - startTime);
      
      // 估算字节数
      const contentLength = response.headers.get('content-length');
      const bytesIn = contentLength ? parseInt(contentLength, 10) : 0;
      const requestBodyLength = options?.body 
        ? (typeof options.body === 'string' ? options.body.length : 0)
        : 0;
      
      // 更新指标
      metrics.networkRequestsCount++;
      metrics.networkBytesIn += bytesIn;
      metrics.networkBytesOut += requestBodyLength;
      
      // 记录日志
      const log: NetworkLog = {
        timestamp: new Date().toISOString(),
        method,
        url: urlString,
        domain,
        status: 'allowed',
        responseStatus: response.status,
        durationMs,
        bytesIn,
        bytesOut: requestBodyLength,
      };
      networkLogs.push(log);
      
      return response;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      
      const log: NetworkLog = {
        timestamp: new Date().toISOString(),
        method,
        url: urlString,
        domain,
        status: 'allowed',
        durationMs,
        blockReason: error instanceof Error ? error.message : 'Unknown error',
      };
      networkLogs.push(log);
      
      throw error;
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      skillCode, 
      input, 
      config, 
      mplpToken,
      grantedPermissions = [],
      skillId,
      agentId,
    } = await req.json();

    // 验证必需参数
    if (!skillCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: 'skillCode is required' } 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sandboxConfig: SandboxConfig = config || {
      limits: {
        maxCpuMs: 100,
        maxMemoryMb: 64,
        maxExecutionMs: 10000,
        maxNetworkRequests: 20,
        maxOutputSizeKb: 500,
      },
      networkPolicy: {
        mode: 'mplp_controlled',
        whitelist: [{ pattern: '*.supabase.co', protocols: ['https'] }],
        mplpBindings: [],
      },
      timeoutMs: 10000,
      auditEnabled: true,
    };

    // 初始化指标和日志
    const metrics: ExecutionMetrics = {
      cpuTimeMs: 0,
      memoryPeakMb: 0,
      executionTimeMs: 0,
      networkRequestsCount: 0,
      networkBytesIn: 0,
      networkBytesOut: 0,
    };
    
    const networkLogs: NetworkLog[] = [];
    const startTime = performance.now();
    const executionToken = crypto.randomUUID();

    // 创建网络代理
    const proxiedFetch = createNetworkProxy(
      sandboxConfig.networkPolicy,
      grantedPermissions,
      networkLogs,
      metrics,
      sandboxConfig.limits.maxNetworkRequests
    );

    // 执行代码 (使用 Function 构造器创建沙箱环境)
    let result: unknown;
    let executionError: { code: string; message: string; details?: unknown } | null = null;

    try {
      // 创建超时 Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT: Execution time exceeded'));
        }, sandboxConfig.limits.maxExecutionMs);
      });

      // 创建执行 Promise
      const executionPromise = (async () => {
        // 注意: 在真实实现中，应该使用更安全的沙箱环境
        // 这里使用 AsyncFunction 作为演示
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        
        // 创建受限的执行上下文
        const sandboxContext = {
          fetch: proxiedFetch,
          console: {
            log: (...args: unknown[]) => console.log('[Sandbox]', ...args),
            error: (...args: unknown[]) => console.error('[Sandbox]', ...args),
            warn: (...args: unknown[]) => console.warn('[Sandbox]', ...args),
          },
          JSON,
          Math,
          Date,
          Array,
          Object,
          String,
          Number,
          Boolean,
          Promise,
          Map,
          Set,
          // 禁止危险 API
          Deno: undefined,
          eval: undefined,
          Function: undefined,
        };

        // 包装代码以返回结果
        const wrappedCode = `
          return (async () => {
            const input = ${JSON.stringify(input)};
            ${skillCode}
          })();
        `;

        const fn = new AsyncFunction(
          ...Object.keys(sandboxContext),
          wrappedCode
        );

        return await fn(...Object.values(sandboxContext));
      })();

      // 使用 Promise.race 实现超时
      result = await Promise.race([executionPromise, timeoutPromise]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 解析错误类型
      if (errorMessage.startsWith('TIMEOUT:')) {
        executionError = { code: 'TIMEOUT', message: errorMessage };
      } else if (errorMessage.startsWith('NETWORK_BLOCKED:')) {
        executionError = { 
          code: 'NETWORK_BLOCKED', 
          message: errorMessage,
          details: { networkLogs },
        };
      } else if (errorMessage.startsWith('NETWORK_RATE_LIMITED:')) {
        executionError = { code: 'NETWORK_RATE_LIMITED', message: errorMessage };
      } else {
        executionError = { code: 'RUNTIME_ERROR', message: errorMessage };
      }
    }

    // 计算执行时间
    metrics.executionTimeMs = Math.round(performance.now() - startTime);

    // 检查输出大小
    const outputJson = JSON.stringify(result);
    const outputSizeKb = outputJson.length / 1024;
    
    if (outputSizeKb > sandboxConfig.limits.maxOutputSizeKb) {
      executionError = {
        code: 'OUTPUT_SIZE_EXCEEDED',
        message: `Output size ${outputSizeKb.toFixed(2)}KB exceeds limit ${sandboxConfig.limits.maxOutputSizeKb}KB`,
      };
    }

    // 构建响应
    const response = {
      success: !executionError,
      output: executionError ? undefined : result,
      error: executionError,
      metrics,
      networkLogs,
      auditId: executionToken,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Sandbox execution error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { 
          code: 'RUNTIME_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metrics: {
          cpuTimeMs: 0,
          memoryPeakMb: 0,
          executionTimeMs: 0,
          networkRequestsCount: 0,
          networkBytesIn: 0,
          networkBytesOut: 0,
        },
        networkLogs: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
