/**
 * @file mcp-executor/index.ts
 * @description MCP 工具执行器 - 负责实际调用 MCP Server 执行工具
 * @module EdgeFunctions/MCPExecutor
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== 类型定义 ==========

interface MCPExecuteRequest {
  userId: string;
  toolName: string;
  toolArguments: Record<string, unknown>;
  mcpServerId?: string;
  agentId?: string;
  sessionId?: string;
}

interface MCPExecuteResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
  toolName: string;
  serverId?: string;
}

interface MCPServerConfig {
  id: string;
  user_id: string;
  name: string;
  version: string;
  transport_type: 'stdio' | 'sse' | 'http';
  transport_url?: string;
  transport_command?: string;
  transport_args?: string[];
  env_vars?: Array<{ name: string; value?: string }>;
  is_active: boolean;
}

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ========== 工具名解析 ==========

/**
 * 从工具名中提取 MCP 服务器 ID 和实际工具名
 * 格式: mcp_{serverId}_{toolName} 或 mcp_{toolName}
 */
function parseToolName(fullToolName: string): { serverId?: string; toolName: string } {
  // 移除 mcp_ 前缀
  const withoutPrefix = fullToolName.replace(/^mcp_/, '');
  
  // 检查是否包含服务器 ID (UUID 格式)
  const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(.+)$/i;
  const match = withoutPrefix.match(uuidPattern);
  
  if (match) {
    return { serverId: match[1], toolName: match[2] };
  }
  
  // 如果没有服务器 ID，返回原始工具名
  return { toolName: withoutPrefix };
}

// ========== HTTP MCP 调用 ==========

async function executeHttpMCP(
  config: MCPServerConfig,
  toolName: string,
  args: Record<string, unknown>,
  timeout = 30000
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  if (!config.transport_url) {
    return { success: false, error: 'MCP Server URL not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 1. 发送 initialize 请求建立连接
    const initRequest: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'agent-os-executor', version: '1.0.0' },
      },
    };

    console.log(`[mcp-executor] Initializing connection to ${config.transport_url}`);
    
    const initResponse = await fetch(config.transport_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initRequest),
      signal: controller.signal,
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`[mcp-executor] Init failed: ${initResponse.status} - ${errorText}`);
      // 继续尝试执行工具，某些 MCP 服务器可能不需要初始化
    }

    // 2. 调用工具
    const callRequest: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: Date.now() + 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    console.log(`[mcp-executor] Calling tool: ${toolName} with args:`, JSON.stringify(args).slice(0, 200));

    const callResponse = await fetch(config.transport_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callRequest),
      signal: controller.signal,
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      return { success: false, error: `HTTP ${callResponse.status}: ${errorText}` };
    }

    const result: JSONRPCResponse = await callResponse.json();

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, result: result.result };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Request timeout' };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ========== SSE MCP 调用 ==========

async function executeSSEMCP(
  config: MCPServerConfig,
  toolName: string,
  args: Record<string, unknown>,
  timeout = 30000
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  if (!config.transport_url) {
    return { success: false, error: 'MCP Server URL not configured' };
  }

  // SSE 需要长连接，在 Edge Function 环境中有限制
  // 尝试使用 HTTP POST 作为回退
  console.log(`[mcp-executor] SSE transport - attempting HTTP fallback for ${config.transport_url}`);
  
  try {
    // 尝试 POST 请求到 SSE endpoint
    const callRequest: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await fetch(config.transport_url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(callRequest),
    });

    if (!response.ok) {
      return { success: false, error: `SSE fallback failed: HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      // 处理 SSE 响应 - 读取第一个完整事件
      const text = await response.text();
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.result !== undefined || data.error !== undefined) {
            if (data.error) {
              return { success: false, error: data.error.message || 'SSE error' };
            }
            return { success: true, result: data.result };
          }
        }
      }
      
      return { success: false, error: 'No result in SSE response' };
    } else {
      // JSON 响应
      const result: JSONRPCResponse = await response.json();
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true, result: result.result };
    }
  } catch (error) {
    return { success: false, error: `SSE execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ========== 模拟执行（用于 stdio 或不可用的 MCP） ==========

function executeSimulatedMCP(
  config: MCPServerConfig,
  toolName: string,
  args: Record<string, unknown>
): { success: boolean; result?: unknown; error?: string } {
  console.log(`[mcp-executor] Simulating execution for ${toolName} (transport: ${config.transport_type})`);
  
  // 返回模拟结果
  return {
    success: true,
    result: {
      _simulated: true,
      message: `Tool '${toolName}' execution simulated`,
      serverName: config.name,
      transportType: config.transport_type,
      providedArguments: args,
      note: 'stdio transport requires local execution environment',
    },
  };
}

// ========== 主服务 ==========

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 认证检查
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let authenticatedUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        authenticatedUserId = user.id;
      }
    }

    // 解析请求
    const request: MCPExecuteRequest = await req.json();
    const { 
      userId, 
      toolName: fullToolName, 
      toolArguments, 
      mcpServerId: providedServerId,
      agentId,
    } = request;

    // 使用认证用户 ID 或请求中的 userId
    const effectiveUserId = authenticatedUserId || userId;

    if (!effectiveUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fullToolName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tool name required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 解析工具名
    const { serverId: parsedServerId, toolName } = parseToolName(fullToolName);
    const serverId = providedServerId || parsedServerId;

    console.log(`[mcp-executor] Executing tool: ${toolName}, serverId: ${serverId || 'auto-detect'}`);

    // 查找 MCP Server 配置
    let serverConfig: MCPServerConfig | null = null;

    if (serverId) {
      // 使用指定的服务器 ID
      const { data, error } = await supabase
        .from('user_mcp_servers')
        .select('*')
        .eq('id', serverId)
        .eq('user_id', effectiveUserId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error(`[mcp-executor] Server not found: ${serverId}`, error?.message);
      } else {
        serverConfig = data as MCPServerConfig;
      }
    }

    if (!serverConfig) {
      // 尝试从 asset_semantic_index 中查找 MCP 工具配置
      const { data: assetData } = await supabase
        .from('asset_semantic_index')
        .select('metadata')
        .eq('asset_type', 'mcp_tool')
        .eq('user_id', effectiveUserId)
        .eq('name', toolName)
        .single();

      if (assetData?.metadata?.mcpServerId) {
        const { data: serverData } = await supabase
          .from('user_mcp_servers')
          .select('*')
          .eq('id', assetData.metadata.mcpServerId)
          .eq('is_active', true)
          .single();

        if (serverData) {
          serverConfig = serverData as MCPServerConfig;
        }
      }
    }

    if (!serverConfig) {
      // 查找用户的任何活跃 HTTP/SSE MCP 服务器
      const { data: servers } = await supabase
        .from('user_mcp_servers')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('is_active', true)
        .in('transport_type', ['http', 'sse'])
        .limit(1);

      if (servers && servers.length > 0) {
        serverConfig = servers[0] as MCPServerConfig;
        console.log(`[mcp-executor] Using fallback server: ${serverConfig.name}`);
      }
    }

    // 执行 MCP 调用
    let execResult: { success: boolean; result?: unknown; error?: string };

    if (!serverConfig) {
      // 无可用服务器，返回模拟结果
      execResult = {
        success: true,
        result: {
          _noServer: true,
          message: `No MCP server configured for tool '${toolName}'`,
          suggestion: 'Please configure an MCP server in settings',
          providedArguments: toolArguments,
        },
      };
    } else if (serverConfig.transport_type === 'http') {
      execResult = await executeHttpMCP(serverConfig, toolName, toolArguments || {});
    } else if (serverConfig.transport_type === 'sse') {
      execResult = await executeSSEMCP(serverConfig, toolName, toolArguments || {});
    } else {
      // stdio - 需要本地运行环境
      execResult = executeSimulatedMCP(serverConfig, toolName, toolArguments || {});
    }

    const executionTimeMs = Date.now() - startTime;

    // 记录执行日志
    try {
      await supabase.from('mcp_execution_logs').insert({
        user_id: effectiveUserId,
        server_id: serverConfig?.id || null,
        agent_id: agentId || null,
        tool_name: toolName,
        arguments: toolArguments || {},
        result: execResult.result,
        status: execResult.success ? 'success' : 'error',
        error_message: execResult.error || null,
        execution_time_ms: executionTimeMs,
      });
    } catch (logError) {
      console.error('[mcp-executor] Failed to log execution:', logError);
    }

    // 返回结果
    const response: MCPExecuteResult = {
      success: execResult.success,
      result: execResult.result,
      error: execResult.error,
      executionTimeMs,
      toolName,
      serverId: serverConfig?.id,
    };

    console.log(`[mcp-executor] Completed in ${executionTimeMs}ms, success: ${execResult.success}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[mcp-executor] Error:', error);

    const response: MCPExecuteResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
      toolName: '',
    };

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
