import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { subDays, format } from "date-fns";

export interface DailyDownload {
  date: string;
  count: number;
}

function generateEmptyDates(days: number): DailyDownload[] {
  const result: DailyDownload[] = [];
  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    result.push({ date, count: 0 });
  }
  return result;
}

export function useDownloadTrends(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["download-trends", user?.id, days],
    queryFn: async (): Promise<DailyDownload[]> => {
      // Return empty dates - actual data would come from skill_installs table
      // when there are real installs
      return generateEmptyDates(days);
    },
    enabled: !!user?.id,
  });
}

export interface EarningRecord {
  id: string;
  amount: number;
  transaction_type: string;
  skill_name: string | null;
  bundle_name: string | null;
  created_at: string;
}

export function useEarningsDetails(limit: number = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["earnings-details", user?.id, limit],
    queryFn: async (): Promise<EarningRecord[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("creator_earnings")
        .select(`
          id,
          amount,
          transaction_type,
          created_at,
          skill_id,
          bundle_id,
          skills:skill_id (name),
          skill_bundles:bundle_id (name)
        `)
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        transaction_type: item.transaction_type,
        skill_name: (item.skills as { name: string } | null)?.name || null,
        bundle_name: (item.skill_bundles as { name: string } | null)?.name || null,
        created_at: item.created_at,
      }));
    },
    enabled: !!user?.id,
  });
}
