import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "./use-toast.ts";

// Types for invite trends
interface InviteTrendData {
  date: string;
  generated_count: number;
  accepted_count: number;
  email_sent_count: number;
}

// Types for user source stats
interface UserSourceData {
  inviter_id: string;
  inviter_name: string;
  total_invites: number;
  accepted_invites: number;
  pending_invites: number;
  conversion_rate: number;
}

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

// Get invite trends data for charts
export function useInviteTrends(days: number = 14) {
  const { data: isAdmin } = useIsAdmin();

  return useQuery<InviteTrendData[]>({
    queryKey: ["invite-trends", days],
    queryFn: async () => {
      // Get all invitations from the past N days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("invitations")
        .select("created_at, status, email_sent_at")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      // Group by date
      const dateMap = new Map<string, InviteTrendData>();
      
      // Initialize all dates
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dateMap.set(dateStr, {
          date: dateStr,
          generated_count: 0,
          accepted_count: 0,
          email_sent_count: 0,
        });
      }

      // Count by date
      data?.forEach(item => {
        const dateStr = item.created_at.split("T")[0];
        const existing = dateMap.get(dateStr);
        if (existing) {
          existing.generated_count++;
          if (item.status === "accepted") {
            existing.accepted_count++;
          }
          if (item.email_sent_at) {
            existing.email_sent_count++;
          }
        }
      });

      return Array.from(dateMap.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: isAdmin === true,
  });
}

// Get user source stats (grouped by inviter)
export function useUserSourceStats() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery<UserSourceData[]>({
    queryKey: ["user-source-stats"],
    queryFn: async () => {
      // Get all invitations with inviter info
      const { data: invitations, error } = await supabase
        .from("invitations")
        .select(`
          inviter_id,
          status
        `);

      if (error) throw error;

      // Get unique inviter IDs
      const inviterIds = [...new Set(invitations?.map(i => i.inviter_id).filter(Boolean))];

      // Get profile info for inviters
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", inviterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      // Group by inviter
      const inviterMap = new Map<string, UserSourceData>();

      invitations?.forEach(inv => {
        if (!inv.inviter_id) return;

        const existing = inviterMap.get(inv.inviter_id);
        if (existing) {
          existing.total_invites++;
          if (inv.status === "accepted") {
            existing.accepted_invites++;
          } else {
            existing.pending_invites++;
          }
        } else {
          inviterMap.set(inv.inviter_id, {
            inviter_id: inv.inviter_id,
            inviter_name: profileMap.get(inv.inviter_id) || "未知用户",
            total_invites: 1,
            accepted_invites: inv.status === "accepted" ? 1 : 0,
            pending_invites: inv.status === "pending" ? 1 : 0,
            conversion_rate: 0,
          });
        }
      });

      // Calculate conversion rates
      const result = Array.from(inviterMap.values()).map(item => ({
        ...item,
        conversion_rate: item.total_invites > 0 
          ? (item.accepted_invites / item.total_invites) * 100 
          : 0,
      }));

      // Sort by total invites
      return result.sort((a, b) => b.total_invites - a.total_invites);
    },
    enabled: isAdmin === true,
  });
}

// Send invite emails mutation
interface SendEmailParams {
  emails: string[];
  inviteCodes: string[];
  customMessage?: string;
  autoGenerate?: boolean;
}

interface SendEmailResult {
  results: { email: string; success: boolean; error?: string }[];
  summary: { total: number; sent: number; failed: number };
}

export function useSendInviteEmails() {
  const queryClient = useQueryClient();

  return useMutation<SendEmailResult, Error, SendEmailParams>({
    mutationFn: async ({ emails, inviteCodes, customMessage, autoGenerate }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("send-invite-email", {
        body: {
          emails,
          inviteCodes: autoGenerate ? [] : inviteCodes,
          customMessage,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send emails");
      }

      return response.data as SendEmailResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-invite-codes"] });
      queryClient.invalidateQueries({ queryKey: ["invite-trends"] });
      queryClient.invalidateQueries({ queryKey: ["admin-invite-stats"] });
      
      toast({
        title: "邮件发送完成",
        description: `成功 ${data.summary.sent} 封，失败 ${data.summary.failed} 封`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "发送失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
