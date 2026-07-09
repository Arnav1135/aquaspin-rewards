// src/hooks/useTokens.ts
// Hook for token operations with optimistic updates and realtime sync

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/features/authStore';
import { subscribeToUserTokens } from '@/lib/supabase';

export function useTokens() {
  const { profile, supabaseUser, updateProfile } = useAuthStore();

  // Subscribe to realtime token updates from server
  useEffect(() => {
    if (!supabaseUser) return;

    const channel = subscribeToUserTokens(supabaseUser.id, (newTokens) => {
      updateProfile({ tokens: newTokens });
    });

    return () => { channel.unsubscribe(); };
  }, [supabaseUser, updateProfile]);

  const addTokens = useCallback((amount: number) => {
    if (!profile) return;
    updateProfile({ tokens: profile.tokens + amount });
  }, [profile, updateProfile]);

  const deductTokens = useCallback((amount: number): boolean => {
    if (!profile || profile.tokens < amount) return false;
    updateProfile({ tokens: profile.tokens - amount });
    return true;
  }, [profile, updateProfile]);

  return {
    tokens: profile?.tokens ?? 0,
    usdValue: ((profile?.tokens ?? 0) / 1000).toFixed(2),
    canCashout: (profile?.tokens ?? 0) >= 1000,
    addTokens,
    deductTokens,
  };
}
