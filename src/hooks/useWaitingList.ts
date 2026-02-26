import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useAdminInvite";
import { toast } from "@/hooks/use-toast";

export interface WaitingListEntry {
  id: string;
  email: string;
  source: string | null;
  status: string | null;
  created_at: string | null;
  invited_at: string | null;
  metadata: any;
}

export function useWaitingList() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["waiting-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiting_list")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WaitingListEntry[];
    },
    enabled: isAdmin === true,
  });
}

export function useWaitingListStats() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["waiting-list-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiting_list")
        .select("status, source, created_at");

      if (error) throw error;

      const total = data?.length || 0;
      const pending = data?.filter(i => i.status === "pending").length || 0;
      const invited = data?.filter(i => i.status === "invited").length || 0;
      const registered = data?.filter(i => i.status === "registered").length || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = data?.filter(i => i.created_at && new Date(i.created_at) >= today).length || 0;

      const heroCount = data?.filter(i => i.source === "hero_cta").length || 0;
      const bottomCount = data?.filter(i => i.source === "bottom_cta").length || 0;

      return { total, pending, invited, registered, todayCount, heroCount, bottomCount };
    },
    enabled: isAdmin === true,
  });
}

export function useUpdateWaitingListStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const updateData: any = { status };
      if (status === "invited") {
        updateData.invited_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("waiting_list")
        .update(updateData)
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-list-stats"] });
      toast({ title: "状态更新成功" });
    },
    onError: (error: Error) => {
      toast({ title: "更新失败", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteWaitingListEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("waiting_list")
        .delete()
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-list-stats"] });
      toast({ title: "删除成功" });
    },
    onError: (error: Error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });
}

export function useSendInviteToWaitingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emails, customMessage }: { emails: string[]; customMessage?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-invite-email", {
        body: {
          emails,
          inviteCodes: [], // auto-generate
          customMessage,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send emails");
      }

      // Mark as invited in waiting list
      await supabase
        .from("waiting_list")
        .update({ status: "invited", invited_at: new Date().toISOString() })
        .in("email", emails);

      return response.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-list-stats"] });
      toast({
        title: "邀请发送完成",
        description: `成功 ${data?.summary?.sent || 0} 封，失败 ${data?.summary?.failed || 0} 封`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "发送失败", description: error.message, variant: "destructive" });
    },
  });
}
