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

// Fetch all deployed agents (for runtime selection)
export function useDeployedAgents() {
  return useQuery({
    queryKey: ["agents", "deployed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("status", "deployed")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
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

      // Use insert without .single() to avoid implicit ON CONFLICT
      const { data, error } = await supabase
        .from("agents")
        .insert({ ...agent, author_id: user.id })
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("创建 Agent 失败");
      const createdAgent = data[0];
      return createdAgent;
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

      // Deduplicate and filter invalid skill IDs
      const cleanSkillIds = Array.from(new Set(skillIds)).filter(
        (id) => id && typeof id === "string" && id.trim() !== ""
      );

      let agentId = agent.id;

      try {
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

          if (updateError) {
            const errMsg = `[agents.update] ${updateError.message}${updateError.details ? ` | details: ${updateError.details}` : ''}${updateError.hint ? ` | hint: ${updateError.hint}` : ''}`;
            throw new Error(errMsg);
          }

          // Remove old skill associations
          const { error: deleteError } = await supabase
            .from("agent_skills")
            .delete()
            .eq("agent_id", agentId);

          if (deleteError) {
            const errMsg = `[agent_skills.delete] ${deleteError.message}${deleteError.details ? ` | details: ${deleteError.details}` : ''}${deleteError.hint ? ` | hint: ${deleteError.hint}` : ''}`;
            throw new Error(errMsg);
          }
        } else {
          // Create new agent
          const { data: newAgentData, error: createError } = await supabase
            .from("agents")
            .insert({
              name: agent.name,
              department: agent.department,
              model: agent.model,
              manifest,
              author_id: user.id,
            })
            .select();

          if (createError) {
            const errMsg = `[agents.insert] ${createError.message}${createError.details ? ` | details: ${createError.details}` : ''}${createError.hint ? ` | hint: ${createError.hint}` : ''}`;
            throw new Error(errMsg);
          }
          if (!newAgentData || newAgentData.length === 0) {
            throw new Error("[agents.insert] 创建 Agent 失败：返回数据为空");
          }
          agentId = newAgentData[0].id;
        }

        // Add new skill associations (only if there are valid skill IDs)
        if (cleanSkillIds.length > 0) {
          const agentSkills = cleanSkillIds.map((skillId) => ({
            agent_id: agentId!,
            skill_id: skillId,
          }));

          const { error: skillsError } = await supabase
            .from("agent_skills")
            .insert(agentSkills);

          if (skillsError) {
            const errMsg = `[agent_skills.insert] ${skillsError.message}${skillsError.details ? ` | details: ${skillsError.details}` : ''}${skillsError.hint ? ` | hint: ${skillsError.hint}` : ''}`;
            throw new Error(errMsg);
          }
        }

        return agentId;
      } catch (err: any) {
        // Re-throw with preserved message
        throw err;
      }
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
      // Don't use .select().single() to avoid RLS/RETURNING issues
      const { error } = await supabase
        .from("agents")
        .update({ status: "deployed" })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "部署成功", description: "智能体已部署到城市网络" });
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
