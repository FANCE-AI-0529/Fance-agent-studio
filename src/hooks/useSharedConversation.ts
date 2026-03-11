import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";

export interface SharedConversation {
  id: string;
  shareToken: string;
  sessionId: string;
  userId: string;
  title?: string;
  preview?: string;
  agentName?: string;
  agentAvatar?: Record<string, unknown>;
  messageCount: number;
  viewCount: number;
  includeUserMessages: boolean;
  isPublic: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface SharedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function useMySharedConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-shared-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("shared_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching shared conversations:", error);
        return [];
      }

      return data.map((s) => ({
        id: s.id,
        shareToken: s.share_token,
        sessionId: s.session_id,
        userId: s.user_id,
        title: s.title || undefined,
        preview: s.preview || undefined,
        agentName: s.agent_name || undefined,
        agentAvatar: s.agent_avatar as Record<string, unknown> | undefined,
        messageCount: s.message_count,
        viewCount: s.view_count,
        includeUserMessages: s.include_user_messages,
        isPublic: s.is_public,
        expiresAt: s.expires_at ? new Date(s.expires_at) : undefined,
        createdAt: new Date(s.created_at),
      })) as SharedConversation[];
    },
    enabled: !!user,
  });
}

export function useSharedConversation(shareToken: string) {
  return useQuery({
    queryKey: ["shared-conversation", shareToken],
    queryFn: async () => {
      // Get shared conversation info
      const { data: shared, error: sharedError } = await supabase
        .from("shared_conversations")
        .select("*")
        .eq("share_token", shareToken)
        .eq("is_public", true)
        .single();

      if (sharedError) {
        console.error("Error fetching shared conversation:", sharedError);
        return null;
      }

      // Check expiration
      if (shared.expires_at && new Date(shared.expires_at) < new Date()) {
        return null;
      }

      // Increment view count (fire and forget)
      supabase.rpc("increment_share_view_count", { p_share_token: shareToken });

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", shared.session_id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        return null;
      }

      // Filter messages based on settings
      const filteredMessages = messages
        .filter((m) => {
          if (!shared.include_user_messages && m.role === "user") return false;
          return m.role === "user" || m.role === "assistant";
        })
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at),
        }));

      return {
        info: {
          id: shared.id,
          shareToken: shared.share_token,
          sessionId: shared.session_id,
          title: shared.title,
          preview: shared.preview,
          agentName: shared.agent_name,
          agentAvatar: shared.agent_avatar as Record<string, unknown> | undefined,
          messageCount: shared.message_count,
          viewCount: shared.view_count + 1,
          createdAt: new Date(shared.created_at),
        },
        messages: filteredMessages as SharedMessage[],
      };
    },
    enabled: !!shareToken,
  });
}

export function useCreateSharedConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      title,
      agentName,
      agentAvatar,
      includeUserMessages = true,
      expiresInDays,
    }: {
      sessionId: string;
      title?: string;
      agentName?: string;
      agentAvatar?: Record<string, unknown>;
      includeUserMessages?: boolean;
      expiresInDays?: number;
    }) => {
      if (!user) throw new Error("Must be logged in");

      // Get messages for preview and count
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      const messageCount = messages?.length || 0;
      const firstAssistantMessage = messages?.find((m) => m.role === "assistant");
      const preview = firstAssistantMessage?.content?.slice(0, 200);

      // Generate share token
      const { data: tokenResult } = await supabase.rpc("generate_conversation_share_token");
      const shareToken = tokenResult as string;

      // Calculate expiration
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const insertData: Record<string, unknown> = {
        share_token: shareToken,
        session_id: sessionId,
        user_id: user.id,
        title,
        preview,
        agent_name: agentName,
        agent_avatar: agentAvatar as object | null,
        message_count: messageCount,
        include_user_messages: includeUserMessages,
        expires_at: expiresAt,
      };

      const { data, error } = await supabase
        .from("shared_conversations")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        shareUrl: `${globalThis.location.origin}/conversation/${shareToken}`,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-shared-conversations"] });
    },
  });
}

export function useDeleteSharedConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shared_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-shared-conversations"] });
    },
  });
}
