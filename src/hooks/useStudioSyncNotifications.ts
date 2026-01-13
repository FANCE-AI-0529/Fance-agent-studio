import { useEffect, useCallback, useRef } from 'react';
import { useGlobalAgentStore, SyncEvent, AgentConfig } from '@/stores/globalAgentStore';
import type { SystemMessage, SystemMessageType } from '@/components/consumer/SystemBubble';

interface UseStudioSyncNotificationsOptions {
  agentId: string | null;
  onSystemMessage: (message: SystemMessage) => void;
  onContextRefresh?: (newConfig: AgentConfig) => void;
  enabled?: boolean;
}

// Extract skill/node name from event data
function extractNodeName(data: any): string {
  if (!data) return '未知技能';
  
  // Check various possible name fields
  return data.data?.name || 
         data.data?.label || 
         data.data?.title ||
         data.name ||
         data.label ||
         '新技能';
}

// Determine system message type from sync event
function getSystemMessageType(event: SyncEvent): SystemMessageType | null {
  const { type, data } = event;
  const nodeType = data?.node_type || data?.type;

  switch (type) {
    case 'node_added':
      if (nodeType === 'knowledge' || nodeType === 'knowledgeBase') {
        return 'knowledge_mounted';
      }
      // skill, mcp, generatedSkill, etc.
      if (['skill', 'mcp', 'generatedSkill', 'mcpAction'].includes(nodeType)) {
        return 'skill_added';
      }
      return 'skill_added'; // Default for other node types
      
    case 'node_removed':
      if (nodeType === 'knowledge' || nodeType === 'knowledgeBase') {
        return 'knowledge_removed';
      }
      return 'skill_removed';
      
    case 'agent_updated':
      return 'config_updated';
      
    default:
      return null;
  }
}

// Generate human-readable message content
function generateMessageContent(event: SyncEvent): { title: string; description: string } {
  const { type, data } = event;
  const nodeName = extractNodeName(data);
  const nodeType = data?.node_type || data?.type;

  switch (type) {
    case 'node_added':
      if (nodeType === 'knowledge' || nodeType === 'knowledgeBase') {
        return {
          title: '新知识库已挂载',
          description: `[${nodeName}] 知识库已添加到我的记忆中。现在您可以询问相关问题了。`,
        };
      }
      return {
        title: '新技能上线',
        description: `[${nodeName}] 能力已上线。现在您可以让我使用这个功能了。`,
      };
      
    case 'node_removed':
      if (nodeType === 'knowledge' || nodeType === 'knowledgeBase') {
        return {
          title: '知识库已卸载',
          description: `[${nodeName}] 知识库已从我的记忆中移除。`,
        };
      }
      return {
        title: '技能已移除',
        description: `[${nodeName}] 能力已下线。此功能暂时不可用。`,
      };
      
    case 'agent_updated':
      // Detect what changed
      const changedFields = data?.changedFields || [];
      if (changedFields.includes('manifest')) {
        return {
          title: '角色设定已更新',
          description: '我的行为模式已经调整。接下来的对话将使用新的设定。',
        };
      }
      if (changedFields.includes('name')) {
        return {
          title: '名称已更新',
          description: `我的名字已更改为 [${data?.name || '新名称'}]。`,
        };
      }
      return {
        title: '配置已更新',
        description: '我的设置已经更新。对话体验可能会有所变化。',
      };
      
    default:
      return {
        title: '架构变更',
        description: '检测到变更，已自动同步。',
      };
  }
}

export function useStudioSyncNotifications({
  agentId,
  onSystemMessage,
  onContextRefresh,
  enabled = true,
}: UseStudioSyncNotificationsOptions) {
  const recentEvents = useGlobalAgentStore((state) => state.recentEvents);
  const agentConfig = useGlobalAgentStore((state) => state.agentConfig);
  const setAgentId = useGlobalAgentStore((state) => state.setAgentId);
  const subscribe = useGlobalAgentStore((state) => state.subscribe);
  
  // Track processed event timestamps to avoid duplicates
  const processedEventsRef = useRef<Set<string>>(new Set());
  const prevConfigRef = useRef<AgentConfig | null>(null);

  // Subscribe to agent updates when agentId changes
  useEffect(() => {
    if (agentId && enabled) {
      setAgentId(agentId);
    }
  }, [agentId, enabled, setAgentId]);

  // Process remote sync events
  useEffect(() => {
    if (!enabled || !agentId) return;

    // Filter remote events that haven't been processed
    const remoteEvents = recentEvents.filter(e => e.source === 'remote');
    
    remoteEvents.forEach((event) => {
      const eventKey = `${event.type}-${event.timestamp.getTime()}`;
      
      if (processedEventsRef.current.has(eventKey)) {
        return; // Already processed
      }
      
      processedEventsRef.current.add(eventKey);
      
      // Clean up old entries (keep last 50)
      if (processedEventsRef.current.size > 50) {
        const entries = Array.from(processedEventsRef.current);
        processedEventsRef.current = new Set(entries.slice(-50));
      }
      
      // Generate system message
      const messageType = getSystemMessageType(event);
      if (!messageType) return;
      
      const { title, description } = generateMessageContent(event);
      
      const systemMessage: SystemMessage = {
        id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: messageType,
        title,
        description,
        skillName: extractNodeName(event.data),
        timestamp: event.timestamp,
      };
      
      onSystemMessage(systemMessage);
    });
  }, [recentEvents, agentId, enabled, onSystemMessage]);

  // Handle context refresh on agent config changes
  useEffect(() => {
    if (!enabled || !agentConfig || !onContextRefresh) return;

    const prevConfig = prevConfigRef.current;
    
    if (prevConfig && prevConfig.id === agentConfig.id) {
      // Check if manifest/systemPrompt changed
      const prevManifest = prevConfig.manifest;
      const newManifest = agentConfig.manifest;
      
      if (JSON.stringify(prevManifest) !== JSON.stringify(newManifest)) {
        // Trigger context refresh
        onContextRefresh(agentConfig);
      }
    }
    
    prevConfigRef.current = agentConfig;
  }, [agentConfig, enabled, onContextRefresh]);

  // Expose manual refresh method
  const forceRefresh = useCallback(() => {
    if (agentConfig && onContextRefresh) {
      onContextRefresh(agentConfig);
    }
  }, [agentConfig, onContextRefresh]);

  return {
    forceRefresh,
    isSubscribed: useGlobalAgentStore((state) => state.isSubscribed),
  };
}
