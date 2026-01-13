import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useTokenWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch wallet info
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["token-wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;

      let { data, error } = await supabase
        .from("token_wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from("token_wallets")
          .insert({ user_id: user.id, balance: 100 })
          .select()
          .single();

        if (createError) throw createError;

        await supabase.from("token_transactions").insert({
          user_id: user.id,
          transaction_type: "bonus",
          amount: 100,
          balance_before: 0,
          balance_after: 100,
          description: "新用户注册奖励",
        });

        data = newWallet;
      }

      return data;
    },
    enabled: !!user,
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["token-transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("token_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Create topup order
  const createTopupOrder = useMutation({
    mutationFn: async ({ packageId, paymentMethod = "stripe" }: { packageId: string; paymentMethod?: string }) => {
      const { data, error } = await supabase.functions.invoke("wallet-topup", {
        body: { action: "create_order", packageId, paymentMethod },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast.success("订单创建成功"),
    onError: (error: Error) => toast.error(`创建订单失败: ${error.message}`),
  });

  // Complete topup order
  const completeTopupOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke("wallet-topup", {
        body: { action: "complete_order", orderId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["token-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["token-transactions"] });
      toast.success(`充值成功！已到账 ${data.tokensAdded} Token`);
    },
    onError: (error: Error) => toast.error(`充值失败: ${error.message}`),
  });

  const hasEnoughBalance = useCallback((amount: number): boolean => {
    if (!wallet) return false;
    return (wallet.balance - wallet.frozen_balance) >= amount;
  }, [wallet]);

  const availableBalance = wallet ? wallet.balance - wallet.frozen_balance : 0;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["token-wallet"] });
    queryClient.invalidateQueries({ queryKey: ["token-transactions"] });
  }, [queryClient]);

  return {
    wallet,
    transactions,
    isLoading: walletLoading || transactionsLoading,
    availableBalance,
    hasEnoughBalance,
    createTopupOrder,
    completeTopupOrder,
    refresh,
  };
}
