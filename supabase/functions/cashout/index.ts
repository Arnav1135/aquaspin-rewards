// supabase/functions/cashout/index.ts
// Edge Function: Validate and process cashout requests
// Deploy: supabase functions deploy cashout

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_CASHOUT_TOKENS = 1000;      // Minimum tokens to cash out
const TOKENS_PER_USD = 1000;          // Exchange rate
const MAX_PENDING_REQUESTS = 1;       // Max pending cashout per user at a time

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
    const { amount_tokens, method, payment_address } = body;

    // ── Input validation ───────────────────────────────────────────────────────
    if (!amount_tokens || amount_tokens < MIN_CASHOUT_TOKENS) {
      return new Response(JSON.stringify({
        error: `Minimum cashout is ${MIN_CASHOUT_TOKENS} tokens ($${MIN_CASHOUT_TOKENS / TOKENS_PER_USD} USD)`
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (amount_tokens % MIN_CASHOUT_TOKENS !== 0) {
      return new Response(JSON.stringify({
        error: `Amount must be a multiple of ${MIN_CASHOUT_TOKENS} tokens`
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!method || !['upi', 'paypal'].includes(method)) {
      return new Response(JSON.stringify({ error: 'Method must be upi or paypal' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payment_address || payment_address.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Invalid payment address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate UPI format (basic)
    if (method === 'upi' && !payment_address.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid UPI ID format (must contain @)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate PayPal email format
    if (method === 'paypal' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payment_address)) {
      return new Response(JSON.stringify({ error: 'Invalid PayPal email format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Check user balance ─────────────────────────────────────────────────────
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('tokens, is_banned')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userData.is_banned) {
      return new Response(JSON.stringify({ error: 'Account suspended' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userData.tokens < amount_tokens) {
      return new Response(JSON.stringify({ error: 'Insufficient tokens' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Check for existing pending requests ────────────────────────────────────
    const { data: pendingRequests } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (pendingRequests && pendingRequests.length >= MAX_PENDING_REQUESTS) {
      return new Response(JSON.stringify({
        error: 'You already have a pending cashout request. Please wait for it to be processed.'
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Deduct tokens atomically ───────────────────────────────────────────────
    const { error: deductError } = await supabaseAdmin
      .from('users')
      .update({ tokens: userData.tokens - amount_tokens })
      .eq('id', user.id)
      .eq('tokens', userData.tokens); // Optimistic lock

    if (deductError) {
      return new Response(JSON.stringify({ error: 'Failed to deduct tokens, please retry' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Create transaction record ──────────────────────────────────────────────
    const amountUSD = amount_tokens / TOKENS_PER_USD;
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        amount_tokens,
        amount_usd: amountUSD,
        status: 'pending',
        method,
        payment_address,
      })
      .select()
      .single();

    if (txError) {
      // Rollback token deduction if transaction creation fails
      await supabaseAdmin
        .from('users')
        .update({ tokens: userData.tokens })
        .eq('id', user.id);

      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      transaction_id: transaction.id,
      amount_tokens,
      amount_usd: amountUSD,
      method,
      status: 'pending',
      message: 'Your cashout request has been submitted. Owner will process it within 24-48 hours.',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Cashout function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
