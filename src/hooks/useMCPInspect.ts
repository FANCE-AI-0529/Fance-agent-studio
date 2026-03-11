/**
 * @file useMCPInspect.ts
 * @description MCP服务探测钩子，提供对MCP服务器的工具、资源和提示词的检测能力
 * @module Hooks/MCP
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client.ts";
import type { MCPConfig } from "../components/foundry/MCPConfigEditor.tsx";

/**
 * MCP探测结果接口
 * 
 * 定义MCP服务器探测的完整返回结构。
 */
export interface MCPInspectResult {
  /** 探测是否成功 */
  success: boolean;
  /** 服务器信息 */
  serverInfo?: {
    /** 服务器名称 */
    name: string;
    /** 服务器版本 */
    version: string;
    /** 协议版本 */
    protocolVersion?: string;
  };
  /** 可用工具列表 */
  tools?: Array<{
    /** 工具名称 */
    name: string;
    /** 工具描述 */
    description?: string;
    /** 输入参数Schema */
    inputSchema?: Record<string, unknown>;
  }>;
  /** 可用资源列表 */
  resources?: Array<{
    /** 资源URI */
    uri: string;
    /** 资源名称 */
    name: string;
    /** 资源描述 */
    description?: string;
    /** MIME类型 */
    mimeType?: string;
  }>;
  /** 可用提示词列表 */
  prompts?: Array<{
    /** 提示词名称 */
    name: string;
    /** 提示词描述 */
    description?: string;
    /** 参数定义 */
    arguments?: Array<{
      /** 参数名 */
      name: string;
      /** 参数描述 */
      description?: string;
      /** 是否必填 */
      required?: boolean;
    }>;
  }>;
  /** 错误信息 */
  error?: string;
  /** 探测时间戳 */
  timestamp: string;
  /** 探测方式 */
  inspectionMethod: "simulated" | "http" | "sse";
}

/**
 * MCP服务探测钩子
 * 
 * 提供对MCP服务器配置的探测能力，获取服务器暴露的工具、资源和提示词。
 * 当真实探测失败时，自动回退到基于配置的模拟结果。
 * 
 * @returns {Object} - 探测方法、状态及结果
 * 
 * @example
 * ```tsx
 * const { inspect, isInspecting, result } = useMCPInspect();
 * 
 * const handleInspect = async () => {
 *   const res = await inspect(mcpConfig);
 *   if (res.success) {
 *     console.log('发现工具:', res.tools?.length);
 *   }
 * };
 * ```
 */
export function useMCPInspect() {
  const [isInspecting, setIsInspecting] = useState(false);
  const [result, setResult] = useState<MCPInspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 执行MCP服务探测
   * 
   * 调用边缘函数探测MCP服务器，获取其暴露的能力清单。
   * 
   * @param {MCPConfig} config - MCP服务器配置
   * @returns {Promise<MCPInspectResult>} - 探测结果
   */
  const inspect = useCallback(async (config: MCPConfig): Promise<MCPInspectResult> => {
    setIsInspecting(true);
    setError(null);

    try {
      // [调用]：请求MCP探测边缘函数
      const { data, error: fnError } = await supabase.functions.invoke("mcp-inspect", {
        body: { config },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const inspectResult: MCPInspectResult = data;
      setResult(inspectResult);
      return inspectResult;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "MCP inspection failed";
      setError(errorMessage);
      
      // [回退]：探测失败时使用配置模拟结果
      const simulatedResult = simulateInspection(config);
      setResult(simulatedResult);
      return simulatedResult;
    } finally {
      setIsInspecting(false);
    }
  }, []);

  /**
   * 重置探测状态
   * 
   * 清除当前的探测结果和错误信息。
   */
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    /** 执行探测 */
    inspect,
    /** 重置状态 */
    reset,
    /** 是否正在探测中 */
    isInspecting,
    /** 探测结果 */
    result,
    /** 错误信息 */
    error,
  };
}

/**
 * 模拟MCP探测
 * 
 * 当真实探测不可用时，基于配置信息生成模拟的探测结果。
 * 用于离线开发和测试场景。
 * 
 * @param {MCPConfig} config - MCP服务器配置
 * @returns {MCPInspectResult} - 模拟的探测结果
 */
function simulateInspection(config: MCPConfig): MCPInspectResult {
  return {
    success: true,
    serverInfo: {
      name: config.name,
      version: config.version,
      protocolVersion: "2024-11-05",
    },
    // [工具模拟]：从配置中提取工具定义
    tools: (config.tools || []).map((tool) => ({
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      inputSchema: tool.inputSchema || {
        type: "object",
        properties: {},
        required: [],
      },
    })),
    // [资源模拟]：从配置中提取资源定义
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
