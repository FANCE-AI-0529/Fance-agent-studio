import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";

export type Agent = Tables<"agents">;
export type AgentInsert = TablesInsert<"agents">;
export type AgentUpdate = TablesUpdate<"agents">;

export interface AgentWithSkills extends Agent {
  skills: Tables<"skills">[];
}

// Fetch user's agents
export function useMyAgents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agents", "my", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Fetch a single agent with its skills
export function useAgent(agentId: string | null) {
  return useQuery({
    queryKey: ["agents", agentId],
    queryFn: async () => {
      if (!agentId) return null;

      // Fetch agent
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (agentError) throw agentError;

      // Fetch agent's skills
      const { data: agentSkills, error: skillsError } = await supabase
        .from("agent_skills")
        .select("skill_id")
        .eq("agent_id", agentId);

      if (skillsError) throw skillsError;

      const skillIds = agentSkills.map((as) => as.skill_id);

      if (skillIds.length === 0) {
        return { ...agent, skills: [] } as AgentWithSkills;
      }

      const { data: skills, error: fetchSkillsError } = await supabase
        .from("skills")
        .select("*")
        .in("id", skillIds);

      if (fetchSkillsError) throw fetchSkillsError;

      return { ...agent, skills: skills || [] } as AgentWithSkills;
    },
    enabled: !!agentId,
  });
}

// Create a new agent
export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (agent: Omit<AgentInsert, "author_id">) => {
      if (!user) throw new Error("用户未登录");

      const { data, error } = await supabase
        .from("agents")
        .insert({ ...agent, author_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    },
  });
}

// Update an agent
export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AgentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("agents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    },
  });
}

// Save agent with skills
export function useSaveAgentWithSkills() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      agent,
      skillIds,
      manifest,
    }: {
      agent: Omit<AgentInsert, "author_id"> & { id?: string };
      skillIds: string[];
      manifest: Json;
    }) => {
      if (!user) throw new Error("用户未登录");

      let agentId = agent.id;

      if (agentId) {
        // Update existing agent
        const { error: updateError } = await supabase
          .from("agents")
          .update({
            name: agent.name,
            department: agent.department,
            model: agent.model,
            manifest,
          })
          .eq("id", agentId);

        if (updateError) throw updateError;

        // Remove old skill associations
        const { error: deleteError } = await supabase
          .from("agent_skills")
          .delete()
          .eq("agent_id", agentId);

        if (deleteError) throw deleteError;
      } else {
        // Create new agent
        const { data: newAgent, error: createError } = await supabase
          .from("agents")
          .insert({
            name: agent.name,
            department: agent.department,
            model: agent.model,
            manifest,
            author_id: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        agentId = newAgent.id;
      }

      // Add new skill associations
      if (skillIds.length > 0) {
        const agentSkills = skillIds.map((skillId) => ({
          agent_id: agentId!,
          skill_id: skillId,
        }));

        const { error: skillsError } = await supabase
          .from("agent_skills")
          .insert(agentSkills);

        if (skillsError) throw skillsError;
      }

      return agentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "保存成功", description: "Agent 配置已保存" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    },
  });
}

// Deploy an agent
export function useDeployAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("agents")
        .update({ status: "deployed" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "部署成功", description: `${data.name} 已部署到城市网络` });
    },
    onError: (error) => {
      toast({ title: "部署失败", description: error.message, variant: "destructive" });
    },
  });
}

// Delete an agent
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "删除成功", description: "Agent 已删除" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });
}
