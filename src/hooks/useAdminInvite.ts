import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Check if user is admin
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
  });
}

// Get all invite codes (admin only)
export function useAllInviteCodes() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["all-invite-codes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isAdmin === true,
  });
}

// Generate invite code helper
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface BatchGenerateOptions {
  count: number;
  expiresInDays?: number | null; // null means no expiration
}

// Batch generate invite codes
export function useBatchGenerateInviteCodes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ count, expiresInDays }: BatchGenerateOptions) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (count < 1 || count > 100) throw new Error("数量必须在 1-100 之间");

      const codes: string[] = [];
      const insertData = [];

      // Calculate expiration date
      let expiresAt: string | null = null;
      if (expiresInDays && expiresInDays > 0) {
        const date = new Date();
        date.setDate(date.getDate() + expiresInDays);
        expiresAt = date.toISOString();
      }

      // Generate unique codes
      for (let i = 0; i < count; i++) {
        let code: string;
        do {
          code = generateInviteCode();
        } while (codes.includes(code));
        
        codes.push(code);
        insertData.push({
          inviter_id: user.id,
          invite_code: code,
          status: "pending",
          expires_at: expiresAt,
        });
      }

      // Insert all codes
      const { data, error } = await supabase
        .from("invitations")
        .insert(insertData)
        .select();

      if (error) throw error;
      return { codes, data };
    },
    onSuccess: ({ codes }) => {
      queryClient.invalidateQueries({ queryKey: ["all-invite-codes"] });
      queryClient.invalidateQueries({ queryKey: ["sent-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["invitation-stats"] });
      toast({
        title: "生成成功",
        description: `已生成 ${codes.length} 个邀请码`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "生成失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete unused invite code
export function useDeleteInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", inviteId)
        .eq("status", "pending")
        .is("invited_user_id", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-invite-codes"] });
      queryClient.invalidateQueries({ queryKey: ["sent-invitations"] });
      toast({ title: "已删除邀请码" });
    },
    onError: () => {
      toast({
        title: "删除失败",
        description: "只能删除未使用的邀请码",
        variant: "destructive",
      });
    },
  });
}

// Get invite stats for admin
export function useAdminInviteStats() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["admin-invite-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("status, created_at");

      if (error) throw error;

      const total = data?.length || 0;
      const pending = data?.filter(i => i.status === "pending").length || 0;
      const accepted = data?.filter(i => i.status === "accepted").length || 0;
      
      // Get today's count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = data?.filter(i => new Date(i.created_at) >= today).length || 0;

      return { total, pending, accepted, todayCount };
    },
    enabled: isAdmin === true,
  });
}
