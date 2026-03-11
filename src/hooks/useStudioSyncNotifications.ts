import { useEffect, useCallback, useRef } from 'react';
import { useGlobalAgentStore, SyncEvent, AgentConfig } from '../stores/globalAgentStore.ts';
import type { SystemMessage, SystemMessageType } from '../components/consumer/SystemBubble.tsx';
import { MCP_CAPABILITY_MAP } from './useCapabilityGuide.ts';

interface UseStudioSyncNotificationsOptions {
  agentId: string | null;
  onSystemMessage: (message: SystemMessage) => void;
  onContextRefresh?: (newConfig: AgentConfig) => void;
  onPersonalityChange?: (newPersonalityName?: string) => void;
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
      // MCP tools get their own type
      if (['mcp', 'mcpAction', 'mcpTool'].includes(nodeType)) {
        return 'mcp_connected';
      }
      // skill, generatedSkill, etc.
      if (['skill', 'generatedSkill'].includes(nodeType)) {
        return 'skill_added';
      }
      return 'skill_added'; // Default for other node types
      
    case 'node_removed':
      if (nodeType === 'knowledge' || nodeType === 'knowledgeBase') {
        return 'knowledge_removed';
      }
      return 'skill_removed';
      
    case 'agent_updated':
      // Check if manifest/personality changed
      const changedFields = data?.changedFields || [];
      if (changedFields.includes('manifest') || changedFields.includes('personality_config')) {
        return 'personality_updated';
      }
      return 'config_updated';
    
    // 🆕 新增：智能体创建事件
    case 'agent_created':
      return 'config_updated';
      
    default:
      return null;
  }
}

// Generate intelligent MCP capability description
function generateMcpDescription(nodeData: any): { 
  description: string; 
  suggestion: string;
} {
  const mcpType = nodeData?.mcp_server || nodeData?.tool_name || nodeData?.name || '';
  const mcpTypeLower = mcpType.toLowerCase();
  const nodeName = nodeData?.name || nodeData?.label || '新工具';
  
  // Try to match known MCP types
  for (const [key, capability] of Object.entries(MCP_CAPABILITY_MAP)) {
    if (mcpTypeLower.includes(key)) {
      return {
        description: `[${nodeName}] 能力已上线。现在您可以让我${capability.action}了，试试说 "${capability.example}"`,
        suggestion: capability.example,
      };
    }
  }
  
  // Default description
  return {
    description: `[${nodeName}] 能力已上线。现在您可以使用这个功能了。`,
    suggestion: `使用 ${nodeName}`,
  };
}

// Generate human-readable message content
function generateMessageContent(event: SyncEvent): { 
  title: string; 
  description: string;
  suggestion?: string;
} {
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
      // MCP tools - use intelligent description
      if (['mcp', 'mcpAction', 'mcpTool'].includes(nodeType)) {
        const { description, suggestion } = generateMcpDescription(data);
        return {
          title: '新能力已连接',
          description,
          suggestion,
        };
      }
      return {
        title: '新技能上线',
        description: `[${nodeName}] 能力已上线。现在您可以让我使用这个功能了。`,
        suggestion: `使用 ${nodeName}`,
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
      if (changedFields.includes('manifest') || changedFields.includes('personality_config')) {
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
    
    // 🆕 新增：智能体创建事件
    case 'agent_created':
      const agentName = data?.name || data?.agentName || '新智能体';
      return {
        title: '智能体已就绪',
        description: `「${agentName}」创建成功，可以开始对话了！`,
        suggestion: '让我们开始吧',
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
  onPersonalityChange,
  enabled = true,
}: UseStudioSyncNotificationsOptions) {
  const recentEvents = useGlobalAgentStore((state) => state.recentEvents);
  const agentConfig = useGlobalAgentStore((state) => state.agentConfig);
  const setAgentId = useGlobalAgentStore((state) => state.setAgentId);
  const isSubscribed = useGlobalAgentStore((state) => state.isSubscribed);
  
  // Track processed event timestamps to avoid duplicates
  const processedEventsRef = useRef<Set<string>>(new Set());
  const prevConfigRef = useRef<AgentConfig | null>(null);
  
  // Store callbacks in refs to avoid dependency issues
  const onSystemMessageRef = useRef(onSystemMessage);
  onSystemMessageRef.current = onSystemMessage;
  
  const onContextRefreshRef = useRef(onContextRefresh);
  onContextRefreshRef.current = onContextRefresh;

  const onPersonalityChangeRef = useRef(onPersonalityChange);
  onPersonalityChangeRef.current = onPersonalityChange;

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
      
      const { title, description, suggestion } = generateMessageContent(event);
      
      // Trigger personality change animation if applicable
      if (messageType === 'personality_updated') {
        const manifest = event.data?.manifest as any;
        const personalityName = manifest?.name || manifest?.roleName;
        onPersonalityChangeRef.current?.(personalityName);
      }
      
      const systemMessage: SystemMessage = {
        id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: messageType,
        title,
        description,
        skillName: extractNodeName(event.data),
        suggestion,
        timestamp: event.timestamp,
      };
      
      onSystemMessageRef.current(systemMessage);
    });
  }, [recentEvents, agentId, enabled]);

  // Handle context refresh on agent config changes
  useEffect(() => {
    if (!enabled || !agentConfig) return;

    const prevConfig = prevConfigRef.current;
    prevConfigRef.current = agentConfig;
    
    if (!prevConfig || prevConfig.id !== agentConfig.id) return;
    
    // Check if manifest/systemPrompt changed
    const prevManifest = prevConfig.manifest;
    const newManifest = agentConfig.manifest;
    
    if (JSON.stringify(prevManifest) !== JSON.stringify(newManifest)) {
      // Trigger personality change animation
      const manifest = newManifest as any;
      const personalityName = manifest?.name || manifest?.roleName;
      onPersonalityChangeRef.current?.(personalityName);
      
      // Trigger context refresh
      onContextRefreshRef.current?.(agentConfig);
    }
  }, [agentConfig, enabled]);

  // Expose manual refresh method
  const forceRefresh = useCallback(() => {
    const config = useGlobalAgentStore.getState().agentConfig;
    if (config) {
      onContextRefreshRef.current?.(config);
    }
  }, []);

  return {
    forceRefresh,
    isSubscribed,
  };
}
