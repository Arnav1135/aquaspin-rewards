// src/features/authStore.ts
// Zustand store for authentication state and user profile

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getUserProfile } from '@/lib/supabase';
import type { User } from '@/types/database';

interface AuthState {
  // State
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: User | null;
  isLoading: boolean;
  isGuest: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  loginWithGoogle: () => Promise<{ error?: string }>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        session: null,
        supabaseUser: null,
        profile: null,
        isLoading: true,
        isGuest: false,

        // ── Initialize auth state from existing session ──────────────────────
        initialize: async () => {
          set({ isLoading: true });

          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const { data: profile } = await getUserProfile(session.user.id);
            set({
              session,
              supabaseUser: session.user,
              profile,
              isLoading: false,
              isGuest: false,
            });
          } else {
            set({ isLoading: false });
          }

          // Listen for auth state changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              const { data: profile } = await getUserProfile(session.user.id);
              set({ session, supabaseUser: session.user, profile, isGuest: false });
            } else {
              set({ session: null, supabaseUser: null, profile: null });
            }
          });
        },

        // ── Email/Password login ─────────────────────────────────────────────
        login: async (email, password) => {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error: error.message };

          if (data.session?.user) {
            const { data: profile } = await getUserProfile(data.session.user.id);
            set({ session: data.session, supabaseUser: data.session.user, profile, isGuest: false });
          }

          return {};
        },

        // ── Google OAuth login ───────────────────────────────────────────────
        loginWithGoogle: async () => {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/dashboard`,
            },
          });
          if (error) return { error: error.message };
          return {};
        },

        // ── Guest play (no account, limited tokens) ──────────────────────────
        loginAsGuest: () => {
          // Create a minimal guest profile in local state only (not persisted to DB)
          const guestProfile: User = {
            id: 'guest-' + Date.now(),
            email: 'guest@aquaspin.local',
            username: 'Guest Player',
            avatar_url: null,
            tokens: 200,  // Limited guest tokens
            level: 1,
            xp: 0,
            streak: 0,
            streak_last: null,
            total_earned: 0,
            referral_code: null,
            referred_by: null,
            is_banned: false,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          };
          set({ profile: guestProfile, isGuest: true });
        },

        // ── Logout ───────────────────────────────────────────────────────────
        logout: async () => {
          await supabase.auth.signOut();
          set({ session: null, supabaseUser: null, profile: null, isGuest: false });
        },

        // ── Sign up ──────────────────────────────────────────────────────────
        signup: async (email, password, username) => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username },
            },
          });

          if (error) return { error: error.message };

          if (data.session?.user) {
            const { data: profile } = await getUserProfile(data.session.user.id);
            set({ session: data.session, supabaseUser: data.session.user, profile, isGuest: false });
          }

          return {};
        },

        // ── Refresh profile from DB ──────────────────────────────────────────
        refreshProfile: async () => {
          const { supabaseUser } = get();
          if (!supabaseUser) return;

          const { data: profile } = await getUserProfile(supabaseUser.id);
          if (profile) set({ profile });
        },

        // ── Local-only profile update (optimistic) ───────────────────────────
        updateProfile: (updates) => {
          const { profile } = get();
          if (profile) set({ profile: { ...profile, ...updates } });
        },
      }),
      {
        name: 'aquaspin-auth',
        // Only persist non-sensitive, UI-critical state
        partialize: (state) => ({
          isGuest: state.isGuest,
          // Don't persist session tokens — let Supabase handle that via localStorage
        }),
      }
    )
  )
);
