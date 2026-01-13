// =====================================================
// 自然语言图谱指令 Hook
// NL Graph Command Hook - Parse and Execute Graph Commands
// =====================================================

import { useState, useCallback, useMemo } from 'react';
import { useGlobalAgentStore } from '@/stores/globalAgentStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  GraphCommand, 
  GraphAction,
  GraphNodeType,
  NLParseResult,
  GraphOperationResult,
} from '@/types/graphCommandTypes';

// ============= Quick Pattern Matching =============

interface PatternConfig {
  patterns: RegExp[];
  action: GraphAction;
  nodeType?: GraphNodeType;
  extractData: (match: RegExpMatchArray) => Partial<GraphCommand>;
}

const QUICK_PATTERNS: PatternConfig[] = [
  // 添加技能/功能
  {
    patterns: [
      /(?:加|添加|增加|给我加|帮我加)(?:一?个?)(.+?)(?:功能|技能|能力)?$/i,
      /(?:我想要|需要|希望有)(.+?)(?:功能|技能)?/i,
      /(?:能不能|可以|可否)(?:加|添加)(.+)/i,
      /(?:让它|让他)(?:能够?|可以)(.+)/i,
    ],
    action: 'add_node',
    nodeType: 'skill',
    extractData: (match) => ({
      nodeData: { name: match[1]?.trim() || 'New Skill' },
      description: `添加「${match[1]?.trim()}」功能`,
      autoConnect: true,
    }),
  },
  // 添加 MCP 工具
  {
    patterns: [
      /(?:连接?|接入|集成)(.+?)(?:工具|服务|API)?$/i,
      /(?:用|使用)(.+?)(?:来|去)?(.+)?/i,
    ],
    action: 'add_node',
    nodeType: 'mcp_action',
    extractData: (match) => ({
      nodeData: { 
        name: match[1]?.trim() || 'MCP Tool',
        mcp_server: match[1]?.trim().toLowerCase().replace(/\s+/g, '-'),
      },
      description: `连接「${match[1]?.trim()}」服务`,
      autoConnect: true,
    }),
  },
  // 添加知识库
  {
    patterns: [
      /(?:挂载|加载|连接|使用)(?:知识库)?[「「']?(.+?)[」」']?(?:知识库)?$/i,
      /(?:让它?|让他?)(?:学习|参考|使用)(.+?)(?:知识|资料)?/i,
    ],
    action: 'add_node',
    nodeType: 'knowledge',
    extractData: (match) => ({
      nodeData: { name: match[1]?.trim() || 'Knowledge Base' },
      description: `挂载知识库「${match[1]?.trim()}」`,
      autoConnect: true,
    }),
  },
  // 删除节点
  {
    patterns: [
      /(?:去掉|删除|移除|取消|不要)(.+?)(?:功能|技能|节点)?$/i,
      /(?:把)?(.+?)(?:功能|技能)?(?:去掉|删了|移除)/i,
    ],
    action: 'remove_node',
    extractData: (match) => ({
      nodeData: { name: match[1]?.trim() },
      description: `移除「${match[1]?.trim()}」`,
    }),
  },
  // 添加触发器
  {
    patterns: [
      /(?:添加|设置|加)(?:一个?)?(?:定时|定期|周期|自动)(.+?)(?:任务|触发)?/i,
      /(?:每天|每周|每小时|每分钟)(?:自动)?(.+)/i,
    ],
    action: 'add_node',
    nodeType: 'trigger',
    extractData: (match) => ({
      nodeData: { 
        name: match[1]?.trim() || 'Timer Trigger',
        type: 'schedule',
      },
      description: `添加定时触发器`,
      autoConnect: true,
    }),
  },
  // 添加路由
  {
    patterns: [
      /(?:添加|设置)(?:一个?)?(?:分支|路由|条件)(.+)?/i,
      /(?:根据|如果)(.+?)(?:分别|就)?(.+)/i,
    ],
    action: 'add_node',
    nodeType: 'router',
    extractData: (match) => ({
      nodeData: { 
        name: match[1]?.trim() || 'Router',
        type: 'conditional',
      },
      description: `添加路由分支`,
      autoConnect: true,
    }),
  },
];

// ============= Position Calculator =============

function calculateOptimalPosition(
  existingNodes: Array<{ position_x: number; position_y: number }>,
  nodeType?: GraphNodeType
): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 300, y: 200 };
  }

  // Find Manus core position
  const avgX = existingNodes.reduce((sum, n) => sum + n.position_x, 0) / existingNodes.length;
  const avgY = existingNodes.reduce((sum, n) => sum + n.position_y, 0) / existingNodes.length;

  // Position based on node type
  const offset = existingNodes.length * 30;
  switch (nodeType) {
    case 'trigger':
      return { x: avgX - 300, y: avgY - 100 + offset };
    case 'knowledge':
      return { x: avgX - 250, y: avgY + 100 + offset };
    case 'skill':
      return { x: avgX + 200, y: avgY - 50 + offset };
    case 'mcp_action':
      return { x: avgX + 250, y: avgY + 50 + offset };
    case 'router':
      return { x: avgX, y: avgY + 150 + offset };
    default:
      return { x: avgX + 100 + Math.random() * 50, y: avgY + Math.random() * 100 };
  }
}

// ============= Main Hook =============

export function useNLGraphCommand() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<GraphCommand | null>(null);
  const [lastResult, setLastResult] = useState<GraphOperationResult | null>(null);
  
  // Store selectors
  const agentId = useGlobalAgentStore((s) => s.agentId);
  const nodes = useGlobalAgentStore((s) => s.nodes);
  const addNode = useGlobalAgentStore((s) => s.addNode);
  const addEdge = useGlobalAgentStore((s) => s.addEdge);
  const removeNode = useGlobalAgentStore((s) => s.removeNode);

  // Quick pattern matching (high confidence, local)
  const quickPatternMatch = useCallback((message: string): GraphCommand | null => {
    const trimmed = message.trim();
    
    for (const config of QUICK_PATTERNS) {
      for (const pattern of config.patterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const extracted = config.extractData(match);
          return {
            action: config.action,
            nodeType: config.nodeType,
            confidence: 0.85,
            requiresConfirmation: true,
            description: extracted.description || `执行 ${config.action}`,
            ...extracted,
          };
        }
      }
    }
    
    return null;
  }, []);

  // AI-based parsing (lower confidence, more complex)
  const aiParse = useCallback(async (message: string): Promise<GraphCommand | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('nl-graph-command', {
        body: {
          message,
          agentId,
          currentNodes: nodes.map(n => ({
            id: n.node_id,
            type: n.node_type,
            name: (n.data as any)?.name || n.node_id,
          })),
        },
      });

      if (error) {
        console.error('AI parse error:', error);
        return null;
      }

      if (data?.hasIntent && data?.command) {
        return {
          ...data.command,
          requiresConfirmation: true,
        };
      }

      return null;
    } catch (err) {
      console.error('AI parse failed:', err);
      return null;
    }
  }, [agentId, nodes]);

  // Main parse function
  const parseMessage = useCallback(async (message: string): Promise<NLParseResult> => {
    // Step 1: Quick regex matching
    const quickMatch = quickPatternMatch(message);
    if (quickMatch && quickMatch.confidence > 0.8) {
      return {
        hasGraphIntent: true,
        command: quickMatch,
        originalMessage: message,
        shouldProceedToChat: false,
        parseMethod: 'regex',
      };
    }

    // Step 2: AI parsing for complex cases
    setIsProcessing(true);
    try {
      const aiCommand = await aiParse(message);
      if (aiCommand) {
        return {
          hasGraphIntent: true,
          command: aiCommand,
          originalMessage: message,
          shouldProceedToChat: aiCommand.confidence < 0.7,
          parseMethod: 'ai',
        };
      }
    } finally {
      setIsProcessing(false);
    }

    return {
      hasGraphIntent: false,
      command: null,
      originalMessage: message,
      shouldProceedToChat: true,
      parseMethod: 'regex',
    };
  }, [quickPatternMatch, aiParse]);

  // Execute graph command
  const executeCommand = useCallback(async (command: GraphCommand): Promise<GraphOperationResult> => {
    if (!agentId) {
      return {
        success: false,
        operation: command.action,
        error: 'No agent selected',
        timestamp: new Date(),
      };
    }

    setIsProcessing(true);

    try {
      switch (command.action) {
        case 'add_node': {
          const nodeId = `${command.nodeType || 'skill'}_${Date.now()}`;
          const position = command.position || calculateOptimalPosition(nodes, command.nodeType);

          const newNode = await addNode({
            agent_id: agentId,
            node_id: nodeId,
            node_type: command.nodeType || 'skill',
            position_x: position.x,
            position_y: position.y,
            data: command.nodeData || {},
          });

          if (!newNode) {
            throw new Error('Failed to add node');
          }

          // Auto-connect to Manus Core if requested
          if (command.autoConnect) {
            const manusCore = nodes.find(n => n.node_type === 'manus');
            if (manusCore) {
              await addEdge({
                agent_id: agentId,
                edge_id: `edge-${nodeId}-to-manus-${Date.now()}`,
                source_node: nodeId,
                target_node: manusCore.node_id,
                edge_type: 'animated',
                data: {},
              });
            }
          }

          toast.success(`已添加「${command.nodeData?.name}」`);
          
          const result: GraphOperationResult = {
            success: true,
            operation: 'add_node',
            nodeId,
            timestamp: new Date(),
          };
          setLastResult(result);
          return result;
        }

        case 'remove_node': {
          // Find matching node by name
          const targetNode = nodes.find(n =>
            (n.data as any)?.name?.includes(command.nodeData?.name) ||
            n.node_id === command.nodeId
          );

          if (!targetNode) {
            throw new Error(`未找到「${command.nodeData?.name}」`);
          }

          await removeNode(targetNode.node_id);
          toast.success(`已移除「${(targetNode.data as any)?.name || targetNode.node_id}」`);

          const result: GraphOperationResult = {
            success: true,
            operation: 'remove_node',
            nodeId: targetNode.node_id,
            timestamp: new Date(),
          };
          setLastResult(result);
          return result;
        }

        default:
          throw new Error(`Unknown action: ${command.action}`);
      }
    } catch (error: any) {
      console.error('Command execution failed:', error);
      toast.error(`操作失败: ${error.message}`);
      
      const result: GraphOperationResult = {
        success: false,
        operation: command.action,
        error: error.message,
        timestamp: new Date(),
      };
      setLastResult(result);
      return result;
    } finally {
      setIsProcessing(false);
      setPendingCommand(null);
    }
  }, [agentId, nodes, addNode, addEdge, removeNode]);

  // Request confirmation
  const requestConfirmation = useCallback((command: GraphCommand) => {
    setPendingCommand(command);
  }, []);

  // Cancel pending command
  const cancelCommand = useCallback(() => {
    setPendingCommand(null);
  }, []);

  // Confirm and execute
  const confirmCommand = useCallback(async () => {
    if (!pendingCommand) return null;
    return executeCommand(pendingCommand);
  }, [pendingCommand, executeCommand]);

  return {
    // State
    isProcessing,
    pendingCommand,
    lastResult,

    // Methods
    parseMessage,
    executeCommand,
    requestConfirmation,
    confirmCommand,
    cancelCommand,
  };
}
