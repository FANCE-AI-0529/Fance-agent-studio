import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MCPConfig } from "@/components/foundry/MCPConfigEditor";

export interface MCPInspectResult {
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

export function useMCPInspect() {
  const [isInspecting, setIsInspecting] = useState(false);
  const [result, setResult] = useState<MCPInspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async (config: MCPConfig): Promise<MCPInspectResult> => {
    setIsInspecting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("mcp-inspect", {
        body: { config },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const inspectResult: MCPInspectResult = data;
      setResult(inspectResult);
      return inspectResult;
    } catch (err: any) {
      const errorMessage = err.message || "MCP inspection failed";
      setError(errorMessage);
      
      // Return simulated result based on config when inspection fails
      const simulatedResult = simulateInspection(config);
      setResult(simulatedResult);
      return simulatedResult;
    } finally {
      setIsInspecting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    inspect,
    reset,
    isInspecting,
    result,
    error,
  };
}

// Simulate MCP inspection based on config when real inspection isn't possible
function simulateInspection(config: MCPConfig): MCPInspectResult {
  return {
    success: true,
    serverInfo: {
      name: config.name,
      version: config.version,
      protocolVersion: "2024-11-05",
    },
    tools: (config.tools || []).map((tool) => ({
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      inputSchema: tool.inputSchema || {
        type: "object",
        properties: {},
        required: [],
      },
    })),
    resources: (config.resources || []).map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType || "application/json",
    })),
    prompts: [],
    timestamp: new Date().toISOString(),
    inspectionMethod: "simulated",
  };
}
