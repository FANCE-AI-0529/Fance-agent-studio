import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LLMUsageStats {
  totalCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  successRate: number;
  avgLatency: number;
  byModel: Array<{
    model: string;
    calls: number;
    tokens: number;
    avgLatency: number;
  }>;
  byModule: Array<{
    module: string;
    calls: number;
    tokens: number;
  }>;
  recentErrors: Array<{
    model: string;
    error: string;
    createdAt: string;
  }>;
}

export function useLLMUsageStats(days: number = 30) {
  return useQuery({
    queryKey: ["llm-usage-stats", days],
    queryFn: async (): Promise<LLMUsageStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch usage logs
      const { data: logs, error } = await supabase
        .from("llm_usage_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        return {
          totalCalls: 0,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          estimatedCost: 0,
          successRate: 100,
          avgLatency: 0,
          byModel: [],
          byModule: [],
          recentErrors: [],
        };
      }

      // Calculate aggregates
      const totalCalls = logs.length;
      const successfulCalls = logs.filter(l => l.success !== false).length;
      const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
      const promptTokens = logs.reduce((sum, l) => sum + (l.prompt_tokens || 0), 0);
      const completionTokens = logs.reduce((sum, l) => sum + (l.completion_tokens || 0), 0);
      const estimatedCost = logs.reduce((sum, l) => sum + (l.estimated_cost || 0), 0);
      
      const latencies = logs.filter(l => l.latency_ms != null).map(l => l.latency_ms!);
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;

      // Group by model
      const modelStats: Record<string, { calls: number; tokens: number; totalLatency: number; latencyCount: number }> = {};
      for (const log of logs) {
        const model = log.model_name || "unknown";
        if (!modelStats[model]) {
          modelStats[model] = { calls: 0, tokens: 0, totalLatency: 0, latencyCount: 0 };
        }
        modelStats[model].calls++;
        modelStats[model].tokens += log.total_tokens || 0;
        if (log.latency_ms != null) {
          modelStats[model].totalLatency += log.latency_ms;
          modelStats[model].latencyCount++;
        }
      }

      // Group by module
      const moduleStats: Record<string, { calls: number; tokens: number }> = {};
      for (const log of logs) {
        const module = log.module_type || "unknown";
        if (!moduleStats[module]) {
          moduleStats[module] = { calls: 0, tokens: 0 };
        }
        moduleStats[module].calls++;
        moduleStats[module].tokens += log.total_tokens || 0;
      }

      // Recent errors
      const recentErrors = logs
        .filter(l => l.error_message)
        .slice(0, 5)
        .map(l => ({
          model: l.model_name,
          error: l.error_message!,
          createdAt: l.created_at,
        }));

      return {
        totalCalls,
        totalTokens,
        promptTokens,
        completionTokens,
        estimatedCost,
        successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 100,
        avgLatency,
        byModel: Object.entries(modelStats).map(([model, stats]) => ({
          model,
          calls: stats.calls,
          tokens: stats.tokens,
          avgLatency: stats.latencyCount > 0 ? stats.totalLatency / stats.latencyCount : 0,
        })),
        byModule: Object.entries(moduleStats).map(([module, stats]) => ({
          module,
          calls: stats.calls,
          tokens: stats.tokens,
        })),
        recentErrors,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
