import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import { supabase, getUserProfile, recordSignIn } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn(() => ({ then: vi.fn() })) })) })),
  },
  getUserProfile: vi.fn(),
  recordSignIn: vi.fn(() => Promise.resolve()),
}));

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      supabaseUser: null,
      profile: null,
      isLoading: true,
      isGuest: false,
      isOwner: false,
    });
    vi.clearAllMocks();
  });

  describe('loginAsGuest', () => {
    it('should set guest profile correctly', () => {
      useAuthStore.getState().loginAsGuest();
      const state = useAuthStore.getState();

      expect(state.isGuest).toBe(true);
      expect(state.isOwner).toBe(false);
      expect(state.profile).not.toBeNull();
      expect(state.profile?.email).toBe('guest@aquaspin.local');
      expect(state.profile?.tokens).toBe(200);
    });
  });

  describe('updateProfile', () => {
    it('should partially update the profile if one exists', () => {
      const mockProfile = { id: '123', email: 'test@example.com', tokens: 100 } as any;
      useAuthStore.setState({ profile: mockProfile });

      useAuthStore.getState().updateProfile({ tokens: 150 });
      
      const state = useAuthStore.getState();
      expect(state.profile?.tokens).toBe(150);
      expect(state.profile?.id).toBe('123');
    });

    it('should not update profile if profile is null', () => {
      useAuthStore.setState({ profile: null });

      useAuthStore.getState().updateProfile({ tokens: 150 });
      
      const state = useAuthStore.getState();
      expect(state.profile).toBeNull();
    });
    
    it('should set isOwner if updated profile is owner email', () => {
      const mockProfile = { id: '123', email: 'test@example.com', tokens: 100 } as any;
      useAuthStore.setState({ profile: mockProfile });

      useAuthStore.getState().updateProfile({ email: 'vermaarnav113@gmail.com' });
      
      const state = useAuthStore.getState();
      expect(state.isOwner).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear all state and call supabase sign out', async () => {
      useAuthStore.setState({
        session: { access_token: '123' } as any,
        supabaseUser: { id: '123' } as any,
        profile: { id: '123' } as any,
        isGuest: true,
        isOwner: true,
      });

      await useAuthStore.getState().logout();
      
      const state = useAuthStore.getState();
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(state.session).toBeNull();
      expect(state.supabaseUser).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isGuest).toBe(false);
      expect(state.isOwner).toBe(false);
    });
  });
});
