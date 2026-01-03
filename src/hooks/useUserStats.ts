import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserStats {
  conversationsToday: number;
  timeSavedMinutes: number;
  tasksCompleted: number;
  weeklyGrowth: number;
}

export function useUserStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async (): Promise<UserStats> => {
      if (!user?.id) {
        return {
          conversationsToday: 0,
          timeSavedMinutes: 0,
          tasksCompleted: 0,
          weeklyGrowth: 0,
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoIso = weekAgo.toISOString();

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoIso = twoWeeksAgo.toISOString();

      // Get sessions created today
      const { count: todaySessions } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayIso);

      // Get total messages count for this user (estimate time saved: ~2 min per message exchange)
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("role", "assistant")
        .in(
          "session_id",
          (await supabase.from("sessions").select("id").eq("user_id", user.id)).data?.map(s => s.id) || []
        );

      // Get completed tasks from delegated_tasks
      const { count: completedTasks } = await supabase
        .from("delegated_tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");

      // Calculate weekly growth (sessions this week vs last week)
      const { count: thisWeekSessions } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekAgoIso);

      const { count: lastWeekSessions } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", twoWeeksAgoIso)
        .lt("created_at", weekAgoIso);

      const thisWeek = thisWeekSessions || 0;
      const lastWeek = lastWeekSessions || 0;
      const weeklyGrowth = lastWeek > 0 
        ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) 
        : thisWeek > 0 ? 100 : 0;

      return {
        conversationsToday: todaySessions || 0,
        timeSavedMinutes: (totalMessages || 0) * 2, // Estimate 2 min saved per AI response
        tasksCompleted: completedTasks || 0,
        weeklyGrowth,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
  });
}
