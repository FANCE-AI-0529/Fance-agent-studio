import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Invitation {
  id: string;
  invite_code: string;
  inviter_id: string;
  invited_email: string | null;
  invited_user_id: string | null;
  status: string;
  reward_points: number;
  created_at: string;
  accepted_at: string | null;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

// Get user's invite code (create if doesn't exist)
export function useMyInviteCode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-invite-code", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check for existing invitation
      const { data: existing } = await supabase
        .from("invitations")
        .select("invite_code")
        .eq("inviter_id", user.id)
        .is("invited_user_id", null)
        .limit(1)
        .maybeSingle();

      if (existing) return existing.invite_code;

      // Generate new invite code
      const code = generateInviteCode();
      
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          inviter_id: user.id,
          invite_code: code,
          status: "pending",
        })
        .select("invite_code")
        .single();

      if (error) throw error;
      return data.invite_code;
    },
    enabled: !!user?.id,
  });
}

// Get sent invitations
export function useSentInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sent-invitations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!user?.id,
  });
}

// Get user's points balance
export function usePointsBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["points-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { data, error } = await supabase
        .from("point_transactions")
        .select("amount")
        .eq("user_id", user.id);

      if (error) throw error;
      return data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    },
    enabled: !!user?.id,
  });
}

// Get points history
export function usePointsHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["points-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PointTransaction[];
    },
    enabled: !!user?.id,
  });
}

// Invitation stats
export function useInvitationStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invitation-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, accepted: 0, pending: 0, totalPoints: 0 };

      const { data, error } = await supabase
        .from("invitations")
        .select("status, reward_points")
        .eq("inviter_id", user.id);

      if (error) throw error;

      const total = data?.length || 0;
      const accepted = data?.filter(i => i.status === "accepted").length || 0;
      const pending = data?.filter(i => i.status === "pending").length || 0;
      const totalPoints = data?.filter(i => i.status === "accepted")
        .reduce((sum, i) => sum + (i.reward_points || 0), 0) || 0;

      return { total, accepted, pending, totalPoints };
    },
    enabled: !!user?.id,
  });
}

// Accept invitation
export function useAcceptInvitation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Find the invitation
      const { data: invitation, error: findError } = await supabase
        .from("invitations")
        .select("*")
        .eq("invite_code", inviteCode)
        .eq("status", "pending")
        .is("invited_user_id", null)
        .single();

      if (findError || !invitation) {
        throw new Error("邀请码无效或已被使用");
      }

      if (invitation.inviter_id === user.id) {
        throw new Error("不能使用自己的邀请码");
      }

      // Update invitation
      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          invited_user_id: user.id,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          reward_points: 100,
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // Award points to inviter
      await supabase.from("point_transactions").insert({
        user_id: invitation.inviter_id,
        amount: 100,
        transaction_type: "invite_reward",
        description: "邀请好友奖励",
        reference_id: invitation.id,
      });

      // Award points to invitee
      await supabase.from("point_transactions").insert({
        user_id: user.id,
        amount: 50,
        transaction_type: "invited_bonus",
        description: "受邀注册奖励",
        reference_id: invitation.id,
      });

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points-balance"] });
      queryClient.invalidateQueries({ queryKey: ["points-history"] });
      toast({
        title: "邀请码已使用",
        description: "恭喜获得 50 积分奖励！",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "使用失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Helper function to generate invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
