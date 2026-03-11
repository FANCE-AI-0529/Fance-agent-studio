/**
 * @file useAgentChat.ts
 * @description 智能体对话管理钩子模块，负责处理用户与智能体之间的消息交互、流式响应及意图漂移检测
 * @module Hooks/AgentChat
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from "react";
import { useIntentDrift } from "./useIntentDrift.ts";
import { supabase } from "../integrations/supabase/client.ts";

/**
 * 智能体对话 Edge Function 端点地址
 * 通过环境变量获取 Supabase 服务 URL
 */
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

/**
 * 文本类型消息内容
 */
type TextContent = { type: "text"; text: string };

/**
 * 图片类型消息内容
 */
type ImageContent = { type: "image_url"; image_url: { url: string } };

/**
 * 消息内容联合类型
 * 支持纯文本字符串或多模态内容数组
 */
type MessageContent = string | (TextContent | ImageContent)[];

/**
 * 对话消息数据结构
 * 定义用户与智能体之间交换的消息格式
 */
export interface ChatMessage {
  /** 消息发送者角色：用户或助手 */
  role: "user" | "assistant";
  /** 消息内容（支持文本或多模态） */
  content: MessageContent;
}

/**
 * 智能体技能配置
 */
interface AgentSkill {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description?: string;
  /** 技能所需权限列表 */
  permissions?: string[];
}

/**
 * 智能体配置参数
 * 定义智能体运行时的核心配置项
 */
interface AgentConfig {
  /** 智能体名称 */
  name?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 使用的 AI 模型标识 */
  model?: string;
  /** 已挂载的技能列表 */
  skills?: AgentSkill[];
  /** MPLP 协议策略 */
  mplpPolicy?: string;
  /** 智能体唯一标识符 */
  agentId?: string;
  /** 是否启用联网搜索 */
  webSearchEnabled?: boolean;
}

/**
 * 追踪事件数据结构
 * 用于开发者工具面板显示执行过程
 */
interface TraceEventData {
  /** 事件来源模块 */
  module?: string;
  /** 事件消息内容 */
  message?: string;
  /** 事件级别 */
  level?: "info" | "warn" | "error" | "success";
  /** 其他扩展字段 */
  [key: string]: unknown;
}

/**
 * 意图漂移检测结果
 * 记录对话过程中用户意图的变化情况
 */
export interface IntentDriftInfo {
  /** 是否检测到意图漂移 */
  driftDetected: boolean;
  /** 漂移严重程度 */
  severity: "none" | "low" | "medium" | "high" | "critical";
  /** 意图变化分数 */
  deltaScore: number;
  /** 漂移描述信息 */
  message?: string;
}

/**
 * useAgentChat 钩子配置选项
 */
interface UseAgentChatOptions {
  /** 智能体配置 */
  agentConfig?: AgentConfig;
  /** 追踪事件回调函数 */
  onTraceEvent?: (type: string, data: TraceEventData) => void;
  /** 意图漂移检测回调 */
  onIntentDrift?: (drift: IntentDriftInfo) => void;
  /** 是否启用意图追踪 */
  enableIntentTracking?: boolean;
}

/**
 * 流式对话请求选项
 */
interface StreamChatOptions {
  /** 对话消息历史 */
  messages: ChatMessage[];
  /** 增量内容回调（每次接收到新内容时触发） */
  onDelta: (deltaText: string) => void;
  /** 对话完成回调 */
  onDone: () => void;
  /** 思考过程回调（用于显示执行状态） */
  onThinking?: (module: string, message: string, level: "info" | "warn" | "success" | "error") => void;
}

/**
 * 检查消息是否包含多模态内容
 * 
 * 判断消息内容中是否包含图片等非文本元素，
 * 用于决定是否启用多模态处理逻辑。
 * 
 * @param {MessageContent} content - 消息内容
 * @returns {boolean} 如果包含多模态内容返回 true
 */
export function hasMultimodalContent(content: MessageContent): boolean {
  // [检查]：纯字符串不包含多模态内容
  if (typeof content === 'string') return false;
  // [遍历]：检查是否存在图片类型内容
  return content.some(c => c.type === 'image_url');
}

/**
 * 创建多模态消息内容
 * 
 * 将文本消息与附件（图片/文档）组合为多模态消息格式，
 * 支持 OpenAI Vision API 的消息结构。
 * 
 * @param {string} text - 文本消息内容
 * @param {Array} attachments - 附件列表（图片或文档）
 * @returns {MessageContent} 返回格式化的消息内容
 */
export function createMultimodalContent(
  text: string,
  attachments?: { type: 'image' | 'document'; url: string }[]
): MessageContent {
  // [简化]：无附件时直接返回纯文本
  if (!attachments || attachments.length === 0) {
    return text;
  }

  const content: (TextContent | ImageContent)[] = [];
  
  // [图片]：先添加图片类型内容
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      content.push({
        type: "image_url",
        image_url: { url: attachment.url }
      });
    }
  }
  
  // [文档]：为文档类型生成占位描述
  const documentDescriptions = attachments
    .filter(a => a.type === 'document')
    .map((a, i) => `[附件 ${i + 1}: 文档]`)
    .join('\n');
  
  // [合并]：组合文档描述与用户文本
  const fullText = documentDescriptions 
    ? `${documentDescriptions}\n\n${text}` 
    : text;
  
  // [添加]：将文本内容加入内容数组
  if (fullText.trim()) {
    content.push({ type: "text", text: fullText });
  }

  // [优化]：如果只有单个文本内容，返回简化格式
  return content.length === 1 && content[0].type === 'text' 
    ? (content[0] as TextContent).text 
    : content;
}

/**
 * 智能体对话管理钩子
 * 
 * 该钩子函数提供与智能体进行流式对话的完整功能，包括：
 * - SSE 流式响应处理
 * - 多模态消息支持（文本+图片）
 * - 意图漂移检测与预警
 * - 执行过程追踪与可视化
 * 
 * @param {UseAgentChatOptions} options - 钩子配置选项
 * @returns 返回流式对话函数及状态信息
 * 
 * @example
 * const { streamChat, isLoading, error } = useAgentChat({
 *   agentConfig: { name: "助手", model: "gpt-4" },
 *   onTraceEvent: (type, data) => console.log(type, data),
 * });
 */
export function useAgentChat({ 
  agentConfig, 
  onTraceEvent, 
  onIntentDrift,
  enableIntentTracking = false 
}: UseAgentChatOptions = {}) {
  // [状态]：加载状态标识
  const [isLoading, setIsLoading] = useState(false);
  // [状态]：错误信息
  const [error, setError] = useState<string | null>(null);
  // [状态]：当前意图漂移信息
  const [currentDrift, setCurrentDrift] = useState<IntentDriftInfo | null>(null);
  // [引用]：用于累积响应内容的引用
  const responseAccumulatorRef = useRef<string>("");
  
  // [钩子]：意图漂移追踪功能
  const { trackIntent, resetSession } = useIntentDrift(agentConfig?.agentId);

  /**
   * 发起流式对话请求
   * 
   * 该函数通过 SSE（Server-Sent Events）与后端建立流式连接，
   * 实时接收智能体的响应内容并通过回调函数传递给调用方。
   */
  const streamChat = useCallback(async ({
    messages,
    onDelta,
    onDone,
    onThinking,
  }: StreamChatOptions) => {
    // [初始化]：重置状态
    setIsLoading(true);
    setError(null);
    responseAccumulatorRef.current = "";

    // [提取]：获取最新的用户消息用于意图追踪
    const latestUserMessage = messages.filter(m => m.role === "user").pop();
    const userMessageText = latestUserMessage 
      ? (typeof latestUserMessage.content === "string" 
          ? latestUserMessage.content 
          : latestUserMessage.content.find(c => c.type === "text")?.text || "")
      : "";

    // [检测]：判断是否为多模态请求
    const isMultimodal = messages.some(m => hasMultimodalContent(m.content));
    
    // [通知]：发送初始思考状态
    onThinking?.("MPLP:Gateway", isMultimodal ? "处理多模态请求..." : "连接AI网关...", "info");

    try {
      // [认证]：获取用户会话令牌
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // [校验]：确保用户已登录
      if (!token) {
        const errorMessage = "请先登录后再使用智能体";
        onThinking?.("MPLP:Gateway", errorMessage, "error");
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // [请求]：向 Edge Function 发起流式请求
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          messages, 
          agentConfig,
          webSearchEnabled: agentConfig?.webSearchEnabled ?? true,
        }),
      });

      // [错误处理]：检查响应状态
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const errorCode = errorData.code || "UNKNOWN";
        const errorMessage = errorData.error || `请求失败 (${resp.status})`;
        
        onThinking?.("MPLP:Gateway", `Error: ${errorMessage}`, "error");
        setError(errorMessage);
        onTraceEvent?.("error", { message: errorMessage, code: errorCode });
        setIsLoading(false);
        return;
      }

      // [校验]：确保响应体存在
      if (!resp.body) {
        throw new Error("No response body");
      }

      // [通知]：连接成功
      onThinking?.("MPLP:Gateway", "连接成功", "success");
      onThinking?.("LLM:Stream", isMultimodal ? "分析图片内容..." : "接收响应流...", "info");

      // [流处理]：初始化流读取器
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let tokenCount = 0;

      // [循环]：持续读取流数据
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // [解码]：将字节流转换为文本
        textBuffer += decoder.decode(value, { stream: true });

        // [解析]：按行处理 SSE 事件
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          // [清理]：移除回车符
          if (line.endsWith("\r")) line = line.slice(0, -1);
          
          // [跳过]：忽略注释行和空行
          if (line.startsWith(":") || line.trim() === "") continue;
          
          // [验证]：确保是数据行
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          
          // [结束]：检测流结束标记
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            // [解析]：解析 JSON 数据
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            
            // [累积]：处理增量内容
            if (content) {
              tokenCount++;
              responseAccumulatorRef.current += content;
              onDelta(content);
            }
          } catch {
            // [恢复]：解析失败时将数据放回缓冲区
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // [清理]：处理缓冲区中剩余的数据
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              tokenCount++;
              responseAccumulatorRef.current += content;
              onDelta(content);
            }
          } catch { /* 忽略解析错误 */ }
        }
      }

      // [完成]：通知响应完成
      onThinking?.("LLM:Stream", `响应完成 (${tokenCount} tokens)`, "success");
      onTraceEvent?.("ai_response_complete", { tokenCount, isMultimodal });
      
      // [意图追踪]：检测意图漂移
      if (enableIntentTracking && userMessageText) {
        const driftResult = await trackIntent(userMessageText, responseAccumulatorRef.current);
        if (driftResult) {
          setCurrentDrift(driftResult);
          // [警告]：如果检测到漂移，触发回调
          if (driftResult.driftDetected) {
            onIntentDrift?.(driftResult);
            onTraceEvent?.("intent_drift", { 
              severity: driftResult.severity, 
              deltaScore: driftResult.deltaScore 
            });
          }
        }
      }
      
      // [回调]：通知调用方对话完成
      onDone();
    } catch (err) {
      // [异常]：处理网络或其他错误
      const message = err instanceof Error ? err.message : "未知错误";
      onThinking?.("MPLP:Gateway", `连接失败: ${message}`, "error");
      setError(message);
      onTraceEvent?.("error", { message });
    } finally {
      // [清理]：重置加载状态
      setIsLoading(false);
    }
  }, [agentConfig, onTraceEvent, enableIntentTracking, trackIntent, onIntentDrift]);

  /**
   * 重置意图追踪会话
   * 清除当前会话的意图历史，开始新的追踪周期
   */
  const resetIntentTracking = useCallback(() => {
    resetSession();
    setCurrentDrift(null);
  }, [resetSession]);

  return { 
    /** 流式对话函数 */
    streamChat, 
    /** 加载状态 */
    isLoading, 
    /** 错误信息 */
    error, 
    /** 当前意图漂移状态 */
    currentDrift, 
    /** 重置意图追踪 */
    resetIntentTracking 
  };
}
