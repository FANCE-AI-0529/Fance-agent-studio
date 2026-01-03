import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function useAgentClone() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (sourceAgentId: string) => {
      if (!user) {
        throw new Error("请先登录后再复刻");
      }

      const { data, error } = await supabase.rpc("clone_agent", {
        source_id: sourceAgentId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (newAgentId) => {
      queryClient.invalidateQueries({ queryKey: ["my-agents"] });
      queryClient.invalidateQueries({ queryKey: ["trending-agents"] });
      toast.success("复刻成功！正在跳转到编辑页面...");
      navigate(`/builder/${newAgentId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "复刻失败，请重试");
    },
  });
}
