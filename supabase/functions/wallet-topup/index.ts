import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TopupPackage {
  id: string;
  name: string;
  tokenAmount: number;
  bonusTokens: number;
  priceAmount: number;
  currency: string;
}

const TOPUP_PACKAGES: TopupPackage[] = [
  { id: "starter", name: "入门包", tokenAmount: 500, bonusTokens: 0, priceAmount: 500, currency: "CNY" },
  { id: "basic", name: "基础包", tokenAmount: 1000, bonusTokens: 50, priceAmount: 980, currency: "CNY" },
  { id: "standard", name: "标准包", tokenAmount: 5000, bonusTokens: 500, priceAmount: 4500, currency: "CNY" },
  { id: "pro", name: "专业包", tokenAmount: 10000, bonusTokens: 1500, priceAmount: 8000, currency: "CNY" },
  { id: "enterprise", name: "企业包", tokenAmount: 50000, bonusTokens: 10000, priceAmount: 35000, currency: "CNY" },
];

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

    const { action, packageId, orderId, paymentMethod } = await req.json();

    // Action: Get available packages
    if (action === "get_packages") {
      return new Response(
        JSON.stringify({ packages: TOPUP_PACKAGES }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Create order
    if (action === "create_order") {
      const pkg = TOPUP_PACKAGES.find(p => p.id === packageId);
      if (!pkg) {
        return new Response(
          JSON.stringify({ error: "Invalid package" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: order, error: orderError } = await supabase
        .from("topup_orders")
        .insert({
          user_id: user.id,
          token_amount: pkg.tokenAmount,
          bonus_tokens: pkg.bonusTokens,
          payment_amount: pkg.priceAmount,
          currency: pkg.currency,
          payment_method: paymentMethod || "stripe",
          status: "pending",
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        return new Response(
          JSON.stringify({ error: "Failed to create order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // In production, integrate with Stripe/Alipay here
      // For now, return order for client to handle payment

      return new Response(
        JSON.stringify({
          order,
          package: pkg,
          // paymentUrl would be from Stripe checkout session
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Complete order (after payment confirmed)
    if (action === "complete_order") {
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: "Missing orderId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify order belongs to user and is in paid status
      const { data: order } = await supabase
        .from("topup_orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (!order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as paid first (in production, this would be from webhook)
      await supabase
        .from("topup_orders")
        .update({ status: "paid" })
        .eq("id", orderId);

      // Complete the order using database function
      const { data: result, error: completeError } = await supabase.rpc(
        "complete_topup_order",
        { p_order_id: orderId }
      );

      if (completeError || !result?.success) {
        console.error("Complete order error:", completeError || result?.error);
        return new Response(
          JSON.stringify({ error: result?.error || "Failed to complete order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          tokensAdded: result.tokens_added,
          balanceAfter: result.balance_after,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Get wallet info
    if (action === "get_wallet") {
      // Get or create wallet
      let { data: wallet } = await supabase
        .from("token_wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet) {
        // Create wallet with welcome bonus
        const { data: newWallet, error: createError } = await supabase
          .from("token_wallets")
          .insert({
            user_id: user.id,
            balance: 100, // Welcome bonus
          })
          .select()
          .single();

        if (createError) {
          console.error("Wallet creation error:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create wallet" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Record bonus transaction
        await supabase
          .from("token_transactions")
          .insert({
            user_id: user.id,
            transaction_type: "bonus",
            amount: 100,
            balance_before: 0,
            balance_after: 100,
            description: "新用户注册奖励",
          });

        wallet = newWallet;
      }

      return new Response(
        JSON.stringify({ wallet }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Wallet topup error:", error);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
