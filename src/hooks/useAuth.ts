// src/hooks/useAuth.ts
// Custom hook wrapping auth store with convenience selectors
// NOTE: initialize() is called once in App.tsx root — not here — to avoid
// multiple simultaneous Supabase session fetches on component mount.

import { useAuthStore } from '@/features/authStore';

export function useAuth() {
  const {
    session,
    profile,
    supabaseUser,
    isLoading,
    isGuest,
    login,
    loginWithGoogle,
    loginAsGuest,
    logout,
    signup,
    refreshProfile,
    updateProfile,
  } = useAuthStore();

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
