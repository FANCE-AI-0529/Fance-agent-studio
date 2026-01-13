import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Memory {
  id: string;
  userId: string;
  agentId?: string;
  memoryType: "preference" | "fact" | "context";
  key: string;
  value: string;
  importance: number;
  source: "user_stated" | "inferred" | "system";
  lastAccessed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function useUserMemories(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-memories", user?.id, agentId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("user_memories")
        .select("*")
        .eq("user_id", user.id)
        .order("importance", { ascending: false })
        .order("last_accessed", { ascending: false });

      if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching memories:", error);
        return [];
      }

      return data.map((m) => ({
        id: m.id,
        userId: m.user_id,
        agentId: m.agent_id || undefined,
        memoryType: m.memory_type as Memory["memoryType"],
        key: m.key,
        value: m.value,
        importance: m.importance,
        source: m.source as Memory["source"],
        lastAccessed: new Date(m.last_accessed),
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.updated_at),
      })) as Memory[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useAddMemory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (memory: {
      agentId?: string;
      memoryType: Memory["memoryType"];
      key: string;
      value: string;
      importance?: number;
      source?: Memory["source"];
    }) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("user_memories")
        .insert({
          user_id: user.id,
          agent_id: memory.agentId,
          memory_type: memory.memoryType,
          key: memory.key,
          value: memory.value,
          importance: memory.importance ?? 5,
          source: memory.source ?? "user_stated",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
    },
  });
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: {
      id: string;
      key?: string;
      value?: string;
      importance?: number;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (update.key !== undefined) updateData.key = update.key;
      if (update.value !== undefined) updateData.value = update.value;
      if (update.importance !== undefined) updateData.importance = update.importance;

      const { error } = await supabase
        .from("user_memories")
        .update(updateData)
        .eq("id", update.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_memories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
    },
  });
}

export function useAccessMemory() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_memories")
        .update({ last_accessed: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
  });
}

// Generate context string from memories for AI
export function useMemoryContext(agentId?: string, manusFiles?: { filePath: string; content: string }[]) {
  const { data: memories = [] } = useUserMemories(agentId);

  const generateContext = () => {
    const hasMemories = memories.length > 0;
    const hasManusFiles = manusFiles && manusFiles.length > 0;
    
    if (!hasMemories && !hasManusFiles) return "";

    let context = "";

    // Add user memories section
    if (hasMemories) {
      const grouped = {
        preference: memories.filter((m) => m.memoryType === "preference"),
        fact: memories.filter((m) => m.memoryType === "fact"),
        context: memories.filter((m) => m.memoryType === "context"),
      };

      context += "## 用户记忆信息\n\n";

      if (grouped.preference.length > 0) {
        context += "### 用户偏好\n";
        grouped.preference.forEach((m) => {
          context += `- ${m.key}: ${m.value}\n`;
        });
        context += "\n";
      }

      if (grouped.fact.length > 0) {
        context += "### 重要事实\n";
        grouped.fact.forEach((m) => {
          context += `- ${m.key}: ${m.value}\n`;
        });
        context += "\n";
      }

      if (grouped.context.length > 0) {
        context += "### 对话上下文\n";
        grouped.context.forEach((m) => {
          context += `- ${m.key}: ${m.value}\n`;
        });
        context += "\n";
      }
    }

    // Add Manus kernel files section
    if (hasManusFiles) {
      context += "\n## 智能体工作状态\n\n";
      
      for (const file of manusFiles) {
        const fileName = file.filePath.split("/").pop() || file.filePath;
        context += `### ${fileName}\n`;
        // Only include first 500 chars of each file to avoid context overflow
        const truncatedContent = file.content.length > 500 
          ? file.content.slice(0, 500) + "\n...(truncated)"
          : file.content;
        context += `${truncatedContent}\n\n`;
      }
    }

    return context;
  };

  return {
    memories,
    generateContext,
    hasMemories: memories.length > 0,
    hasManusFiles: manusFiles && manusFiles.length > 0,
  };
}
