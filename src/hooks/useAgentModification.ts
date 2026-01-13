import { useState, useCallback } from 'react';
import { useGlobalAgentStore } from '@/stores/globalAgentStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============= Types =============

export type ModificationAction = 
  | 'add_skill' 
  | 'remove_skill' 
  | 'add_knowledge' 
  | 'remove_knowledge'
  | 'change_name'
  | 'change_config'
  | 'add_trigger'
  | 'remove_trigger';

export interface ModificationIntent {
  action: ModificationAction;
  confidence: number;
  description: string;
  targetId?: string;
  targetName?: string;
  newValue?: any;
  nodeType?: string;
  nodeData?: Record<string, any>;
}

interface ParseResult {
  hasModificationIntent: boolean;
  intent: ModificationIntent | null;
  originalMessage: string;
}

// ============= Intent Patterns =============

const MODIFICATION_PATTERNS: Array<{
  patterns: RegExp[];
  action: ModificationAction;
  extractTarget: (match: RegExpMatchArray) => Partial<ModificationIntent>;
}> = [
  // Add skill patterns
  {
    patterns: [
      /(?:加|添加|增加|给我加|帮我加)(?:一?个?)(.+?)(?:功能|技能|能力)?$/i,
      /(?:我想要|需要|希望有)(.+?)(?:功能|技能)?/i,
      /(?:能不能|可以|可否)(?:加|添加)(.+)/i,
    ],
    action: 'add_skill',
    extractTarget: (match) => ({
      targetName: match[1]?.trim(),
      description: `添加「${match[1]?.trim()}」功能`,
    }),
  },
  // Remove skill patterns
  {
    patterns: [
      /(?:去掉|删除|移除|取消|不要)(.+?)(?:功能|技能)?$/i,
      /(?:把)?(.+?)(?:功能|技能)?(?:去掉|删了|移除)/i,
    ],
    action: 'remove_skill',
    extractTarget: (match) => ({
      targetName: match[1]?.trim(),
      description: `移除「${match[1]?.trim()}」功能`,
    }),
  },
  // Add knowledge patterns
  {
    patterns: [
      /(?:挂载|加载|连接|使用)(?:知识库)?[「「']?(.+?)[」」']?(?:知识库)?$/i,
      /(?:让它|让他)(?:学习|使用|参考)(.+)/i,
    ],
    action: 'add_knowledge',
    extractTarget: (match) => ({
      targetName: match[1]?.trim(),
      description: `挂载知识库「${match[1]?.trim()}」`,
    }),
  },
  // Change name patterns
  {
    patterns: [
      /(?:把名字?|名称)(?:改成?|换成?|叫)[「「']?(.+?)[」」']?$/i,
      /(?:改名|重命名)(?:为|成|叫)[「「']?(.+?)[」」']?$/i,
      /(?:叫它?|叫他?)[「「']?(.+?)[」」']?$/i,
    ],
    action: 'change_name',
    extractTarget: (match) => ({
      newValue: match[1]?.trim(),
      description: `将名字改为「${match[1]?.trim()}」`,
    }),
  },
  // Add trigger patterns
  {
    patterns: [
      /(?:添加|设置|加)(?:一个?)?(?:定时|定期|周期|自动)(.+?)(?:任务|触发)?/i,
      /(?:每天|每周|每小时|每分钟)(?:自动)?(.+)/i,
    ],
    action: 'add_trigger',
    extractTarget: (match) => ({
      targetName: match[1]?.trim(),
      description: `添加定时触发器`,
    }),
  },
];

// ============= Hook =============

export function useAgentModification() {
  const [pendingIntent, setPendingIntent] = useState<ModificationIntent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  
  // ✅ Use precise selectors to avoid infinite loops
  const agentId = useGlobalAgentStore((s) => s.agentId);
  const nodes = useGlobalAgentStore((s) => s.nodes);
  const addNode = useGlobalAgentStore((s) => s.addNode);
  const removeNode = useGlobalAgentStore((s) => s.removeNode);
  const updateAgentConfig = useGlobalAgentStore((s) => s.updateAgentConfig);

  /**
   * Parse a user message to detect modification intent
   */
  const parseModificationIntent = useCallback((message: string): ParseResult => {
    const trimmedMessage = message.trim();
    
    for (const patternGroup of MODIFICATION_PATTERNS) {
      for (const pattern of patternGroup.patterns) {
        const match = trimmedMessage.match(pattern);
        if (match) {
          const extracted = patternGroup.extractTarget(match);
          return {
            hasModificationIntent: true,
            intent: {
              action: patternGroup.action,
              confidence: 0.8,
              description: extracted.description || `执行 ${patternGroup.action}`,
              ...extracted,
            },
            originalMessage: trimmedMessage,
          };
        }
      }
    }
    
    return {
      hasModificationIntent: false,
      intent: null,
      originalMessage: trimmedMessage,
    };
  }, []);

  /**
   * Request user confirmation for a modification
   */
  const requestConfirmation = useCallback((intent: ModificationIntent, originalMessage: string) => {
    setPendingIntent(intent);
    setPendingMessage(originalMessage);
  }, []);

  /**
   * Execute the pending modification
   */
  const confirmModification = useCallback(async () => {
    if (!pendingIntent) return false;
    
    setIsProcessing(true);
    
    try {
      if (!agentId) {
        throw new Error('No agent selected');
      }
      
      switch (pendingIntent.action) {
        case 'add_skill': {
          // Generate a unique node ID
          const nodeId = `skill_${Date.now()}`;
          await addNode({
            agent_id: agentId,
            node_id: nodeId,
            node_type: 'skill',
            position_x: 300 + Math.random() * 100,
            position_y: 200 + Math.random() * 100,
            data: {
              name: pendingIntent.targetName || 'New Skill',
              description: `由用户通过对话添加的技能`,
              status: 'active',
            },
          });
          toast.success(`已添加「${pendingIntent.targetName}」技能`);
          break;
        }
        
        case 'remove_skill': {
          // Find and remove the skill node by name
          const targetNode = nodes.find(
            n => n.node_type === 'skill' && 
            (n.data as any)?.name?.includes(pendingIntent.targetName)
          );
          if (targetNode) {
            await removeNode(targetNode.node_id);
            toast.success(`已移除「${pendingIntent.targetName}」技能`);
          } else {
            toast.error(`未找到「${pendingIntent.targetName}」技能`);
          }
          break;
        }
        
        case 'add_knowledge': {
          const nodeId = `knowledge_${Date.now()}`;
          await addNode({
            agent_id: agentId,
            node_id: nodeId,
            node_type: 'knowledge',
            position_x: 100 + Math.random() * 100,
            position_y: 200 + Math.random() * 100,
            data: {
              name: pendingIntent.targetName || 'Knowledge Base',
              status: 'mounted',
            },
          });
          toast.success(`已挂载「${pendingIntent.targetName}」知识库`);
          break;
        }
        
        case 'change_name': {
          if (pendingIntent.newValue) {
            await updateAgentConfig({ name: pendingIntent.newValue });
            toast.success(`名字已改为「${pendingIntent.newValue}」`);
          }
          break;
        }
        
        case 'add_trigger': {
          const nodeId = `trigger_${Date.now()}`;
          await addNode({
            agent_id: agentId,
            node_id: nodeId,
            node_type: 'trigger',
            position_x: 50,
            position_y: 100 + Math.random() * 100,
            data: {
              name: pendingIntent.targetName || 'Timer Trigger',
              type: 'schedule',
            },
          });
          toast.success(`已添加触发器`);
          break;
        }
        
        default:
          console.warn('Unknown modification action:', pendingIntent.action);
      }
      
      setPendingIntent(null);
      setPendingMessage('');
      return true;
    } catch (error: any) {
      console.error('Failed to execute modification:', error);
      toast.error(`操作失败: ${error.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [pendingIntent, agentId, nodes, addNode, removeNode, updateAgentConfig]);

  /**
   * Cancel the pending modification
   */
  const cancelModification = useCallback(() => {
    setPendingIntent(null);
    setPendingMessage('');
  }, []);

  /**
   * Get action description in Chinese
   */
  const getActionLabel = useCallback((action: ModificationAction): string => {
    const labels: Record<ModificationAction, string> = {
      'add_skill': '添加技能',
      'remove_skill': '移除技能',
      'add_knowledge': '挂载知识库',
      'remove_knowledge': '卸载知识库',
      'change_name': '修改名称',
      'change_config': '修改配置',
      'add_trigger': '添加触发器',
      'remove_trigger': '移除触发器',
    };
    return labels[action] || action;
  }, []);

  return {
    // State
    pendingIntent,
    pendingMessage,
    isProcessing,
    
    // Methods
    parseModificationIntent,
    requestConfirmation,
    confirmModification,
    cancelModification,
    getActionLabel,
  };
}
