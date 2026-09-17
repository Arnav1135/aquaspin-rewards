import { supabase } from './supabase';
import { useAuthStore } from '@/features/authStore';

export const CloudSaveService = {
  async save(gameId: string, state: any) {
    const { profile, isGuest } = useAuthStore.getState();
    if (isGuest || !profile) {
      localStorage.setItem(`cloud-save-${gameId}`, JSON.stringify(state));
      return;
    }

    try {
      const { error } = await (supabase.from('game_saves') as any).upsert({
        user_id: profile.id,
        game_id: gameId,
        state_data: state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, game_id' });
      if (error) throw error;
    } catch (e) {
      localStorage.setItem(`cloud-save-${profile.id}-${gameId}`, JSON.stringify(state));
    }
  },

  async load(gameId: string): Promise<any | null> {
    const { profile, isGuest } = useAuthStore.getState();
    if (isGuest || !profile) {
      const local = localStorage.getItem(`cloud-save-${gameId}`);
      return local ? JSON.parse(local) : null;
    }

    try {
      const { data, error } = await (supabase.from('game_saves') as any)
        .select('state_data')
        .eq('user_id', profile.id)
        .eq('game_id', gameId)
        .single();
      if (error) throw error;
      return data?.state_data || null;
    } catch (e) {
      const local = localStorage.getItem(`cloud-save-${profile.id}-${gameId}`);
      return local ? JSON.parse(local) : null;
    }
  },

  async clear(gameId: string) {
    const { profile, isGuest } = useAuthStore.getState();
    if (isGuest || !profile) {
      localStorage.removeItem(`cloud-save-${gameId}`);
      return;
    }
    try {
      await (supabase.from('game_saves') as any).delete()
        .eq('user_id', profile.id)
        .eq('game_id', gameId);
    } catch (e) {}
    localStorage.removeItem(`cloud-save-${profile.id}-${gameId}`);
  }
};
