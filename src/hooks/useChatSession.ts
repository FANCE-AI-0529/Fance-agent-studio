import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  skill?: string;
  mplpStatus?: string;
}

interface ChatSession {
  id: string;
  agentId: string;
  status: string;
  createdAt: Date;
}

// Default agent ID for the demo agent
const DEFAULT_AGENT_ID = "00000000-0000-0000-0000-000000000001";

export function useChatSession() {
  const { user } = useAuth();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Load user's sessions
  const loadSessions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    setSessions(
      data.map((s) => ({
        id: s.id,
        agentId: s.agent_id,
        status: s.status,
        createdAt: new Date(s.created_at),
      }))
    );
  }, [user]);

  // Load messages for a session
  const loadMessages = useCallback(async (sessionId: string) => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      toast.error("加载消息失败");
      setIsLoading(false);
      return;
    }

    setMessages(
      data.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: new Date(m.created_at),
        skill: m.skill_used || undefined,
        mplpStatus: m.mplp_status || undefined,
      }))
    );

    setIsLoading(false);
  }, []);

  // Create a new session
  const createSession = useCallback(async (agentId?: string) => {
    if (!user) {
      toast.error("请先登录");
      return null;
    }

    // Use a valid UUID for default agent or provided agentId
    const sessionAgentId = agentId || DEFAULT_AGENT_ID;

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        agent_id: sessionAgentId,
        user_id: user.id,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      toast.error("创建会话失败");
      return null;
    }

    const newSession: ChatSession = {
      id: data.id,
      agentId: data.agent_id,
      status: data.status,
      createdAt: new Date(data.created_at),
    };

    setSession(newSession);
    setMessages([]);

    return newSession;
  }, [user]);

  // Load an existing session
  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("Error loading session:", error);
      toast.error("加载会话失败");
      setIsLoading(false);
      return null;
    }

    const loadedSession: ChatSession = {
      id: data.id,
      agentId: data.agent_id,
      status: data.status,
      createdAt: new Date(data.created_at),
    };

    setSession(loadedSession);
    await loadMessages(sessionId);

    return loadedSession;
  }, [loadMessages]);

  // Save a message to the database
  const saveMessage = useCallback(async (
    sessionId: string,
    message: ChatMessage,
    skillUsed?: string,
    mplpStatus?: string
  ) => {
    const { error } = await supabase.from("messages").insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      skill_used: skillUsed || message.skill || null,
      mplp_status: mplpStatus || message.mplpStatus || null,
      metadata: {},
    });

    if (error) {
      console.error("Error saving message:", error);
    }

    // Update session's updated_at
    await supabase
      .from("sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }, []);

  // Add and save a message
  const addMessage = useCallback(async (
    message: Omit<ChatMessage, "id" | "timestamp">,
    skillUsed?: string,
    mplpStatus?: string
  ) => {
    if (!session) return null;

    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      skill: skillUsed,
      mplpStatus,
    };

    setMessages((prev) => [...prev, newMessage]);
    await saveMessage(session.id, newMessage, skillUsed, mplpStatus);

    return newMessage;
  }, [session, saveMessage]);

  // Update the last assistant message (for streaming)
  const updateLastAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].role === "assistant") {
        const updated = [...prev];
        updated[lastIndex] = { ...updated[lastIndex], content };
        return updated;
      }
      return prev;
    });
  }, []);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    // Note: Messages will cascade delete via foreign key
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
      toast.error("删除会话失败");
      return false;
    }

    if (session?.id === sessionId) {
      setSession(null);
      setMessages([]);
    }

    await loadSessions();
    return true;
  }, [session, loadSessions]);

  // Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, loadSessions]);

  return {
    session,
    sessions,
    messages,
    isLoading,
    createSession,
    loadSession,
    loadSessions,
    addMessage,
    updateLastAssistantMessage,
    deleteSession,
    setMessages,
  };
}
