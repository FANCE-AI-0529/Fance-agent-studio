import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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
  created_at: string;
}

export function useEarningsDetails(limit: number = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["earnings-details", user?.id, limit],
    queryFn: async (): Promise<EarningRecord[]> => {
      // Return empty array - actual data would come from creator_earnings table
      return [];
    },
    enabled: !!user?.id,
  });
}

