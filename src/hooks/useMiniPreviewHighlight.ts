import { useState, useEffect, useCallback, useRef } from 'react';

// Keywords that trigger specific node type highlights
const HIGHLIGHT_KEYWORDS: Record<string, string[]> = {
  knowledge: [
    '查询知识库', '根据文档', '知识库', 'RAG', '检索',
    '查阅资料', '文档检索', '搜索知识', '知识检索', '查找资料',
    '在文档中', '参考资料', '知识搜索',
    'searching knowledge', 'querying documents', 'knowledge base',
    'retrieving', 'looking up',
  ],
  skill: [
    '调用工具', '执行技能', '正在处理', '使用技能',
    '工具调用', '技能执行', '执行操作', '使用工具',
    'calling tool', 'executing skill', 'using tool',
  ],
  manus: [
    '思考中', '规划', '分析', '正在思考', '让我想想',
    '分析中', '正在分析', '理解需求', '考虑', '判断',
    '推理', '评估',
    'thinking', 'analyzing', 'planning', 'reasoning',
  ],
  action: [
    '执行动作', 'API调用', '调用API', '发送请求',
    '执行任务', '处理请求', '调用接口',
    'calling API', 'executing action', 'sending request',
  ],
  output: [
    '生成回复', '输出结果', '返回结果', '生成结果',
    '输出内容', '生成内容',
    'generating response', 'output result', 'generating output',
  ],
  router: [
    '路由判断', '分支选择', '条件判断', '决策', '选择路径',
    '判断条件', '分流', '路由选择', '逻辑分支',
    'routing', 'branching', 'decision', 'conditional',
  ],
  mcp: [
    '调用外部服务', 'MCP', '发送邮件', '创建任务', '外部工具',
    '第三方服务', '集成服务', 'Slack', 'Notion', 'Gmail',
    'calling service', 'external API', 'third-party',
  ],
  intervention: [
    '需要人工', '人工审核', '等待确认', '人工介入', '需要确认',
    '等待审批', '人工验证', '手动确认',
    'human review', 'awaiting approval', 'needs confirmation',
    'manual review', 'human intervention',
  ],
};

// Map node types from the keywords to actual node type strings
const NODE_TYPE_MAP: Record<string, string[]> = {
  knowledge: ['knowledge', 'knowledgeBase'],
  skill: ['skill'],
  manus: ['manus', 'manusKernel'],
  action: ['action', 'mcpAction'],
  output: ['output'],
  router: ['router'],
  mcp: ['mcp', 'mcpTool', 'mcpAction'],
  intervention: ['intervention'],
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
