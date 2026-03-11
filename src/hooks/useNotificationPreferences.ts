import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "./use-toast.ts";
import type { Json } from "../integrations/supabase/types.ts";

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  marketing: boolean;
}

const defaultPreferences: NotificationPreferences = {
  push: true,
  email: true,
  marketing: false,
};

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return defaultPreferences;

      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching notification preferences:", error);
        return defaultPreferences;
      }

      return (data?.notification_preferences as unknown as NotificationPreferences) || defaultPreferences;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: JSON.parse(JSON.stringify(preferences)) })
        .eq("id", user.id);

      if (error) throw error;
      return preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
      toast({
        title: "设置已保存",
        description: "通知偏好已更新",
      });
    },
    onError: (error) => {
      console.error("Error updating notification preferences:", error);
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });
}
