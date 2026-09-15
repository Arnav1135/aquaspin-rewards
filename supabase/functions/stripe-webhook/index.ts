import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature || !endpointSecret) {
    return new Response(JSON.stringify({ error: "Missing signature or secret" }), { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      
      const userId = session.metadata.userId;
      const tokens = parseInt(session.metadata.tokens, 10);

      if (userId && tokens) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { error } = await supabase.rpc('update_user_tokens', {
          p_user_id: userId,
          p_amount_change: tokens
        });

        if (error) {
          console.error("Failed to update tokens", error);
        } else {
          console.log(`Successfully added ${tokens} tokens to user ${userId}`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
