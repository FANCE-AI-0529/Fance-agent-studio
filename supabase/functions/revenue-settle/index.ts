import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_WITHDRAWAL_AMOUNT = 1000; // Minimum tokens to withdraw
const TOKEN_TO_CNY_RATE = 0.01; // 1 Token = ¥0.01

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, amount, payoutMethod, payoutDetails } = await req.json();

    // Action: Get creator revenue summary
    if (action === "get_summary") {
      // Get wallet
      const { data: wallet } = await supabase
        .from("token_wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Get earnings stats
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // This month earnings
      const { data: thisMonthEarnings } = await supabase
        .from("skill_usage_records")
        .select("creator_earnings, skill_id")
        .eq("user_id", user.id)
        .gte("created_at", thisMonthStart.toISOString());

      // Last month earnings  
      const { data: lastMonthEarnings } = await supabase
        .from("skill_usage_records")
        .select("creator_earnings")
        .eq("user_id", user.id)
        .gte("created_at", lastMonthStart.toISOString())
        .lt("created_at", lastMonthEnd.toISOString());

      // Pending settlements
      const { data: pendingSettlements } = await supabase
        .from("revenue_settlements")
        .select("net_amount")
        .eq("creator_id", user.id)
        .in("status", ["pending", "processing"]);

      // Top earning skills
      const skillEarningsMap = new Map<string, number>();
      thisMonthEarnings?.forEach(record => {
        const current = skillEarningsMap.get(record.skill_id) || 0;
        skillEarningsMap.set(record.skill_id, current + record.creator_earnings);
      });

      const topSkillIds = Array.from(skillEarningsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      const { data: topSkills } = await supabase
        .from("skills")
        .select("id, name")
        .in("id", topSkillIds.length > 0 ? topSkillIds : ["00000000-0000-0000-0000-000000000000"]);

      const topEarningSkills = topSkillIds.map(id => ({
        skillId: id,
        skillName: topSkills?.find(s => s.id === id)?.name || "Unknown",
        earnings: skillEarningsMap.get(id) || 0,
      }));

      const summary = {
        totalEarnings: wallet?.lifetime_earned || 0,
        availableBalance: wallet?.balance || 0,
        pendingSettlement: pendingSettlements?.reduce((sum, s) => sum + s.net_amount, 0) || 0,
        thisMonthEarnings: thisMonthEarnings?.reduce((sum, r) => sum + r.creator_earnings, 0) || 0,
        lastMonthEarnings: lastMonthEarnings?.reduce((sum, r) => sum + r.creator_earnings, 0) || 0,
        topEarningSkills,
        minWithdrawal: MIN_WITHDRAWAL_AMOUNT,
        exchangeRate: TOKEN_TO_CNY_RATE,
      };

      return new Response(
        JSON.stringify({ summary }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Request withdrawal
    if (action === "request_withdrawal") {
      if (!amount || amount < MIN_WITHDRAWAL_AMOUNT) {
        return new Response(
          JSON.stringify({ error: "MINIMUM_NOT_MET", minimum: MIN_WITHDRAWAL_AMOUNT }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check balance
      const { data: wallet } = await supabase
        .from("token_wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!wallet || wallet.balance < amount) {
        return new Response(
          JSON.stringify({ error: "INSUFFICIENT_BALANCE", available: wallet?.balance || 0 }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate amounts
      const platformFee = Math.floor(amount * 0.05); // 5% withdrawal fee
      const netAmount = amount - platformFee;
      const currencyAmount = netAmount * TOKEN_TO_CNY_RATE;

      // Create settlement request
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 7);

      const { data: settlement, error: settlementError } = await supabase
        .from("revenue_settlements")
        .insert({
          creator_id: user.id,
          total_tokens: amount,
          platform_fee: platformFee,
          net_amount: netAmount,
          currency_amount: currencyAmount,
          currency: "CNY",
          exchange_rate: TOKEN_TO_CNY_RATE,
          status: "pending",
          payout_method: payoutMethod,
          payout_details: payoutDetails,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (settlementError) {
        console.error("Settlement creation error:", settlementError);
        return new Response(
          JSON.stringify({ error: "Failed to create settlement request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct from wallet
      const newBalance = wallet.balance - amount;
      await supabase
        .from("token_wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      // Record transaction
      await supabase
        .from("token_transactions")
        .insert({
          user_id: user.id,
          transaction_type: "withdraw",
          amount: -amount,
          balance_before: wallet.balance,
          balance_after: newBalance,
          reference_type: "settlement",
          reference_id: settlement.id,
          description: `提现申请 ${amount} Token`,
        });

      return new Response(
        JSON.stringify({
          success: true,
          settlement: {
            id: settlement.id,
            amount,
            netAmount,
            currencyAmount,
            status: "pending",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Get settlement history
    if (action === "get_settlements") {
      const { data: settlements } = await supabase
        .from("revenue_settlements")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(
        JSON.stringify({ settlements: settlements || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Revenue settle error:", error);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
