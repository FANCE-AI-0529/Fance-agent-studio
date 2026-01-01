import { useState, useCallback } from "react";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

// Multimodal message content types
type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image_url"; image_url: { url: string } };
type MessageContent = string | (TextContent | ImageContent)[];

export interface ChatMessage {
  role: "user" | "assistant";
  content: MessageContent;
}

interface AgentSkill {
  name: string;
  description?: string;
  permissions?: string[];
}

interface AgentConfig {
  name?: string;
  systemPrompt?: string;
  model?: string;
  skills?: AgentSkill[];
  mplpPolicy?: string;
}

interface TraceEventData {
  module?: string;
  message?: string;
  level?: "info" | "warn" | "error" | "success";
  [key: string]: unknown;
}

interface UseAgentChatOptions {
  agentConfig?: AgentConfig;
  onTraceEvent?: (type: string, data: TraceEventData) => void;
}

interface StreamChatOptions {
  messages: ChatMessage[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onThinking?: (module: string, message: string, level: "info" | "warn" | "success" | "error") => void;
}

// Helper to check if a message has multimodal content
export function hasMultimodalContent(content: MessageContent): boolean {
  if (typeof content === 'string') return false;
  return content.some(c => c.type === 'image_url');
}

// Helper to create multimodal message content
export function createMultimodalContent(
  text: string,
  attachments?: { type: 'image' | 'document'; url: string }[]
): MessageContent {
  if (!attachments || attachments.length === 0) {
    return text;
  }

  const content: (TextContent | ImageContent)[] = [];
  
  // Add images first
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      content.push({
        type: "image_url",
        image_url: { url: attachment.url }
      });
    }
  }
  
  // Add text content (include document descriptions if any)
  const documentDescriptions = attachments
    .filter(a => a.type === 'document')
    .map((a, i) => `[附件 ${i + 1}: 文档]`)
    .join('\n');
  
  const fullText = documentDescriptions 
    ? `${documentDescriptions}\n\n${text}` 
    : text;
  
  if (fullText.trim()) {
    content.push({ type: "text", text: fullText });
  }

  return content.length === 1 && content[0].type === 'text' 
    ? (content[0] as TextContent).text 
    : content;
}

export function useAgentChat({ agentConfig, onTraceEvent }: UseAgentChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamChat = useCallback(async ({
    messages,
    onDelta,
    onDone,
    onThinking,
  }: StreamChatOptions) => {
    setIsLoading(true);
    setError(null);

    // Check if any message contains multimodal content
    const isMultimodal = messages.some(m => hasMultimodalContent(m.content));
    
    // Emit initial thinking events
    onThinking?.("MPLP:Gateway", isMultimodal ? "处理多模态请求..." : "连接AI网关...", "info");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages, agentConfig }),
      });

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

      if (!resp.body) {
        throw new Error("No response body");
      }

      onThinking?.("MPLP:Gateway", "连接成功", "success");
      onThinking?.("LLM:Stream", isMultimodal ? "分析图片内容..." : "接收响应流...", "info");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let tokenCount = 0;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              tokenCount++;
              onDelta(content);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
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
              onDelta(content);
            }
          } catch { /* ignore */ }
        }
      }

      onThinking?.("LLM:Stream", `响应完成 (${tokenCount} tokens)`, "success");
      onTraceEvent?.("ai_response_complete", { tokenCount, isMultimodal });
      onDone();
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      onThinking?.("MPLP:Gateway", `连接失败: ${message}`, "error");
      setError(message);
      onTraceEvent?.("error", { message });
    } finally {
      setIsLoading(false);
    }
  }, [agentConfig, onTraceEvent]);

  return { streamChat, isLoading, error };
}
