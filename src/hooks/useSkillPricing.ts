import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PricingModel, BulkDiscount } from "@/types/economy";

export function useSkillPricing(skillId: string | null) {
  const queryClient = useQueryClient();

  const { data: pricing, isLoading } = useQuery({
    queryKey: ["skill-pricing", skillId],
    queryFn: async () => {
      if (!skillId) return null;
      const { data, error } = await supabase
        .from("skill_pricing")
        .select("*")
        .eq("skill_id", skillId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!skillId,
  });

  const updatePricing = useMutation({
    mutationFn: async ({
      pricingModel,
      pricePerCall,
      monthlyPrice,
      yearlyPrice,
      oneTimePrice,
      trialCalls,
      bulkDiscounts,
      creatorShare = 0.7,
    }: {
      pricingModel: PricingModel;
      pricePerCall?: number;
      monthlyPrice?: number;
      yearlyPrice?: number;
      oneTimePrice?: number;
      trialCalls?: number;
      bulkDiscounts?: BulkDiscount[];
      creatorShare?: number;
    }) => {
      if (!skillId) throw new Error("Skill ID required");

      const upsertData = {
        skill_id: skillId,
        pricing_model: pricingModel,
        price_per_call: pricePerCall || 0,
        monthly_price: monthlyPrice,
        yearly_price: yearlyPrice,
        one_time_price: oneTimePrice,
        trial_calls: trialCalls || 0,
        bulk_discounts: bulkDiscounts || [],
        creator_share: creatorShare,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("skill_pricing")
        .upsert(upsertData as any, { onConflict: "skill_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-pricing", skillId] });
      toast.success("定价设置已保存");
    },
    onError: (error: Error) => toast.error(`保存定价失败: ${error.message}`),
  });

  const deletePricing = useMutation({
    mutationFn: async () => {
      if (!skillId) throw new Error("Skill ID required");
      const { error } = await supabase.from("skill_pricing").delete().eq("skill_id", skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-pricing", skillId] });
      toast.success("已恢复为免费技能");
    },
    onError: (error: Error) => toast.error(`操作失败: ${error.message}`),
  });

  return {
    pricing,
    isLoading,
    updatePricing,
    deletePricing,
    isPaid: pricing && pricing.pricing_model !== "free",
  };
}

export function useSkillsPricing(skillIds: string[]) {
  return useQuery({
    queryKey: ["skills-pricing", skillIds],
    queryFn: async () => {
      if (!skillIds.length) return {};
      const { data, error } = await supabase
        .from("skill_pricing")
        .select("*")
        .in("skill_id", skillIds)
        .eq("is_active", true);
      if (error) throw error;
      const pricingMap: Record<string, typeof data[0]> = {};
      data?.forEach((p) => { pricingMap[p.skill_id] = p; });
      return pricingMap;
    },
    enabled: skillIds.length > 0,
  });
}
