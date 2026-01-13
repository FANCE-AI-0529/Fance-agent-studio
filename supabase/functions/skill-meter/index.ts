import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeteringRequest {
  skillId: string;
  userId: string;
  agentId?: string;
  executionId?: string;
}

interface MeteringResult {
  charged: boolean;
  amount: number;
  creatorEarnings: number;
  platformFee: number;
  error?: string;
  subscription?: boolean;
  owned?: boolean;
  balanceAfter?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { skillId, userId, agentId, executionId }: MeteringRequest = await req.json();

    if (!skillId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing skillId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get skill pricing info
    const { data: pricing, error: pricingError } = await supabase
      .from("skill_pricing")
      .select(`
        *,
        skill:skills(id, name, author_id)
      `)
      .eq("skill_id", skillId)
      .eq("is_active", true)
      .maybeSingle();

    // If no pricing found or free, no charge
    if (!pricing || pricing.pricing_model === "free") {
      return new Response(
        JSON.stringify({ charged: false, amount: 0, creatorEarnings: 0, platformFee: 0 } as MeteringResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check subscription status for subscription model
    if (pricing.pricing_model === "subscription") {
      const { data: subscription } = await supabase
        .from("skill_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("skill_id", skillId)
        .eq("status", "active")
        .gte("current_period_end", new Date().toISOString())
        .maybeSingle();

      if (subscription) {
        return new Response(
          JSON.stringify({ charged: false, subscription: true, amount: 0, creatorEarnings: 0, platformFee: 0 } as MeteringResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Check one-time purchase
    if (pricing.pricing_model === "one_time") {
      const { data: install } = await supabase
        .from("skill_installs")
        .select("*")
        .eq("user_id", userId)
        .eq("skill_id", skillId)
        .maybeSingle();

      // Check if user has paid for this skill (using metadata or a flag)
      if (install) {
        return new Response(
          JSON.stringify({ charged: false, owned: true, amount: 0, creatorEarnings: 0, platformFee: 0 } as MeteringResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Calculate charge amount
    let chargeAmount = pricing.price_per_call || 0;

    // Check for trial calls
    if (pricing.trial_calls && pricing.trial_calls > 0) {
      const { count } = await supabase
        .from("skill_usage_records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("skill_id", skillId);

      if ((count || 0) < pricing.trial_calls) {
        return new Response(
          JSON.stringify({ charged: false, amount: 0, creatorEarnings: 0, platformFee: 0, trial: true } as MeteringResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Check user balance
    const { data: wallet } = await supabase
      .from("token_wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const availableBalance = wallet ? wallet.balance - wallet.frozen_balance : 0;

    if (availableBalance < chargeAmount) {
      return new Response(
        JSON.stringify({
          error: "INSUFFICIENT_BALANCE",
          required: chargeAmount,
          available: availableBalance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Calculate revenue split
    const creatorShare = Number(pricing.creator_share) || 0.7;
    const creatorEarnings = Math.floor(chargeAmount * creatorShare);
    const platformFee = chargeAmount - creatorEarnings;

    // 7. Process payment using database function
    const { data: paymentResult, error: paymentError } = await supabase.rpc(
      "process_skill_payment",
      {
        p_user_id: userId,
        p_skill_id: skillId,
        p_creator_id: pricing.skill.author_id,
        p_amount: chargeAmount,
        p_creator_share: creatorEarnings,
        p_platform_fee: platformFee,
        p_execution_id: executionId,
        p_pricing_model: pricing.pricing_model,
      }
    );

    if (paymentError) {
      console.error("Payment error:", paymentError);
      return new Response(
        JSON.stringify({ error: "PAYMENT_FAILED", details: paymentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!paymentResult?.success) {
      return new Response(
        JSON.stringify({ error: paymentResult?.error || "PAYMENT_FAILED" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: MeteringResult = {
      charged: true,
      amount: chargeAmount,
      creatorEarnings,
      platformFee,
      balanceAfter: paymentResult.balance_after,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Skill meter error:", error);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
