import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MCPConfig {
  name: string;
  version: string;
  description?: string;
  transport: {
    type: "stdio" | "sse" | "http";
    command?: string;
    args?: string[];
    url?: string;
  };
  runtime: string;
  scope: string;
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, any>;
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
  envVars?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

interface MCPInspectResult {
  success: boolean;
  serverInfo?: {
    name: string;
    version: string;
    protocolVersion?: string;
  };
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, any>;
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
  error?: string;
  timestamp: string;
  inspectionMethod: "simulated" | "http" | "sse";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config } = await req.json() as { config: MCPConfig };

    if (!config) {
      throw new Error("MCP config is required");
    }

    let result: MCPInspectResult;

    // For HTTP transport, try to make a real request
    if (config.transport.type === "http" && config.transport.url) {
      result = await inspectHttpMCP(config);
    } 
    // For SSE transport
    else if (config.transport.type === "sse" && config.transport.url) {
      result = await inspectSSEMCP(config);
    }
    // For stdio or when URL is not available, simulate based on config
    else {
      result = simulateInspection(config);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("MCP inspection error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "MCP inspection failed",
        timestamp: new Date().toISOString(),
        inspectionMethod: "simulated",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Simulate MCP inspection based on config
function simulateInspection(config: MCPConfig): MCPInspectResult {
  // Generate realistic tools if none defined
  const tools = config.tools?.length
    ? config.tools
    : generateDefaultTools(config.name);

  // Generate realistic resources if none defined
  const resources = config.resources?.length
    ? config.resources
    : generateDefaultResources(config.name);

  return {
    success: true,
    serverInfo: {
      name: config.name,
      version: config.version,
      protocolVersion: "2024-11-05",
    },
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description || `Execute ${tool.name} operation`,
      inputSchema: tool.inputSchema || generateDefaultSchema(tool.name),
    })),
    resources: resources.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description || `Resource: ${resource.name}`,
      mimeType: resource.mimeType || "application/json",
    })),
    prompts: [],
    timestamp: new Date().toISOString(),
    inspectionMethod: "simulated",
  };
}

// Try to inspect HTTP-based MCP server
async function inspectHttpMCP(config: MCPConfig): Promise<MCPInspectResult> {
  const url = config.transport.url!;
  
  try {
    // Try to call the MCP endpoint
    const initResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "mcp-inspector", version: "1.0.0" },
        },
        id: 1,
      }),
    });

    if (!initResponse.ok) {
      throw new Error(`HTTP ${initResponse.status}`);
    }

    const initData = await initResponse.json();
    
    // Get tools list
    const toolsResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 2,
      }),
    });

    const toolsData = await toolsResponse.json();

    // Get resources list
    const resourcesResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "resources/list",
        params: {},
        id: 3,
      }),
    });

    const resourcesData = await resourcesResponse.json();

    return {
      success: true,
      serverInfo: {
        name: initData.result?.serverInfo?.name || config.name,
        version: initData.result?.serverInfo?.version || config.version,
        protocolVersion: initData.result?.protocolVersion || "2024-11-05",
      },
      tools: toolsData.result?.tools || [],
      resources: resourcesData.result?.resources || [],
      prompts: [],
      timestamp: new Date().toISOString(),
      inspectionMethod: "http",
    };
  } catch (error: any) {
    console.log("HTTP inspection failed, falling back to simulation:", error.message);
    return simulateInspection(config);
  }
}

// Try to inspect SSE-based MCP server
async function inspectSSEMCP(config: MCPConfig): Promise<MCPInspectResult> {
  // SSE is more complex to implement, fall back to simulation for now
  return simulateInspection(config);
}

// Generate default tools based on server name
function generateDefaultTools(serverName: string): Array<{ name: string; description?: string; inputSchema?: Record<string, any> }> {
  const name = serverName.toLowerCase();
  
  if (name.includes("browser") || name.includes("playwright")) {
    return [
      { name: "navigate", description: "Navigate to a URL" },
      { name: "click", description: "Click on an element" },
      { name: "type", description: "Type text into an input" },
      { name: "screenshot", description: "Take a screenshot" },
      { name: "evaluate", description: "Evaluate JavaScript" },
    ];
  }
  
  if (name.includes("postgres") || name.includes("mysql") || name.includes("database")) {
    return [
      { name: "query", description: "Execute a SQL query" },
      { name: "insert", description: "Insert data into a table" },
      { name: "update", description: "Update records in a table" },
      { name: "delete", description: "Delete records from a table" },
      { name: "list_tables", description: "List all tables" },
    ];
  }
  
  if (name.includes("file") || name.includes("fs")) {
    return [
      { name: "read_file", description: "Read file contents" },
      { name: "write_file", description: "Write to a file" },
      { name: "list_directory", description: "List directory contents" },
      { name: "create_directory", description: "Create a directory" },
      { name: "delete_file", description: "Delete a file" },
    ];
  }

  if (name.includes("git")) {
    return [
      { name: "clone", description: "Clone a repository" },
      { name: "commit", description: "Create a commit" },
      { name: "push", description: "Push changes" },
      { name: "pull", description: "Pull changes" },
      { name: "status", description: "Get repository status" },
    ];
  }
  
  // Default tools
  return [
    { name: "execute", description: "Execute the main operation" },
    { name: "query", description: "Query data" },
    { name: "update", description: "Update data" },
  ];
}

// Generate default resources based on server name
function generateDefaultResources(serverName: string): Array<{ uri: string; name: string; description?: string; mimeType?: string }> {
  return [
    { uri: `${serverName}://config`, name: "Configuration", description: "Server configuration", mimeType: "application/json" },
    { uri: `${serverName}://status`, name: "Status", description: "Server status", mimeType: "application/json" },
  ];
}

// Generate a default schema for a tool
function generateDefaultSchema(toolName: string): Record<string, any> {
  return {
    type: "object",
    properties: {
      input: {
        type: "string",
        description: `Input for ${toolName}`,
      },
    },
    required: ["input"],
  };
}
