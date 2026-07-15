// src/features/authStore.ts
// Zustand store for authentication state and user profile

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getUserProfile, recordSignIn } from '@/lib/supabase';
import type { User } from '@/types/database';

interface AuthState {
  // State
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: User | null;
  isLoading: boolean;
  isGuest: boolean;
  isOwner: boolean;

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
        isOwner: false,

        // ── Initialize auth state from existing session ──────────────────────
        initialize: async () => {
          // Prevent double-initialization (e.g. StrictMode double-mount)
          if (!get().isLoading) return;

          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const { data: profile } = await getUserProfile(session.user.id);
            set({
              session,
              supabaseUser: session.user,
              profile,
              isLoading: false,
              isGuest: false,
              isOwner: profile?.email === 'vermaarnav113@gmail.com',
            });
          } else {
            set({ isLoading: false });
          }

          // Listen for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
              set({ session: null, supabaseUser: null, profile: null, isGuest: false, isOwner: false, isLoading: false });
              return;
            }
            if (session?.user) {
              const { data: profile } = await getUserProfile(session.user.id);
              set({
                session,
                supabaseUser: session.user,
                profile,
                isLoading: false,
                isGuest: false,
                isOwner: profile?.email === 'vermaarnav113@gmail.com',
              });
              // Record sign-in for Google OAuth (SIGNED_IN event on redirect callback)
              if (event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google') {
                recordSignIn(session.user.id, session.user.email ?? '', 'google').catch(console.warn);
              }
            }
          });
        },

        // ── Email/Password login ──────────────────────────────────────────────────────
        login: async (email, password) => {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error: error.message };

          if (data.session?.user) {
            const { data: profile } = await getUserProfile(data.session.user.id);
            set({ session: data.session, supabaseUser: data.session.user, profile, isGuest: false, isOwner: profile?.email === 'vermaarnav113@gmail.com' });
            // Record the sign-in (fire and forget — don't block login on this)
            recordSignIn(data.session.user.id, email, 'email').catch(console.warn);
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
            free_trials: 3,
            has_deposited: false,
          };
          set({ profile: guestProfile, isGuest: true, isOwner: false });
        },

        // ── Logout ───────────────────────────────────────────────────────────
        logout: async () => {
          await supabase.auth.signOut();
          set({ session: null, supabaseUser: null, profile: null, isGuest: false, isOwner: false });
        },

        // ── Sign up ───────────────────────────────────────────────────────────────
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
            set({ session: data.session, supabaseUser: data.session.user, profile, isGuest: false, isOwner: profile?.email === 'vermaarnav113@gmail.com' });
            // Record the first sign-in for newly registered users
            recordSignIn(data.session.user.id, email, 'email').catch(console.warn);
          }

          return {};
        },

        // ── Refresh profile from DB ──────────────────────────────────────────
        refreshProfile: async () => {
          const { supabaseUser } = get();
          if (!supabaseUser) return;

          const { data: profile } = await getUserProfile(supabaseUser.id);
          if (profile) set({ profile, isOwner: profile?.email === 'vermaarnav113@gmail.com' });
        },

        // ── Local-only profile update (optimistic) ───────────────────────────
        updateProfile: (updates) => {
          const { profile } = get();
          if (profile) {
            const newProfile = { ...profile, ...updates };
            set({ profile: newProfile, isOwner: newProfile.email === 'vermaarnav113@gmail.com' });
          }
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
