import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { PLINKO_TABLES, Difficulty, Rows } from "./plinkoConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    const body = await req.json();
    const betAmount = Number(body.betAmount);
    const rows = Number(body.rows) as Rows;
    const risk = body.risk as Difficulty;

    if (!betAmount || betAmount <= 0) throw new Error('Invalid bet amount');
    if (!PLINKO_TABLES[risk] || !PLINKO_TABLES[risk][rows]) throw new Error('Invalid config');

    // Generate Outcome
    const clientSeed = body.clientSeed || crypto.randomUUID();
    // Deterministic secure server seed per round/user
    const serverSeed = Deno.env.get('PLINKO_SERVER_SECRET') || 'default-secret';
    const nonce = Date.now(); // We use timestamp + random as nonce for simplicity if DB sequence isn't set up
    const uniqueNonce = `${nonce}-${Math.floor(Math.random()*1000)}`;
    
    const keyData = new TextEncoder().encode(serverSeed);
    const msgData = new TextEncoder().encode(`${clientSeed}:${uniqueNonce}`);
    
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, msgData);
    const hashArray = Array.from(new Uint8Array(signature));
    
    const path: ('L' | 'R')[] = [];
    let targetBucket = 0;
    for (let i = 0; i < rows; i++) {
      if (hashArray[i] % 2 === 1) {
        path.push('R');
        targetBucket += 1;
      } else {
        path.push('L');
      }
    }

    const multiplier = PLINKO_TABLES[risk][rows]![targetBucket];
    const payout = Math.floor(betAmount * multiplier);

    // Atomic DB update via RPC (uses the function we just created)
    const { data: dbResult, error: dbError } = await supabaseClient.rpc('place_plinko_bet', {
      p_bet_amount: betAmount,
      p_rows: rows,
      p_risk: risk,
      p_client_seed: clientSeed,
      p_server_seed: serverSeed,
      p_nonce: nonce,
      p_target_bucket: targetBucket,
      p_multiplier: multiplier,
      p_payout: payout
    });

    if (dbError || !dbResult?.success) {
      throw new Error(dbError?.message || 'Database transaction failed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        roundId: dbResult.round_id,
        newBalance: dbResult.new_balance,
        path,
        targetBucket,
        multiplier,
        payout
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
