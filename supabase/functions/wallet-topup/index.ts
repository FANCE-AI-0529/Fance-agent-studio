import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TopupPackage {
  id: string;
  name: string;
  tokenAmount: number;
  bonusTokens: number;
  priceAmount: number; // in cents (分)
  currency: string;
}

// Token packages - prices in cents (分)
const TOPUP_PACKAGES: TopupPackage[] = [
  { id: "starter", name: "入门包", tokenAmount: 500, bonusTokens: 0, priceAmount: 990, currency: "CNY" },
  { id: "basic", name: "基础包", tokenAmount: 1000, bonusTokens: 100, priceAmount: 1900, currency: "CNY" },
  { id: "popular", name: "热门包", tokenAmount: 3000, bonusTokens: 500, priceAmount: 4900, currency: "CNY" },
  { id: "pro", name: "专业包", tokenAmount: 10000, bonusTokens: 2500, priceAmount: 14900, currency: "CNY" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
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

    const { action, packageId, orderId, sessionId, paymentMethod } = await req.json();

    // Action: Get available packages
    if (action === "get_packages") {
      return new Response(
        JSON.stringify({ packages: TOPUP_PACKAGES }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Create order with Stripe Checkout
    if (action === "create_order") {
      const pkg = TOPUP_PACKAGES.find(p => p.id === packageId);
      if (!pkg) {
        return new Response(
          JSON.stringify({ error: "Invalid package" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create order in database first
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

      // If Stripe is configured, create Checkout session
      if (stripeSecretKey) {
        try {
          const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
          
          // Get origin from request headers
          const origin = req.headers.get("origin") || "https://fance-os-builder.lovable.app";
          
          // Check for existing Stripe customer
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          let customerId: string | undefined;
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }

          // Create Checkout session
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            customer_email: customerId ? undefined : user.email,
            line_items: [
              {
                price_data: {
                  currency: pkg.currency.toLowerCase(),
                  product_data: {
                    name: `${pkg.name} - ${pkg.tokenAmount.toLocaleString()} Token`,
                    description: pkg.bonusTokens > 0 
                      ? `含 ${pkg.bonusTokens.toLocaleString()} 赠送 Token`
                      : undefined,
                  },
                  unit_amount: pkg.priceAmount,
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            success_url: `${origin}/payment-success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?payment=cancelled`,
            metadata: {
              order_id: order.id,
              user_id: user.id,
              package_id: packageId,
            },
          });

          // Update order with Stripe session ID
          await supabase
            .from("topup_orders")
            .update({ stripe_session_id: session.id })
            .eq("id", order.id);

          return new Response(
            JSON.stringify({
              order,
              package: pkg,
              paymentUrl: session.url,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (stripeError: any) {
          console.error("Stripe error:", stripeError);
          // Fall back to returning order without payment URL
          return new Response(
            JSON.stringify({
              order,
              package: pkg,
              error: "Payment provider temporarily unavailable",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // No Stripe configured - return order for manual handling
      return new Response(
        JSON.stringify({
          order,
          package: pkg,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Verify Stripe session
    if (action === "verify_session") {
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Missing sessionId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ error: "Payment provider not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
      
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status !== "paid") {
          return new Response(
            JSON.stringify({ error: "Payment not completed" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const orderId = session.metadata?.order_id;
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: "Order not found in session" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Mark order as paid and complete it
        await supabase
          .from("topup_orders")
          .update({ status: "paid", stripe_payment_id: session.payment_intent as string })
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
      } catch (stripeError: any) {
        console.error("Stripe session verification error:", stripeError);
        return new Response(
          JSON.stringify({ error: "Failed to verify payment" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action: Complete order (after payment confirmed)
    if (action === "complete_order") {
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: "Missing orderId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify order belongs to user and is pending/paid
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

      // If order is already completed, return success
      if (order.status === "completed") {
        return new Response(
          JSON.stringify({
            success: true,
            tokensAdded: order.token_amount + order.bonus_tokens,
            message: "Order already completed",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as paid if still pending
      if (order.status === "pending") {
        await supabase
          .from("topup_orders")
          .update({ status: "paid" })
          .eq("id", orderId);
      }

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
