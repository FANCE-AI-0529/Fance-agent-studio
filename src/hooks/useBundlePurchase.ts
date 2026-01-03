import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Check if user has purchased a bundle
export function useIsBundlePurchased(bundleId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bundle_purchase", bundleId, user?.id],
    queryFn: async () => {
      if (!user || !bundleId) return false;

      const { data } = await supabase
        .from("bundle_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("bundle_id", bundleId)
        .eq("status", "completed")
        .maybeSingle();

      return !!data;
    },
    enabled: !!user && !!bundleId,
  });
}

// Get all user's purchased bundles
export function useMyPurchasedBundles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my_bundle_purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("bundle_purchases")
        .select(`
          id,
          bundle_id,
          amount,
          purchased_at,
          skill_bundles (
            id,
            name,
            cover_image,
            skill_ids
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Create checkout session for bundle purchase
export function useBundleCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bundleId,
      bundleName,
      bundlePrice,
    }: {
      bundleId: string;
      bundleName: string;
      bundlePrice: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("bundle-checkout", {
        body: { bundleId, bundleName, bundlePrice },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");
      }
    },
    onError: (error) => {
      toast({
        title: "支付创建失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Verify purchase after returning from Stripe
export function useVerifyPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, bundleId }: { sessionId?: string; bundleId?: string }) => {
      const { data, error } = await supabase.functions.invoke("verify-bundle-purchase", {
        body: { sessionId, bundleId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.purchased) {
        queryClient.invalidateQueries({ queryKey: ["bundle_purchase"] });
        queryClient.invalidateQueries({ queryKey: ["my_bundle_purchases"] });
        queryClient.invalidateQueries({ queryKey: ["skill_bundles"] });
        toast({
          title: "购买成功",
          description: "能力包已解锁，现在可以安装了",
        });
      }
    },
  });
}
