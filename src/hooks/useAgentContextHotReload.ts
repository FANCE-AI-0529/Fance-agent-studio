import { useState, useEffect, useCallback, useRef } from 'react';
import { useGlobalAgentStore, AgentConfig } from '@/stores/globalAgentStore';

interface EffectiveAgentConfig {
  name: string;
  systemPrompt: string;
  model: string;
  agentId: string;
}

interface UseAgentContextHotReloadOptions {
  agentId: string | null;
  initialConfig?: EffectiveAgentConfig | null;
  onConfigUpdate?: (newConfig: EffectiveAgentConfig) => void;
}

interface UseAgentContextHotReloadReturn {
  // Current effective configuration (may have been hot-updated)
  effectiveConfig: EffectiveAgentConfig | null;
  
  // Configuration version number (for tracking changes)
  configVersion: number;
  
  // Manual refresh trigger
  refreshContext: () => Promise<void>;
  
  // Last refresh timestamp
  lastRefreshedAt: Date | null;
  
  // Whether currently refreshing
  isRefreshing: boolean;
}

export function useAgentContextHotReload({
  agentId,
  initialConfig,
  onConfigUpdate,
}: UseAgentContextHotReloadOptions): UseAgentContextHotReloadReturn {
  const [effectiveConfig, setEffectiveConfig] = useState<EffectiveAgentConfig | null>(
    initialConfig || null
  );
  const [configVersion, setConfigVersion] = useState(1);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const prevAgentConfigRef = useRef<AgentConfig | null>(null);
  
  // Subscribe to global agent store
  const storeAgentConfig = useGlobalAgentStore((state) => state.agentConfig);
  const loadAgent = useGlobalAgentStore((state) => state.loadAgent);

  // Store callback ref to avoid dependency issues
  const onConfigUpdateRef = useRef(onConfigUpdate);
  onConfigUpdateRef.current = onConfigUpdate;

  // Sync initial config (only once)
  useEffect(() => {
    if (initialConfig) {
      setEffectiveConfig(prev => prev || initialConfig);
    }
  }, [initialConfig]);

  // Handle hot reload when store config changes
  useEffect(() => {
    if (!storeAgentConfig || !agentId) return;
    
    // Only process if it's the same agent
    if (storeAgentConfig.id !== agentId) return;
    
    const prevConfig = prevAgentConfigRef.current;
    
    // Store current config for next comparison
    prevAgentConfigRef.current = storeAgentConfig;
    
    // Skip if no previous config to compare
    if (!prevConfig || prevConfig.id !== storeAgentConfig.id) return;
    
    // Detect changes
    const prevManifest = prevConfig.manifest;
    const newManifest = storeAgentConfig.manifest;
    
    const manifestChanged = JSON.stringify(prevManifest) !== JSON.stringify(newManifest);
    const nameChanged = prevConfig.name !== storeAgentConfig.name;
    const modelChanged = prevConfig.model !== storeAgentConfig.model;
    
    if (manifestChanged || nameChanged || modelChanged) {
      // Hot update the effective config
      const newEffectiveConfig: EffectiveAgentConfig = {
        name: storeAgentConfig.name,
        systemPrompt: (newManifest as any)?.systemPrompt || 
                      `你是${storeAgentConfig.name}，一个专业的AI助手。`,
        model: storeAgentConfig.model,
        agentId: storeAgentConfig.id,
      };
      
      setEffectiveConfig(newEffectiveConfig);
      setConfigVersion(v => v + 1);
      setLastRefreshedAt(new Date());
      
      // Notify parent via ref
      onConfigUpdateRef.current?.(newEffectiveConfig);
      
      if (import.meta.env.DEV) {
        console.debug('[HotReload] Config updated:', {
          manifestChanged,
          nameChanged,
          modelChanged,
        });
      }
    }
  }, [storeAgentConfig, agentId]);

  // Manual refresh
  const refreshContext = useCallback(async () => {
    if (!agentId) return;
    
    setIsRefreshing(true);
    
    try {
      await loadAgent(agentId);
      
      // Force update from store
      const freshConfig = useGlobalAgentStore.getState().agentConfig;
      if (freshConfig) {
        const manifest = freshConfig.manifest as any;
        const newEffectiveConfig: EffectiveAgentConfig = {
          name: freshConfig.name,
          systemPrompt: manifest?.systemPrompt || `你是${freshConfig.name}，一个专业的AI助手。`,
          model: freshConfig.model,
          agentId: freshConfig.id,
        };
        
        setEffectiveConfig(newEffectiveConfig);
        setConfigVersion(v => v + 1);
        setLastRefreshedAt(new Date());
        
        onConfigUpdate?.(newEffectiveConfig);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [agentId, loadAgent, onConfigUpdate]);

  return {
    effectiveConfig,
    configVersion,
    refreshContext,
    lastRefreshedAt,
    isRefreshing,
  };
}
