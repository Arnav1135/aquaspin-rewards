import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('login_streak, last_login_date, tokens, xp, level')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    const now = new Date();
    const lastLogin = userData.last_login_date ? new Date(userData.last_login_date) : null;
    
    let newStreak = userData.login_streak || 0;
    
    // Check if already claimed today
    if (lastLogin && lastLogin.toDateString() === now.toDateString()) {
       return new Response(JSON.stringify({ success: false, error: 'Already claimed today' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 400,
       });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastLogin && lastLogin.toDateString() === yesterday.toDateString()) {
      newStreak += 1;
    } else {
      newStreak = 1; // reset streak
    }

    const dayNumber = ((newStreak - 1) % 7) + 1;
    
    const DAILY_REWARD_SCHEDULE = [
      { day: 1, tokens: 50 },
      { day: 2, tokens: 75 },
      { day: 3, tokens: 100 },
      { day: 4, tokens: 100 },
      { day: 5, tokens: 150 },
      { day: 6, tokens: 200 },
      { day: 7, tokens: 500 },
    ];
    
    const rewardTokens = DAILY_REWARD_SCHEDULE.find(r => r.day === dayNumber)?.tokens || 50;
    const rewardXP = 100;
    
    const newTokens = (userData.tokens || 0) + rewardTokens;
    const newXP = (userData.xp || 0) + rewardXP;
    const newLevel = Math.min(Math.floor(newXP / 500) + 1, 100);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        login_streak: newStreak,
        last_login_date: now.toISOString(),
        tokens: newTokens,
        xp: newXP,
        level: newLevel
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin
      .from('daily_rewards')
      .insert({
        user_id: user.id,
        day_number: dayNumber,
        tokens: rewardTokens
      });

    return new Response(JSON.stringify({ 
      success: true, 
      reward: rewardTokens, 
      xp: rewardXP,
      newStreak: newStreak, 
      newTokens: newTokens,
      newLevel: newLevel,
      newXP: newXP
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
