import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { RealtimeChannel } from "@supabase/supabase-js";

// Collaboration user presence
export interface CollaboratorPresence {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  cursorPosition?: { x: number; y: number };
  selectedNodeId?: string;
  lastSeen: string;
  color: string;
}

// Collaboration event types
export type CollaborationEventType = 
  | "cursor_move" 
  | "node_select" 
  | "node_update" 
  | "edge_update" 
  | "chat_message";

export interface CollaborationEvent {
  type: CollaborationEventType;
  userId: string;
  payload: Record<string, any>;
  timestamp: string;
}

interface UseCollaborationOptions {
  agentId: string;
  enabled?: boolean;
}

interface UseCollaborationReturn {
  collaborators: CollaboratorPresence[];
  isConnected: boolean;
  error: string | null;
  // Actions
  broadcastCursorMove: (x: number, y: number) => void;
  broadcastNodeSelect: (nodeId: string | null) => void;
  broadcastNodeUpdate: (nodeId: string, data: Record<string, any>) => void;
  broadcastEdgeUpdate: (edgeId: string, data: Record<string, any>) => void;
  sendChatMessage: (message: string) => void;
  // Event handlers
  onEvent: (callback: (event: CollaborationEvent) => void) => () => void;
}

// Generate a random color for each collaborator
function generateUserColor(userId: string): string {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
  ];
  
  // Use userId to deterministically pick a color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function useCollaboration({ 
  agentId, 
  enabled = true 
}: UseCollaborationOptions): UseCollaborationReturn {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const eventCallbacksRef = useRef<Set<(event: CollaborationEvent) => void>>(new Set());
  const throttleRef = useRef<{ cursor: number }>({ cursor: 0 });

  // Channel name based on agent ID
  const channelName = `collaboration:${agentId}`;

  // Setup realtime channel
  useEffect(() => {
    if (!enabled || !user || !agentId) {
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence
    channel.on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState();
      const collaboratorList: CollaboratorPresence[] = [];

      Object.entries(presenceState).forEach(([userId, presences]) => {
        if (userId !== user.id && presences.length > 0) {
          const presence = presences[0] as any;
          collaboratorList.push({
            id: userId,
            email: presence.email,
            displayName: presence.displayName,
            avatarUrl: presence.avatarUrl,
            cursorPosition: presence.cursorPosition,
            selectedNodeId: presence.selectedNodeId,
            lastSeen: new Date().toISOString(),
            color: generateUserColor(userId),
          });
        }
      });

      setCollaborators(collaboratorList);
    });

    channel.on("presence", { event: "join" }, ({ key }) => {
      if (import.meta.env.DEV) console.debug("User joined:", key);
    });

    channel.on("presence", { event: "leave" }, ({ key }) => {
      if (import.meta.env.DEV) console.debug("User left:", key);
    });

    // Listen for broadcast events
    channel.on("broadcast", { event: "collaboration" }, ({ payload }) => {
      const event = payload as CollaborationEvent;
      
      // Update collaborator state based on event
      if (event.type === "cursor_move") {
        setCollaborators(prev => 
          prev.map(c => 
            c.id === event.userId 
              ? { ...c, cursorPosition: event.payload.position, lastSeen: event.timestamp }
              : c
          )
        );
      } else if (event.type === "node_select") {
        setCollaborators(prev => 
          prev.map(c => 
            c.id === event.userId 
              ? { ...c, selectedNodeId: event.payload.nodeId, lastSeen: event.timestamp }
              : c
          )
        );
      }

      // Notify all registered callbacks
      eventCallbacksRef.current.forEach(callback => callback(event));
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setError(null);

        // Track own presence
        await channel.track({
          email: user.email,
          displayName: user.email?.split("@")[0],
          cursorPosition: null,
          selectedNodeId: null,
        });
      } else if (status === "CHANNEL_ERROR") {
        setIsConnected(false);
        setError("协作连接失败");
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      setCollaborators([]);
    };
  }, [agentId, user, enabled, channelName]);

  // Broadcast cursor movement (throttled)
  const broadcastCursorMove = useCallback((x: number, y: number) => {
    if (!channelRef.current || !user) return;

    const now = Date.now();
    if (now - throttleRef.current.cursor < 50) return; // 50ms throttle
    throttleRef.current.cursor = now;

    channelRef.current.send({
      type: "broadcast",
      event: "collaboration",
      payload: {
        type: "cursor_move",
        userId: user.id,
        payload: { position: { x, y } },
        timestamp: new Date().toISOString(),
      } as CollaborationEvent,
    });
  }, [user]);

  // Broadcast node selection
  const broadcastNodeSelect = useCallback((nodeId: string | null) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: "broadcast",
      event: "collaboration",
      payload: {
        type: "node_select",
        userId: user.id,
        payload: { nodeId },
        timestamp: new Date().toISOString(),
      } as CollaborationEvent,
    });
  }, [user]);

  // Broadcast node update
  const broadcastNodeUpdate = useCallback((nodeId: string, data: Record<string, any>) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: "broadcast",
      event: "collaboration",
      payload: {
        type: "node_update",
        userId: user.id,
        payload: { nodeId, data },
        timestamp: new Date().toISOString(),
      } as CollaborationEvent,
    });
  }, [user]);

  // Broadcast edge update
  const broadcastEdgeUpdate = useCallback((edgeId: string, data: Record<string, any>) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: "broadcast",
      event: "collaboration",
      payload: {
        type: "edge_update",
        userId: user.id,
        payload: { edgeId, data },
        timestamp: new Date().toISOString(),
      } as CollaborationEvent,
    });
  }, [user]);

  // Send chat message
  const sendChatMessage = useCallback((message: string) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: "broadcast",
      event: "collaboration",
      payload: {
        type: "chat_message",
        userId: user.id,
        payload: { message },
        timestamp: new Date().toISOString(),
      } as CollaborationEvent,
    });
  }, [user]);

  // Register event callback
  const onEvent = useCallback((callback: (event: CollaborationEvent) => void) => {
    eventCallbacksRef.current.add(callback);
    return () => {
      eventCallbacksRef.current.delete(callback);
    };
  }, []);

  return {
    collaborators,
    isConnected,
    error,
    broadcastCursorMove,
    broadcastNodeSelect,
    broadcastNodeUpdate,
    broadcastEdgeUpdate,
    sendChatMessage,
    onEvent,
  };
}

export default useCollaboration;
