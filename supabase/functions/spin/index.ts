// supabase/functions/spin/index.ts
// Edge Function: Server-side spin validation, anti-cheat, reward generation
// Deploy: supabase functions deploy spin

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Weighted reward segments ──────────────────────────────────────────────────
// Each segment: { label, tokens, weight }
// Higher weight = higher probability
const WHEEL_SEGMENTS = [
  { label: '20 Tokens',   tokens: 20,   weight: 30 },
  { label: '50 Tokens',   tokens: 50,   weight: 25 },
  { label: '10 Tokens',   tokens: 10,   weight: 20 },
  { label: '100 Tokens',  tokens: 100,  weight: 10 },
  { label: '30 Tokens',   tokens: 30,   weight: 15 },
  { label: '75 Tokens',   tokens: 75,   weight: 8  },
  { label: '150 Tokens',  tokens: 150,  weight: 5  },
  { label: '200 Tokens',  tokens: 200,  weight: 4  },
  { label: 'JACKPOT 500', tokens: 500,  weight: 1  },
  { label: '25 Tokens',   tokens: 25,   weight: 20 },
  { label: '60 Tokens',   tokens: 60,   weight: 12 },
  { label: '250 Tokens',  tokens: 250,  weight: 2  },
];

const SPIN_COST_TOKENS = 10;            // Paid spin cost
const SPIN_COOLDOWN_SECONDS = 30;       // Min seconds between spins
const AD_REWARDED_BONUS_MULTIPLIER = 2; // Ad-watch spins get 2x tokens

// ── Weighted random selection ─────────────────────────────────────────────────
function weightedRandom(segments: typeof WHEEL_SEGMENTS): typeof WHEEL_SEGMENTS[0] {
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const segment of segments) {
    random -= segment.weight;
    if (random <= 0) return segment;
  }
  return segments[0];
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase with service role key (server-side only, never exposed to client)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate request from JWT in Authorization header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const spinType: 'paid' | 'ad_rewarded' | 'daily_free' = body.spin_type ?? 'paid';

    // ── Fetch user data ────────────────────────────────────────────────────────
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('tokens, is_banned')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userData.is_banned) {
      return new Response(JSON.stringify({ error: 'Account suspended' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch game stats for cooldown check ───────────────────────────────────
    const { data: statsData } = await supabaseAdmin
      .from('game_stats')
      .select('last_spin_at, spins_today')
      .eq('user_id', user.id)
      .single();

    // Cooldown check (server-side, not bypassable)
    if (statsData?.last_spin_at) {
      const secondsSinceLastSpin = (Date.now() - new Date(statsData.last_spin_at).getTime()) / 1000;
      if (secondsSinceLastSpin < SPIN_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(SPIN_COOLDOWN_SECONDS - secondsSinceLastSpin);
        return new Response(JSON.stringify({ error: 'cooldown', wait_seconds: waitSeconds }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Token deduction for paid spin ─────────────────────────────────────────
    if (spinType === 'paid') {
      if (userData.tokens < SPIN_COST_TOKENS) {
        return new Response(JSON.stringify({ error: 'insufficient_tokens' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Generate reward (server-side random — cannot be manipulated) ──────────
    const selectedSegment = weightedRandom(WHEEL_SEGMENTS);
    const segmentIndex = WHEEL_SEGMENTS.indexOf(selectedSegment);
    let rewardTokens = selectedSegment.tokens;

    // Ad-rewarded spins get 2x tokens
    if (spinType === 'ad_rewarded') {
      rewardTokens = Math.round(rewardTokens * AD_REWARDED_BONUS_MULTIPLIER);
    }

    // ── Update tokens in DB ───────────────────────────────────────────────────
    const tokenDelta = spinType === 'paid'
      ? rewardTokens - SPIN_COST_TOKENS  // Net gain/loss
      : rewardTokens;                     // Free/ad spin: pure gain

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        tokens: userData.tokens + tokenDelta,
        total_earned: (userData.tokens + tokenDelta),  // Track cumulative
        xp: (userData.tokens + tokenDelta),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // ── Insert spin history record ────────────────────────────────────────────
    await supabaseAdmin.from('spin_history').insert({
      user_id: user.id,
      reward: rewardTokens,
      segment: selectedSegment.label,
      spin_type: spinType,
    });

    // ── Update game stats ─────────────────────────────────────────────────────
    await supabaseAdmin.from('game_stats').upsert({
      user_id: user.id,
      last_spin_at: new Date().toISOString(),
      spins_total: (statsData?.spins_today ?? 0) + 1,
      spins_today: (statsData?.spins_today ?? 0) + 1,
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      reward: rewardTokens,
      segment: selectedSegment.label,
      segment_index: segmentIndex,
      spin_type: spinType,
      new_balance: userData.tokens + tokenDelta,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Spin function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
