import { useCallback } from "react";
import { useAddMemory, Memory } from "./useMemory";

interface ExtractedMemory {
  key: string;
  value: string;
  memoryType: Memory["memoryType"];
  importance: number;
}

// Pattern-based memory extraction rules
const EXTRACTION_PATTERNS: {
  pattern: RegExp;
  memoryType: Memory["memoryType"];
  keyExtractor: (match: RegExpMatchArray) => string;
  importance: number;
}[] = [
  // User preferences
  {
    pattern: /我(?:喜欢|偏好|想要|希望|需要)(.{2,30})/g,
    memoryType: "preference",
    keyExtractor: () => "user_preference",
    importance: 7,
  },
  // User location/context
  {
    pattern: /我(?:在|住在|来自)(.{2,20})/g,
    memoryType: "fact",
    keyExtractor: () => "user_location",
    importance: 6,
  },
  // User profession/role
  {
    pattern: /我(?:是|做|从事)(.{2,30}?)(?:的|工作|，|。|$)/g,
    memoryType: "fact",
    keyExtractor: () => "user_role",
    importance: 8,
  },
  // Important dates mentioned
  {
    pattern: /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日号]?)/g,
    memoryType: "context",
    keyExtractor: () => "important_date",
    importance: 5,
  },
  // Financial amounts
  {
    pattern: /([¥￥$€]\s*[\d,]+\.?\d*|[\d,]+\.?\d*\s*[元美元欧元])/g,
    memoryType: "context",
    keyExtractor: () => "mentioned_amount",
    importance: 5,
  },
  // Contact info patterns
  {
    pattern: /(\d{11}|\d{3}[-\s]\d{4}[-\s]\d{4})/g,
    memoryType: "fact",
    keyExtractor: () => "phone_number",
    importance: 9,
  },
  // Email patterns
  {
    pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    memoryType: "fact",
    keyExtractor: () => "email_address",
    importance: 9,
  },
  // Project/Task names
  {
    pattern: /(?:项目|任务|工作)(?:名?称?[是为]?[：:]?\s*)["「『]?([^\n"」』]{2,20})["」』]?/g,
    memoryType: "context",
    keyExtractor: () => "project_name",
    importance: 6,
  },
  // User requests/needs
  {
    pattern: /(?:请帮我|帮我|我要|我想)(.{5,50}?)(?:。|？|$)/g,
    memoryType: "context",
    keyExtractor: () => "user_request",
    importance: 4,
  },
];

// Extract memories from user message
function extractFromUserMessage(message: string): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];
  const seenKeys = new Set<string>();

  for (const rule of EXTRACTION_PATTERNS) {
    const matches = message.matchAll(rule.pattern);
    for (const match of matches) {
      const value = match[1]?.trim();
      if (value && value.length >= 2 && value.length <= 100) {
        const baseKey = rule.keyExtractor(match);
        // Add timestamp to make key unique
        const key = `${baseKey}_${Date.now()}`;
        
        if (!seenKeys.has(baseKey)) {
          seenKeys.add(baseKey);
          memories.push({
            key: baseKey,
            value,
            memoryType: rule.memoryType,
            importance: rule.importance,
          });
        }
      }
    }
  }

  return memories;
}

// Extract key facts from assistant response
function extractFromAssistantResponse(response: string): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];

  // Look for confirmed actions
  const confirmPatterns = [
    /已(?:成功)?(?:完成|创建|生成|保存|发送|提交)(.{5,50})/g,
    /(.{5,30})(?:已完成|成功)/g,
  ];

  for (const pattern of confirmPatterns) {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      const value = match[1]?.trim();
      if (value && value.length >= 3 && value.length <= 50) {
        memories.push({
          key: "completed_action",
          value,
          memoryType: "context",
          importance: 4,
        });
        break; // Only take first match
      }
    }
  }

  return memories;
}

export function useAutoMemoryExtraction(agentId?: string) {
  const addMemory = useAddMemory();

  const extractAndSaveMemories = useCallback(async (
    userMessage: string,
    assistantResponse: string
  ) => {
    try {
      // Extract from both user message and assistant response
      const userMemories = extractFromUserMessage(userMessage);
      const assistantMemories = extractFromAssistantResponse(assistantResponse);
      const allMemories = [...userMemories, ...assistantMemories];

      // Deduplicate by key (keep highest importance)
      const uniqueMemories = new Map<string, ExtractedMemory>();
      for (const memory of allMemories) {
        const existing = uniqueMemories.get(memory.key);
        if (!existing || existing.importance < memory.importance) {
          uniqueMemories.set(memory.key, memory);
        }
      }

      // Save to database (limit to top 3 most important per message)
      const toSave = Array.from(uniqueMemories.values())
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3);

      for (const memory of toSave) {
        await addMemory.mutateAsync({
          agentId,
          memoryType: memory.memoryType,
          key: memory.key,
          value: memory.value,
          importance: memory.importance,
          source: "inferred",
        });
      }

      return toSave;
    } catch (error) {
      console.error("Error extracting memories:", error);
      return [];
    }
  }, [addMemory, agentId]);

  return { extractAndSaveMemories };
}
