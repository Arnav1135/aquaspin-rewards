// src/hooks/useLeaderboard.ts
// Hook for leaderboard data with realtime subscription

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeaderboard, subscribeToLeaderboard } from '@/lib/supabase';

export function useLeaderboard() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => getLeaderboard().then(r => r.data ?? []),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = subscribeToLeaderboard(() => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    });

    return () => { channel.unsubscribe(); };
  }, [queryClient]);

  return {
    leaderboard: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
