// supabase/functions/ad-reward/index.ts
// Edge Function: Verify ad watch completion and award tokens
// Deploy: supabase functions deploy ad-reward

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token rewards per ad type
const AD_REWARDS: Record<string, number> = {
  rewarded: 50,       // Rewarded video: 50 tokens
  interstitial: 10,   // Interstitial: 10 tokens (smaller reward for passive view)
  banner: 0,          // Banner: no direct token reward (CPM only for owner)
};

// Daily ad reward limits per user (anti-abuse)
const DAILY_AD_LIMITS: Record<string, number> = {
  rewarded: 10,       // Max 10 rewarded videos per day
  interstitial: 20,   // Max 20 interstitials per day
  banner: 0,
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { ad_type, network, completed } = body;

    if (!completed) {
      return new Response(JSON.stringify({ error: 'Ad not completed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ad_type || !Object.prototype.hasOwnProperty.call(AD_REWARDS, ad_type)) {
      return new Response(JSON.stringify({ error: 'Invalid ad type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Daily limit check ──────────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: adsWatchedToday } = await supabaseAdmin
      .from('ad_analytics')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('ad_type', ad_type)
      .eq('completed', true)
      .gte('created_at', todayStart.toISOString());

    const dailyLimit = DAILY_AD_LIMITS[ad_type];
    if (dailyLimit > 0 && (adsWatchedToday ?? 0) >= dailyLimit) {
      return new Response(JSON.stringify({
        error: `Daily limit of ${dailyLimit} ${ad_type} ads reached. Come back tomorrow!`,
        limit_reached: true,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tokensToAward = AD_REWARDS[ad_type];

    // ── Log ad impression ──────────────────────────────────────────────────────
    await supabaseAdmin.from('ad_analytics').insert({
      user_id: user.id,
      ad_type,
      network: network ?? 'unknown',
      tokens_awarded: tokensToAward,
      completed: true,
    });

    // ── Award tokens if applicable ─────────────────────────────────────────────
    if (tokensToAward > 0) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('tokens, total_earned')
        .eq('id', user.id)
        .single();

      if (userData) {
        await supabaseAdmin
          .from('users')
          .update({
            tokens: userData.tokens + tokensToAward,
            total_earned: userData.total_earned + tokensToAward,
          })
          .eq('id', user.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tokens_awarded: tokensToAward,
      ad_type,
      message: tokensToAward > 0 ? `+${tokensToAward} tokens earned!` : 'Thanks for watching!',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Ad reward function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
