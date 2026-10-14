import { describe, it, expect, vi, beforeEach } from 'vitest';
import { secureRecordGameResult, secureUpdateTokens } from '../secureEconomy';
import { supabase } from '../supabase';

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('secureEconomy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'user@example.com' },
        },
      },
      error: null,
    });
  });

  describe('secureRecordGameResult', () => {
    it('should successfully record game result', async () => {
      vi.mocked(supabase.rpc as any).mockResolvedValueOnce({ data: { success: true }, error: null });

      const payload = {
        userId: 'user-1',
        betAmount: 10,
        earnedAmount: 20,
        xpEarned: 5,
      };

      const result = await secureRecordGameResult(payload);

      expect(supabase.rpc).toHaveBeenCalledWith('record_game_result', {
        p_user_id: 'user-1',
        p_bet_amount: 10,
        p_earned_amount: 20,
        p_xp_earned: 5,
      });
      expect(result).toEqual({ data: { success: true }, error: null });
    });

    it('should handle missing xpEarned by defaulting to 0', async () => {
      vi.mocked(supabase.rpc as any).mockResolvedValueOnce({ data: { success: true }, error: null });
      vi.mocked(supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: 'user-2', email: 'user2@example.com' } } },
        error: null,
      });

      const payload = {
        userId: 'user-2',
        betAmount: 10,
        earnedAmount: 20,
      };

      const result = await secureRecordGameResult(payload);

      expect(supabase.rpc).toHaveBeenCalledWith('record_game_result', {
        p_user_id: 'user-2',
        p_bet_amount: 10,
        p_earned_amount: 20,
        p_xp_earned: 0,
      });
    });

    it('should throw an error if RPC fails', async () => {
      vi.mocked(supabase.rpc as any).mockResolvedValueOnce({ data: null, error: new Error('RPC Error') });
      vi.mocked(supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: 'user-3', email: 'user3@example.com' } } },
        error: null,
      });

      const payload = {
        userId: 'user-3',
        betAmount: 10,
        earnedAmount: 20,
      };

      await expect(secureRecordGameResult(payload)).rejects.toThrow('Transaction rejected by server security policies.');
    });
  });

  describe('secureUpdateTokens', () => {
    it('should successfully update tokens', async () => {
      vi.mocked(supabase.rpc as any).mockResolvedValueOnce({ data: { success: true }, error: null });

      const result = await secureUpdateTokens('user-1', 50);

      expect(supabase.rpc).toHaveBeenCalledWith('update_user_tokens', {
        p_user_id: 'user-1',
        p_amount_change: 50,
      });
      expect(result).toEqual({ data: { success: true }, error: null });
    });

    it('should throw an error if RPC fails', async () => {
      vi.mocked(supabase.rpc as any).mockResolvedValueOnce({ data: null, error: new Error('RPC Error') });

      await expect(secureUpdateTokens('user-1', -10)).rejects.toThrow('Transaction rejected by server security policies.');
    });
  });
});
