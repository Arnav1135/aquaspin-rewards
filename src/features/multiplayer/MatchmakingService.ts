import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Player {
  id: string;
  username: string;
  level: number;
}

export interface MatchState {
  matchId: string;
  players: Player[];
  status: 'waiting' | 'in_progress' | 'finished';
}

type MatchmakingCallback = (match: MatchState) => void;

export class MatchmakingService {
  private channel: RealtimeChannel | null = null;
  private currentMatchId: string | null = null;
  private me: Player | null = null;
  
  public onMatchFound: MatchmakingCallback | null = null;

  constructor() {}

  public joinQueue(player: Player) {
    this.me = player;
    
    // Create or join a 'matchmaking' channel
    this.channel = supabase.channel('matchmaking', {
      config: {
        presence: {
          key: player.id,
        },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState();
        if (state) {
          this.processQueue(state);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined queue:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Player left queue:', key, leftPresences);
      })
      .on('broadcast', { event: 'match_found' }, ({ payload }) => {
        const match = payload as MatchState;
        if (match.players.find((p) => p.id === this.me?.id)) {
          this.currentMatchId = match.matchId;
          if (this.onMatchFound) {
            this.onMatchFound(match);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await this.channel?.track({
            id: player.id,
            username: player.username,
            level: player.level,
            queuedAt: Date.now(),
          });
        }
      });
  }

  private processQueue(state: Record<string, any[]>) {
    if (!this.me) return;

    const queuedPlayers: any[] = [];
    for (const key in state) {
      if (state[key].length > 0) {
        queuedPlayers.push(state[key][0]);
      }
    }

    // Sort by queuedAt to prioritize older queue entries
    queuedPlayers.sort((a, b) => a.queuedAt - b.queuedAt);

    // If I'm the oldest in queue and there's at least 2 players, I should orchestrate the match
    if (queuedPlayers.length >= 2 && queuedPlayers[0].id === this.me.id) {
      const p1 = queuedPlayers[0];
      const p2 = queuedPlayers[1];

      const matchId = `match_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const matchState: MatchState = {
        matchId,
        players: [
          { id: p1.id, username: p1.username, level: p1.level },
          { id: p2.id, username: p2.username, level: p2.level }
        ],
        status: 'in_progress'
      };

      // Broadcast match to all in queue
      this.channel?.send({
        type: 'broadcast',
        event: 'match_found',
        payload: matchState
      });
    }
  }

  public leaveQueue() {
    if (this.channel) {
      this.channel.untrack();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  // --- Game State Sync via Supabase Broadcasts ---
  
  private gameChannel: RealtimeChannel | null = null;
  public onGameStateUpdate: ((state: any) => void) | null = null;

  public connectToMatch(matchId: string) {
    if (this.gameChannel) {
      supabase.removeChannel(this.gameChannel);
    }
    this.gameChannel = supabase.channel(`match_${matchId}`);
    
    this.gameChannel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        if (this.onGameStateUpdate) {
          this.onGameStateUpdate(payload);
        }
      })
      .subscribe();
  }

  public sendGameStateUpdate(state: any) {
    if (this.gameChannel) {
      this.gameChannel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: state
      });
    }
  }

  public disconnectFromMatch() {
    if (this.gameChannel) {
      supabase.removeChannel(this.gameChannel);
      this.gameChannel = null;
    }
    this.currentMatchId = null;
  }
}
