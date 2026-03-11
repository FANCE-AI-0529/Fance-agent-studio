import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "./use-toast.ts";

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  prize_description: string | null;
  start_at: string;
  end_at: string;
  status: string;
  category: string | null;
  banner_url: string | null;
  entries_count: number;
  created_by: string | null;
  created_at: string;
}

export interface ChallengeEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  agent_id: string | null;
  title: string | null;
  description: string | null;
  votes_count: number;
  rank: number | null;
  is_winner: boolean;
  created_at: string;
}

// Get all challenges
export function useChallenges(status?: string) {
  return useQuery({
    queryKey: ["challenges", status],
    queryFn: async () => {
      let query = supabase
        .from("challenges")
        .select("*")
        .order("start_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Challenge[];
    },
  });
}

// Get active challenges
export function useActiveChallenges() {
  return useQuery({
    queryKey: ["active-challenges"],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .lte("start_at", now)
        .gte("end_at", now)
        .order("end_at", { ascending: true });

      if (error) throw error;
      return data as Challenge[];
    },
  });
}

// Get challenge details
export function useChallenge(id: string) {
  return useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Challenge;
    },
    enabled: !!id,
  });
}

// Get challenge entries
export function useChallengeEntries(challengeId: string) {
  return useQuery({
    queryKey: ["challenge-entries", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_entries")
        .select("*")
        .eq("challenge_id", challengeId)
        .order("votes_count", { ascending: false });

      if (error) throw error;
      return data as ChallengeEntry[];
    },
    enabled: !!challengeId,
  });
}

// Get my entries
export function useMyChallengeEntries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-challenge-entries", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("challenge_entries")
        .select("*, challenges(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Check if user has voted for an entry
export function useHasVoted(entryId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-voted", entryId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("challenge_votes")
        .select("id")
        .eq("entry_id", entryId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!entryId,
  });
}

// Submit challenge entry
export function useSubmitEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      challengeId: string;
      title: string;
      description: string;
      agentId?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("challenge_entries")
        .insert({
          challenge_id: params.challengeId,
          user_id: user.id,
          agent_id: params.agentId,
          title: params.title,
          description: params.description,
        })
        .select()
        .single();

      if (error) throw error;

      // Update entries count manually
      const { data: challenge } = await supabase
        .from("challenges")
        .select("entries_count")
        .eq("id", params.challengeId)
        .single();

      if (challenge) {
        await supabase
          .from("challenges")
          .update({ entries_count: (challenge.entries_count || 0) + 1 })
          .eq("id", params.challengeId);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries", variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ["my-challenge-entries"] });
      queryClient.invalidateQueries({ queryKey: ["challenge", variables.challengeId] });
      toast({
        title: "提交成功",
        description: "你的作品已成功提交参赛！",
      });
    },
    onError: (error) => {
      console.error("Submit entry error:", error);
      toast({
        title: "提交失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });
}

// Vote for entry
export function useVoteEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Check if already voted
      const { data: existing } = await supabase
        .from("challenge_votes")
        .select("id")
        .eq("entry_id", entryId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Remove vote
        const { error } = await supabase
          .from("challenge_votes")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
        return { voted: false };
      } else {
        // Add vote
        const { error } = await supabase
          .from("challenge_votes")
          .insert({
            entry_id: entryId,
            user_id: user.id,
          });

        if (error) throw error;
        return { voted: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["challenge-entries"] });
      queryClient.invalidateQueries({ queryKey: ["has-voted"] });
      toast({
        title: result.voted ? "投票成功" : "已取消投票",
      });
    },
    onError: (error) => {
      console.error("Vote error:", error);
      toast({
        title: "投票失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });
}
