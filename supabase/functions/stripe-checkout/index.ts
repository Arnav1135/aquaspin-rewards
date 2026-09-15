import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, bundleId, returnUrl } = await req.json();

    if (!userId || !bundleId) {
      return new Response(JSON.stringify({ error: "Missing required params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bundles: Record<string, { name: string, price: number, tokens: number }> = {
      'buy_tokens_5000': { name: '5000 Tokens', price: 500, tokens: 5000 },
      'buy_tokens_15000': { name: '15000 Tokens', price: 1200, tokens: 15000 },
    };

    const bundle = bundles[bundleId];
    if (!bundle) {
      return new Response(JSON.stringify({ error: "Invalid bundle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: bundle.name,
              description: `Buy ${bundle.tokens} AquaSpin tokens`,
            },
            unit_amount: bundle.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${returnUrl || "http://localhost:5173"}/shop?success=true`,
      cancel_url: `${returnUrl || "http://localhost:5173"}/shop?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId,
        bundleId,
        tokens: bundle.tokens.toString(),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
