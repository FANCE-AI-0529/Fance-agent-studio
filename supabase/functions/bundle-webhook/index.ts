import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[BUNDLE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    let event: Stripe.Event;
    
    // If we have a webhook secret, verify the signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Signature verified");
      } catch (err) {
        logStep("Signature verification failed", { error: String(err) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
      logStep("No signature verification (testing mode)");
    }

    logStep("Event type", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bundleId = session.metadata?.bundle_id;
      const userId = session.metadata?.user_id;
      
      logStep("Processing completed checkout", { bundleId, userId, sessionId: session.id });

      if (!bundleId || !userId) {
        logStep("Missing metadata");
        return new Response(JSON.stringify({ error: "Missing metadata" }), { status: 400 });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Update purchase status
      const { error: updateError } = await supabase
        .from("bundle_purchases")
        .update({ 
          status: "completed",
          stripe_payment_id: session.payment_intent as string,
          purchased_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      if (updateError) {
        logStep("Failed to update purchase", { error: updateError.message });
      } else {
        logStep("Purchase updated to completed");
      }

      // Get bundle info for earnings
      const { data: bundle } = await supabase
        .from("skill_bundles")
        .select("author_id, price, name")
        .eq("id", bundleId)
        .single();

      if (bundle?.author_id && bundle?.price) {
        // Calculate creator earnings (e.g., 70% of sale)
        const creatorShare = Number(bundle.price) * 0.7;
        
        const { error: earningsError } = await supabase
          .from("creator_earnings")
          .insert({
            creator_id: bundle.author_id,
            bundle_id: bundleId,
            amount: creatorShare,
            transaction_type: "bundle_sale",
          });

        if (earningsError) {
          logStep("Failed to record earnings", { error: earningsError.message });
        } else {
          logStep("Creator earnings recorded", { amount: creatorShare });
        }
      }

      // Increment download count
      await supabase.rpc("increment_bundle_downloads", { p_bundle_id: bundleId });
      logStep("Download count incremented");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
