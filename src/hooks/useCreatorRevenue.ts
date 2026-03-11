import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext.tsx";
import type { PayoutMethod } from "../types/economy.ts";

export function useCreatorRevenue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["creator-revenue-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("revenue-settle", {
        body: { action: "get_summary" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.summary;
    },
    enabled: !!user,
  });

  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ["creator-settlements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("revenue-settle", {
        body: { action: "get_settlements" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.settlements || [];
    },
    enabled: !!user,
  });

  const { data: skillStats } = useQuery({
    queryKey: ["creator-skill-stats", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: skills } = await supabase.from("skills").select("id, name").eq("author_id", user.id);
      if (!skills?.length) return [];

      const skillIds = skills.map((s) => s.id);
      const { data: usageRecords } = await supabase
        .from("skill_usage_records")
        .select("skill_id, tokens_charged, creator_earnings, success, user_id")
        .in("skill_id", skillIds);

      const statsMap = new Map<string, { skillId: string; totalCalls: number; successfulCalls: number; totalTokensCharged: number; totalCreatorEarnings: number; uniqueUsers: Set<string> }>();

      usageRecords?.forEach((record) => {
        const existing = statsMap.get(record.skill_id) || {
          skillId: record.skill_id,
          totalCalls: 0,
          successfulCalls: 0,
          totalTokensCharged: 0,
          totalCreatorEarnings: 0,
          uniqueUsers: new Set<string>(),
        };
        existing.totalCalls++;
        if (record.success) existing.successfulCalls++;
        existing.totalTokensCharged += record.tokens_charged;
        existing.totalCreatorEarnings += record.creator_earnings;
        existing.uniqueUsers.add(record.user_id);
        statsMap.set(record.skill_id, existing);
      });

      return Array.from(statsMap.values()).map((stat) => ({
        ...stat,
        skillName: skills.find((s) => s.id === stat.skillId)?.name || "Unknown",
        uniqueUsers: stat.uniqueUsers.size,
        averageTokensPerCall: stat.totalCalls > 0 ? Math.round(stat.totalTokensCharged / stat.totalCalls) : 0,
      }));
    },
    enabled: !!user,
  });

  const requestWithdrawal = useMutation({
    mutationFn: async ({ amount, payoutMethod, payoutDetails }: { amount: number; payoutMethod: PayoutMethod; payoutDetails: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke("revenue-settle", {
        body: { action: "request_withdrawal", amount, payoutMethod, payoutDetails },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["creator-revenue-summary"] });
      queryClient.invalidateQueries({ queryKey: ["creator-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["token-wallet"] });
      toast.success(`提现申请已提交！预计到账 ¥${data.settlement.currencyAmount.toFixed(2)}`);
    },
    onError: (error: Error) => toast.error(`提现失败: ${error.message}`),
  });

  const canWithdraw = summary ? (summary.availableBalance || 0) >= (summary.minWithdrawal || 1000) : false;

  return { summary, settlements, skillStats, isLoading: summaryLoading || settlementsLoading, requestWithdrawal, canWithdraw };
}
