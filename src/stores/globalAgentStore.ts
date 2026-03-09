import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============= Types =============

export interface GraphNode {
  id: string;
  node_id: string;
  agent_id: string;
  node_type: string;
  position_x: number;
  position_y: number;
  data: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GraphEdge {
  id: string;
  edge_id: string;
  agent_id: string;
  source_node: string;
  target_node: string;
  edge_type: string;
  data: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  department?: string;
  model: string;
  mplp_policy: string;
  status: string;
  manifest?: Record<string, any>;
  personality_config?: Record<string, any>;
  category?: string;
  tags?: string[];
  updated_at: string;
}

export interface SyncEvent {
  type: 'node_added' | 'node_updated' | 'node_removed' | 
        'edge_added' | 'edge_updated' | 'edge_removed' |
        'agent_updated' | 'agent_created';
  source: 'local' | 'remote';
  timestamp: Date;
  data: any;
}

export interface GlobalAgentState {
  // Current Agent
  agentId: string | null;
  agentConfig: AgentConfig | null;
  
  // Graph Data (ReactFlow compatible format)
  nodes: GraphNode[];
  edges: GraphEdge[];
  
  // Sync Metadata
  version: number;
  lastSyncedAt: Date | null;
  isDirty: boolean;
  isSyncing: boolean;
  isGraphModifying: boolean; // True when graph is being modified (for Consumer UI indicator)
  syncError: string | null;
  
  // Subscription State
  isSubscribed: boolean;
  channel: RealtimeChannel | null;
  
  // Event Log (for animations)
  recentEvents: SyncEvent[];
  
  // Actions
  setAgentId: (id: string | null) => void;
  loadAgent: (id: string) => Promise<boolean>;
  clearAgent: () => void;
  
  // Node Operations (with DB sync)
  addNode: (node: Omit<GraphNode, 'id' | 'version' | 'created_at' | 'updated_at'>) => Promise<GraphNode | null>;
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => Promise<boolean>;
  updateNodePosition: (nodeId: string, x: number, y: number) => Promise<boolean>;
  removeNode: (nodeId: string) => Promise<boolean>;
  
  // Edge Operations (with DB sync)
  addEdge: (edge: Omit<GraphEdge, 'id' | 'version' | 'created_at' | 'updated_at'>) => Promise<GraphEdge | null>;
  updateEdge: (edgeId: string, updates: Partial<GraphEdge>) => Promise<boolean>;
  removeEdge: (edgeId: string) => Promise<boolean>;
  
  // Agent Config Operations
  updateAgentConfig: (updates: Partial<AgentConfig>) => Promise<boolean>;
  
  // Subscription Management
  subscribe: () => void;
  unsubscribe: () => void;
  
  // Internal Handlers (called by Realtime)
  _handleNodeChange: (payload: RealtimePostgresChangesPayload<GraphNode>) => void;
  _handleEdgeChange: (payload: RealtimePostgresChangesPayload<GraphEdge>) => void;
  _handleAgentChange: (payload: RealtimePostgresChangesPayload<any>) => void;
  _addSyncEvent: (event: Omit<SyncEvent, 'timestamp'>) => void;
}

// ============= Store =============

export const useGlobalAgentStore = create<GlobalAgentState>()(
  persist(
    (set, get) => ({
      // Initial State
      agentId: null,
      agentConfig: null,
      nodes: [],
      edges: [],
      version: 0,
      lastSyncedAt: null,
      isDirty: false,
      isSyncing: false,
      isGraphModifying: false,
      syncError: null,
      isSubscribed: false,
      channel: null,
      recentEvents: [],

      // ============= Agent Management =============
      
      setAgentId: (id) => {
        const current = get().agentId;
        if (current !== id) {
          // Unsubscribe from old agent
          get().unsubscribe();
          set({ agentId: id, nodes: [], edges: [], agentConfig: null });
          
          // Load and subscribe to new agent
          if (id) {
            get().loadAgent(id);
          }
        }
      },

      loadAgent: async (id) => {
        set({ isSyncing: true, syncError: null });
        
        try {
          // Load agent config
          const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', id)
            .single();
          
          if (agentError) throw agentError;
          
          // Load nodes
          const { data: nodes, error: nodesError } = await supabase
            .from('agent_graph_nodes')
            .select('*')
            .eq('agent_id', id)
            .order('created_at', { ascending: true });
          
          if (nodesError) throw nodesError;
          
          // Load edges
          const { data: edges, error: edgesError } = await supabase
            .from('agent_graph_edges')
            .select('*')
            .eq('agent_id', id)
            .order('created_at', { ascending: true });
          
          if (edgesError) throw edgesError;
          
          set({
            agentId: id,
            agentConfig: agent as AgentConfig,
            nodes: (nodes || []) as GraphNode[],
            edges: (edges || []) as GraphEdge[],
            lastSyncedAt: new Date(),
            isSyncing: false,
            isDirty: false,
          });
          
          // Subscribe to realtime updates
          get().subscribe();
          
          return true;
        } catch (error: any) {
          console.error('Failed to load agent:', error);
          set({ 
            isSyncing: false, 
            syncError: error.message || 'Failed to load agent' 
          });
          return false;
        }
      },

      clearAgent: () => {
        get().unsubscribe();
        set({
          agentId: null,
          agentConfig: null,
          nodes: [],
          edges: [],
          version: 0,
          lastSyncedAt: null,
          isDirty: false,
          recentEvents: [],
        });
      },

      // ============= Node Operations =============

      addNode: async (nodeData) => {
        const { agentId } = get();
        if (!agentId) return null;
        
        set({ isSyncing: true, isGraphModifying: true });
        
        try {
          const { data, error } = await supabase
            .from('agent_graph_nodes')
            .insert({
              agent_id: agentId,
              node_id: nodeData.node_id,
              node_type: nodeData.node_type,
              position_x: nodeData.position_x,
              position_y: nodeData.position_y,
              data: nodeData.data,
            })
            .select()
            .single();
          
          if (error) throw error;
          
          // Optimistic update (Realtime will also fire)
          const newNode = data as GraphNode;
          set((state) => ({
            nodes: [...state.nodes, newNode],
            isSyncing: false,
            isGraphModifying: false,
            isDirty: false,
          }));
          
          get()._addSyncEvent({ type: 'node_added', source: 'local', data: newNode });
          
          return newNode;
        } catch (error: any) {
          console.error('Failed to add node:', error);
          set({ isSyncing: false, isGraphModifying: false, syncError: error.message });
          return null;
        }
      },

      updateNode: async (nodeId, updates) => {
        const { agentId, nodes } = get();
        if (!agentId) return false;
        
        const node = nodes.find(n => n.node_id === nodeId);
        if (!node) return false;
        
        set({ isSyncing: true });
        
        try {
          const { error } = await supabase
            .from('agent_graph_nodes')
            .update({
              ...(updates.node_type && { node_type: updates.node_type }),
              ...(updates.position_x !== undefined && { position_x: updates.position_x }),
              ...(updates.position_y !== undefined && { position_y: updates.position_y }),
              ...(updates.data && { data: updates.data }),
            })
            .eq('agent_id', agentId)
            .eq('node_id', nodeId);
          
          if (error) throw error;
          
          // Optimistic update
          set((state) => ({
            nodes: state.nodes.map(n => 
              n.node_id === nodeId ? { ...n, ...updates } : n
            ),
            isSyncing: false,
          }));
          
          get()._addSyncEvent({ type: 'node_updated', source: 'local', data: { nodeId, updates } });
          
          return true;
        } catch (error: any) {
          console.error('Failed to update node:', error);
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },

      updateNodePosition: async (nodeId, x, y) => {
        return get().updateNode(nodeId, { position_x: x, position_y: y });
      },

      removeNode: async (nodeId) => {
        const { agentId } = get();
        if (!agentId) return false;
        
        set({ isSyncing: true });
        
        try {
          // First remove edges connected to this node
          await supabase
            .from('agent_graph_edges')
            .delete()
            .eq('agent_id', agentId)
            .or(`source_node.eq.${nodeId},target_node.eq.${nodeId}`);
          
          // Then remove the node
          const { error } = await supabase
            .from('agent_graph_nodes')
            .delete()
            .eq('agent_id', agentId)
            .eq('node_id', nodeId);
          
          if (error) throw error;
          
          // Optimistic update
          set((state) => ({
            nodes: state.nodes.filter(n => n.node_id !== nodeId),
            edges: state.edges.filter(e => e.source_node !== nodeId && e.target_node !== nodeId),
            isSyncing: false,
          }));
          
          get()._addSyncEvent({ type: 'node_removed', source: 'local', data: { nodeId } });
          
          return true;
        } catch (error: any) {
          console.error('Failed to remove node:', error);
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },

      // ============= Edge Operations =============

      addEdge: async (edgeData) => {
        const { agentId } = get();
        if (!agentId) return null;
        
        set({ isSyncing: true });
        
        try {
          const { data, error } = await supabase
            .from('agent_graph_edges')
            .insert({
              agent_id: agentId,
              edge_id: edgeData.edge_id,
              source_node: edgeData.source_node,
              target_node: edgeData.target_node,
              edge_type: edgeData.edge_type || 'default',
              data: edgeData.data || {},
            })
            .select()
            .single();
          
          if (error) throw error;
          
          const newEdge = data as GraphEdge;
          set((state) => ({
            edges: [...state.edges, newEdge],
            isSyncing: false,
          }));
          
          get()._addSyncEvent({ type: 'edge_added', source: 'local', data: newEdge });
          
          return newEdge;
        } catch (error: any) {
          console.error('Failed to add edge:', error);
          set({ isSyncing: false, syncError: error.message });
          return null;
        }
      },

      updateEdge: async (edgeId, updates) => {
        const { agentId } = get();
        if (!agentId) return false;
        
        set({ isSyncing: true });
        
        try {
          const { error } = await supabase
            .from('agent_graph_edges')
            .update({
              ...(updates.edge_type && { edge_type: updates.edge_type }),
              ...(updates.data && { data: updates.data }),
            })
            .eq('agent_id', agentId)
            .eq('edge_id', edgeId);
          
          if (error) throw error;
          
          set((state) => ({
            edges: state.edges.map(e => 
              e.edge_id === edgeId ? { ...e, ...updates } : e
            ),
            isSyncing: false,
          }));
          
          get()._addSyncEvent({ type: 'edge_updated', source: 'local', data: { edgeId, updates } });
          
          return true;
        } catch (error: any) {
          console.error('Failed to update edge:', error);
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },

      removeEdge: async (edgeId) => {
        const { agentId } = get();
        if (!agentId) return false;
        
        set({ isSyncing: true });
        
        try {
          const { error } = await supabase
            .from('agent_graph_edges')
            .delete()
            .eq('agent_id', agentId)
            .eq('edge_id', edgeId);
          
          if (error) throw error;
          
          set((state) => ({
            edges: state.edges.filter(e => e.edge_id !== edgeId),
            isSyncing: false,
          }));
          
          get()._addSyncEvent({ type: 'edge_removed', source: 'local', data: { edgeId } });
          
          return true;
        } catch (error: any) {
          console.error('Failed to remove edge:', error);
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },

      // ============= Agent Config Operations =============

      updateAgentConfig: async (updates) => {
        const { agentId, agentConfig } = get();
        if (!agentId || !agentConfig) return false;
        
        set({ isSyncing: true });
        
        try {
          const { error } = await supabase
            .from('agents')
            .update(updates)
            .eq('id', agentId);
          
          if (error) throw error;
          
          set((state) => ({
            agentConfig: state.agentConfig ? { ...state.agentConfig, ...updates } : null,
            isSyncing: false,
          }));
          
          get()._addSyncEvent({ type: 'agent_updated', source: 'local', data: updates });
          
          return true;
        } catch (error: any) {
          console.error('Failed to update agent config:', error);
          set({ isSyncing: false, syncError: error.message });
          return false;
        }
      },

      // ============= Realtime Subscription =============

      subscribe: () => {
        const { agentId, isSubscribed, channel: existingChannel } = get();
        if (!agentId || isSubscribed) return;
        
        // Clean up existing channel
        if (existingChannel) {
          supabase.removeChannel(existingChannel);
        }
        
        const channel = supabase.channel(`agent-sync-${agentId}`)
          // Listen to node changes
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'agent_graph_nodes',
              filter: `agent_id=eq.${agentId}`,
            },
            (payload) => get()._handleNodeChange(payload as RealtimePostgresChangesPayload<GraphNode>)
          )
          // Listen to edge changes
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'agent_graph_edges',
              filter: `agent_id=eq.${agentId}`,
            },
            (payload) => get()._handleEdgeChange(payload as RealtimePostgresChangesPayload<GraphEdge>)
          )
          // Listen to agent metadata changes
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'agents',
              filter: `id=eq.${agentId}`,
            },
            (payload) => get()._handleAgentChange(payload)
          )
          .subscribe((status) => {
            if (import.meta.env.DEV) console.debug('[GlobalAgentStore] Realtime subscription status:', status);
          });
        
        set({ isSubscribed: true, channel });
      },

      unsubscribe: () => {
        const { channel, isSubscribed } = get();
        if (!isSubscribed || !channel) return;
        
        supabase.removeChannel(channel);
        set({ isSubscribed: false, channel: null });
      },

      // ============= Internal Handlers =============

      _handleNodeChange: (payload) => {
        const { nodes } = get();
        const eventType = payload.eventType;
        if (import.meta.env.DEV) console.debug('[GlobalAgentStore] Node change:', eventType, payload);
        
        if (eventType === 'INSERT') {
          const newNode = payload.new as GraphNode;
          // Avoid duplicates from optimistic update
          if (!nodes.find(n => n.node_id === newNode.node_id)) {
            set((state) => ({
              nodes: [...state.nodes, newNode],
              lastSyncedAt: new Date(),
            }));
            // Enhance event data with readable skill name for notifications
            get()._addSyncEvent({ 
              type: 'node_added', 
              source: 'remote', 
              data: {
                ...newNode,
                skillName: newNode.data?.name || newNode.data?.label || newNode.data?.title || '新技能',
                skillDescription: newNode.data?.description,
              }
            });
          }
        } else if (eventType === 'UPDATE') {
          const updatedNode = payload.new as GraphNode;
          set((state) => ({
            nodes: state.nodes.map(n => 
              n.node_id === updatedNode.node_id ? updatedNode : n
            ),
            lastSyncedAt: new Date(),
          }));
          get()._addSyncEvent({ type: 'node_updated', source: 'remote', data: updatedNode });
        } else if (eventType === 'DELETE') {
          const deletedNode = payload.old as GraphNode;
          set((state) => ({
            nodes: state.nodes.filter(n => n.node_id !== deletedNode.node_id),
            lastSyncedAt: new Date(),
          }));
          // Enhance event data with readable skill name for notifications
          get()._addSyncEvent({ 
            type: 'node_removed', 
            source: 'remote', 
            data: {
              ...deletedNode,
              skillName: deletedNode.data?.name || deletedNode.data?.label || deletedNode.data?.title || '技能',
              skillDescription: deletedNode.data?.description,
            }
          });
        }
      },

      _handleEdgeChange: (payload) => {
        const { edges } = get();
        const eventType = payload.eventType;
        if (import.meta.env.DEV) console.debug('[GlobalAgentStore] Edge change:', eventType, payload);
        
        if (eventType === 'INSERT') {
          const newEdge = payload.new as GraphEdge;
          if (!edges.find(e => e.edge_id === newEdge.edge_id)) {
            set((state) => ({
              edges: [...state.edges, newEdge],
              lastSyncedAt: new Date(),
            }));
            get()._addSyncEvent({ type: 'edge_added', source: 'remote', data: newEdge });
          }
        } else if (eventType === 'UPDATE') {
          const updatedEdge = payload.new as GraphEdge;
          set((state) => ({
            edges: state.edges.map(e => 
              e.edge_id === updatedEdge.edge_id ? updatedEdge : e
            ),
            lastSyncedAt: new Date(),
          }));
          get()._addSyncEvent({ type: 'edge_updated', source: 'remote', data: updatedEdge });
        } else if (eventType === 'DELETE') {
          const deletedEdge = payload.old as GraphEdge;
          set((state) => ({
            edges: state.edges.filter(e => e.edge_id !== deletedEdge.edge_id),
            lastSyncedAt: new Date(),
          }));
          get()._addSyncEvent({ type: 'edge_removed', source: 'remote', data: deletedEdge });
        }
      },

      _handleAgentChange: (payload) => {
        if (import.meta.env.DEV) console.debug('[GlobalAgentStore] Agent change:', payload);
        
        const oldAgent = payload.old as AgentConfig | null;
        const updatedAgent = payload.new as AgentConfig;
        
        // Detect which fields changed
        const changedFields: string[] = [];
        if (oldAgent) {
          if (oldAgent.name !== updatedAgent.name) changedFields.push('name');
          if (oldAgent.model !== updatedAgent.model) changedFields.push('model');
          if (oldAgent.mplp_policy !== updatedAgent.mplp_policy) changedFields.push('mplp_policy');
          if (JSON.stringify(oldAgent.manifest) !== JSON.stringify(updatedAgent.manifest)) {
            changedFields.push('manifest');
          }
          if (JSON.stringify(oldAgent.personality_config) !== JSON.stringify(updatedAgent.personality_config)) {
            changedFields.push('personality_config');
          }
        }
        
        set((state) => ({
          agentConfig: updatedAgent,
          lastSyncedAt: new Date(),
        }));
        
        // Include changedFields in event data for notifications
        get()._addSyncEvent({ 
          type: 'agent_updated', 
          source: 'remote', 
          data: { ...updatedAgent, changedFields } 
        });
      },

      _addSyncEvent: (event) => {
        const fullEvent: SyncEvent = {
          ...event,
          timestamp: new Date(),
        };
        
        set((state) => ({
          recentEvents: [...state.recentEvents.slice(-19), fullEvent], // Keep last 20 events
        }));
      },
    }),
    {
      name: 'global-agent-storage',
      partialize: (state) => ({
        // Only persist agentId for quick restore
        agentId: state.agentId,
      }),
    }
  )
);

// ============= Selectors =============

export const selectNodes = (state: GlobalAgentState) => state.nodes;
export const selectEdges = (state: GlobalAgentState) => state.edges;
export const selectAgentConfig = (state: GlobalAgentState) => state.agentConfig;
export const selectIsSyncing = (state: GlobalAgentState) => state.isSyncing;
export const selectIsSubscribed = (state: GlobalAgentState) => state.isSubscribed;
export const selectIsGraphModifying = (state: GlobalAgentState) => state.isGraphModifying;
export const selectRecentEvents = (state: GlobalAgentState) => state.recentEvents;
export const selectRemoteEvents = (state: GlobalAgentState) => 
  state.recentEvents.filter(e => e.source === 'remote');
