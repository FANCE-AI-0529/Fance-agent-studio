import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSessionContext } from "@supabase/auth-helpers-react";
import type { MeteringResult } from "@/types/economy";

export class InsufficientBalanceError extends Error {
  required: number;
  available: number;

  constructor(required: number, available: number) {
    super("Insufficient balance");
    this.name = "InsufficientBalanceError";
    this.required = required;
    this.available = available;
  }
}

export function useSkillMetering() {
  const { session } = useSessionContext();
  const user = session?.user;
  const queryClient = useQueryClient();

  const meterSkillCall = useMutation({
    mutationFn: async ({ skillId, agentId, executionId }: { skillId: string; agentId?: string; executionId?: string }): Promise<MeteringResult> => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("skill-meter", {
        body: { skillId, userId: user.id, agentId, executionId },
      });

      if (error) throw error;
      if (data.error === "INSUFFICIENT_BALANCE") {
        throw new InsufficientBalanceError(data.required, data.available);
      }
      if (data.error) throw new Error(data.error);

      return data as MeteringResult;
    },
    onSuccess: (data) => {
      if (data.charged) {
        queryClient.invalidateQueries({ queryKey: ["token-wallet"] });
        queryClient.invalidateQueries({ queryKey: ["token-transactions"] });
      }
    },
    onError: (error) => {
      if (error instanceof InsufficientBalanceError) {
        toast.error(`余额不足！需要 ${error.required} Token，当前可用 ${error.available} Token`);
      }
    },
  });

  const canAffordSkill = async (skillId: string) => {
    if (!user) return { canAfford: false, price: 0, balance: 0, pricingModel: "free" };

    const { data: pricing } = await supabase
      .from("skill_pricing")
      .select("*")
      .eq("skill_id", skillId)
      .eq("is_active", true)
      .maybeSingle();

    if (!pricing || pricing.pricing_model === "free") {
      return { canAfford: true, price: 0, balance: 0, pricingModel: "free" };
    }

    const { data: wallet } = await supabase
      .from("token_wallets")
      .select("balance, frozen_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const availableBalance = wallet ? wallet.balance - wallet.frozen_balance : 0;
    const price = pricing.price_per_call || 0;

    return { canAfford: availableBalance >= price, price, balance: availableBalance, pricingModel: pricing.pricing_model };
  };

  return { meterSkillCall, canAffordSkill, isMetering: meterSkillCall.isPending };
}
