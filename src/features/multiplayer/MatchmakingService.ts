import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Player {
  id: string;
  username: string;
  level: number;
}

export interface MatchState {
  matchId: string;
  gameKey: string;
  players: Player[];
  status: 'waiting' | 'in_progress' | 'finished';
}

type MatchmakingCallback = (match: MatchState) => void;

export class MatchmakingService {
  private channel: RealtimeChannel | null = null;
  private matchChannel: RealtimeChannel | null = null;
  public currentMatchId: string | null = null;
  private me: Player | null = null;
  
  public onMatchFound: MatchmakingCallback | null = null;
  public onGameStateUpdate: ((payload: any) => void) | null = null;

  public joinQueue(player: Player, gameKey: string = 'any') {
    this.me = player;
    
    this.channel = supabase.channel(`matchmaking_${gameKey}`, {
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
          this.processQueue(state, gameKey);
        }
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
          await this.channel?.track({
            id: player.id,
            username: player.username,
            level: player.level,
            queuedAt: Date.now(),
          });
        }
      });
  }

  private processQueue(state: Record<string, any[]>, gameKey: string) {
    if (!this.me) return;

    const queuedPlayers: any[] = [];
    for (const key in state) {
      if (state[key].length > 0) {
        queuedPlayers.push(state[key][0]);
      }
    }

    queuedPlayers.sort((a, b) => a.queuedAt - b.queuedAt);

    if (queuedPlayers.length >= 2 && queuedPlayers[0].id === this.me.id) {
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const players = [queuedPlayers[0], queuedPlayers[1]];
      
      const match: MatchState = {
        matchId,
        gameKey,
        players: players.map(p => ({ id: p.id, username: p.username, level: p.level })),
        status: 'in_progress'
      };

      this.channel?.send({
        type: 'broadcast',
        event: 'match_found',
        payload: match
      });
    }
  }

  public connectToMatch(matchId: string) {
    this.currentMatchId = matchId;
    this.matchChannel = supabase.channel(`match_${matchId}`);
    
    this.matchChannel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        if (this.onGameStateUpdate) {
          this.onGameStateUpdate(payload);
        }
      })
      .subscribe();
  }

  public sendGameStateUpdate(payload: any) {
    if (this.matchChannel) {
      this.matchChannel.send({
        type: 'broadcast',
        event: 'game_state',
        payload
      });
    }
  }

  public disconnectFromMatch() {
    if (this.matchChannel) {
      this.matchChannel.unsubscribe();
      this.matchChannel = null;
    }
    this.currentMatchId = null;
  }

  public leaveQueue() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.currentMatchId = null;
    this.me = null;
  }
}
