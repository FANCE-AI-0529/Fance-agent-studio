import { useState, useEffect, useCallback, useRef } from 'react';

// Keywords that trigger specific node type highlights
const HIGHLIGHT_KEYWORDS: Record<string, string[]> = {
  knowledge: [
    '查询知识库', '根据文档', '知识库', 'RAG', '检索',
    '查阅资料', '文档检索', '搜索知识', '知识检索',
    'searching knowledge', 'querying documents', 'knowledge base',
  ],
  skill: [
    '调用工具', '执行技能', '正在处理', '使用技能',
    '工具调用', '技能执行', '执行操作',
    'calling tool', 'executing skill', 'using tool',
  ],
  manus: [
    '思考中', '规划', '分析', '正在思考', '让我想想',
    '分析中', '正在分析', '理解需求',
    'thinking', 'analyzing', 'planning',
  ],
  action: [
    '执行动作', 'API调用', '调用API', '发送请求',
    '执行任务', '处理请求',
    'calling API', 'executing action', 'sending request',
  ],
  output: [
    '生成回复', '输出结果', '返回结果',
    'generating response', 'output result',
  ],
};

// Map node types from the keywords to actual node type strings
const NODE_TYPE_MAP: Record<string, string[]> = {
  knowledge: ['knowledge', 'knowledgeBase'],
  skill: ['skill'],
  manus: ['manus', 'manusKernel'],
  action: ['action', 'mcpAction'],
  output: ['output'],
};

interface HighlightState {
  nodeTypes: string[];
  isActive: boolean;
  matchedKeyword: string | null;
}

interface UseMiniPreviewHighlightOptions {
  highlightDuration?: number; // How long to keep highlight active (ms)
  debounceMs?: number; // Debounce for consecutive messages
}

export function useMiniPreviewHighlight(
  latestMessage: string | null,
  options: UseMiniPreviewHighlightOptions = {}
) {
  const { highlightDuration = 3000, debounceMs = 500 } = options;

  const [highlightState, setHighlightState] = useState<HighlightState>({
    nodeTypes: [],
    isActive: false,
    matchedKeyword: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Detect keywords in message and return matching node types
  const detectKeywords = useCallback((message: string): { nodeTypes: string[]; keyword: string } | null => {
    const lowerMessage = message.toLowerCase();

    for (const [category, keywords] of Object.entries(HIGHLIGHT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          const nodeTypes = NODE_TYPE_MAP[category] || [];
          return { nodeTypes, keyword };
        }
      }
    }

    return null;
  }, []);

  // Process new message and update highlight state
  const processMessage = useCallback((message: string) => {
    const result = detectKeywords(message);

    if (result) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Activate highlight
      setHighlightState({
        nodeTypes: result.nodeTypes,
        isActive: true,
        matchedKeyword: result.keyword,
      });

      // Auto-deactivate after duration
      timeoutRef.current = setTimeout(() => {
        setHighlightState(prev => ({
          ...prev,
          isActive: false,
        }));
      }, highlightDuration);
    }
  }, [detectKeywords, highlightDuration]);

  // Watch for new messages
  useEffect(() => {
    if (!latestMessage) return;

    // Debounce to avoid rapid consecutive triggers
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      processMessage(latestMessage);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [latestMessage, processMessage, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Manually trigger highlight for specific node types
  const triggerHighlight = useCallback((nodeTypes: string[], duration?: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setHighlightState({
      nodeTypes,
      isActive: true,
      matchedKeyword: null,
    });

    timeoutRef.current = setTimeout(() => {
      setHighlightState(prev => ({
        ...prev,
        isActive: false,
      }));
    }, duration || highlightDuration);
  }, [highlightDuration]);

  // Clear highlight manually
  const clearHighlight = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHighlightState({
      nodeTypes: [],
      isActive: false,
      matchedKeyword: null,
    });
  }, []);

  // Check if a specific node type should be highlighted
  const isNodeHighlighted = useCallback((nodeType: string): boolean => {
    return highlightState.isActive && highlightState.nodeTypes.includes(nodeType);
  }, [highlightState]);

  return {
    highlightState,
    isNodeHighlighted,
    triggerHighlight,
    clearHighlight,
  };
}
