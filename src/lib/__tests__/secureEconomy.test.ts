import { describe, it, expect, vi, beforeEach } from 'vitest';
import { secureUpdateTokens, secureRecordGameResult } from '../secureEconomy';
import { supabase } from '../supabase';

describe('secureEconomy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('secureUpdateTokens calls the RPC successfully', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: 2000, error: null });

    const result = await secureUpdateTokens('test-user-id', 500);

    expect(supabase.rpc).toHaveBeenCalledWith('update_user_tokens', {
      p_user_id: 'test-user-id',
      p_amount_change: 500
    });
    expect(result.data).toBe(2000);
    expect(result.error).toBeNull();
  });

  it('secureRecordGameResult calls the record_game_result RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: 2500, error: null });

    const payload = {
      userId: 'test-user-id',
      betAmount: 100,
      earnedAmount: 200,
      xpEarned: 10
    };

    const result = await secureRecordGameResult(payload);

    expect(supabase.rpc).toHaveBeenCalledWith('record_game_result', {
      p_user_id: payload.userId,
      p_bet_amount: payload.betAmount,
      p_earned_amount: payload.earnedAmount,
      p_xp_earned: payload.xpEarned
    });
    
    expect(result.data).toBe(2500);
  });
});
