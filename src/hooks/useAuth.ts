// src/hooks/useAuth.ts
// Custom hook wrapping auth store with convenience selectors

import { useEffect } from 'react';
import { useAuthStore } from '@/features/authStore';

export function useAuth() {
  const {
    session,
    profile,
    supabaseUser,
    isLoading,
    isGuest,
    initialize,
    login,
    loginWithGoogle,
    loginAsGuest,
    logout,
    signup,
    refreshProfile,
    updateProfile,
  } = useAuthStore();

  // Initialize auth on first mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    // State
    session,
    profile,
    user: supabaseUser,
    isLoading,
    isGuest,
    isAuthenticated: !!session || isGuest,
    isFullUser: !!session && !isGuest,

    // Actions
    login,
    loginWithGoogle,
    loginAsGuest,
    logout,
    signup,
    refreshProfile,
    updateProfile,
  };
}
