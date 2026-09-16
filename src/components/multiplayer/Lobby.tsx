import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/authStore';
import { MatchmakingService, MatchState } from '@/features/multiplayer/MatchmakingService';
import { Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Lobby() {
  const { profile } = useAuthStore();
  const [isQueuing, setIsQueuing] = useState(false);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const navigate = useNavigate();
  
  const matchmakingService = useRef(new MatchmakingService());

  useEffect(() => {
    const service = matchmakingService.current;
    service.onMatchFound = (newMatch) => {
      setMatch(newMatch);
      setIsQueuing(false);
    };

    return () => {
      service.leaveQueue();
      service.disconnectFromMatch();
    };
  }, []);

  const handleJoinQueue = () => {
    if (!profile) return;
    setIsQueuing(true);
    setMatch(null);
    matchmakingService.current.joinQueue({
      id: profile.id,
      username: profile.username || 'Anonymous',
      level: profile.level || 1,
    });
  };

  const handleLeaveQueue = () => {
    setIsQueuing(false);
    matchmakingService.current.leaveQueue();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-white text-center">
      <div className="w-16 h-16 rounded-full bg-[#66bdf2]/20 flex items-center justify-center mb-6">
        <Users className="text-[#66bdf2]" size={32} />
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Multiplayer Lobby</h2>
      <p className="text-white/60 mb-8 max-w-md">
        Queue up to find an opponent. You will be matched with someone near your skill level.
      </p>

      {!isQueuing && !match && (
        <button
          onClick={handleJoinQueue}
          className="px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95"
          style={{ background: 'linear-gradient(135deg, #66bdf2 0%, #3a82f7 100%)' }}
        >
          Find Match
        </button>
      )}

      {isQueuing && !match && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#66bdf2]" size={32} />
          <p className="text-lg font-medium text-[#66bdf2] animate-pulse">
            Searching for opponent...
          </p>
          <button
            onClick={handleLeaveQueue}
            className="px-6 py-2 mt-4 rounded-xl font-medium border border-white/20 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {match && (
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6 max-w-sm w-full backdrop-blur-sm">
          <h3 className="text-xl font-bold text-[#66bdf2] mb-4">Match Found!</h3>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-2 font-bold">
                {match.players[0]?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{match.players[0]?.username}</span>
            </div>
            
            <div className="text-xl font-black text-white/50">VS</div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mb-2 font-bold">
                {match.players[1]?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{match.players[1]?.username}</span>
            </div>
          </div>
          <button
            className="w-full py-3 rounded-xl font-bold bg-[#66bdf2] text-[#16213e] hover:bg-white transition-colors"
            onClick={() => navigate(`/multiplayer/tictactoe/${match.matchId}`, { state: { match } })}
          >
            Enter Game
          </button>
        </div>
      )}
          {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#16213e] border border-[#66bdf2]/30 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(102,189,242,0.1)]">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#66bdf2]/10 flex items-center justify-center mb-6">
              <Loader2 className="text-[#66bdf2] animate-spin" size={40} />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">PROVISIONING SERVERS</h3>
            <p className="text-white/60 mb-6">
              The AAA Multiplayer Infrastructure is currently in closed alpha. Real-time global matchmaking for Chess, Pool, and Carrom will unlock in the upcoming Q4 Expansion!
            </p>
            <button 
              onClick={() => { setShowComingSoon(false); setMatch(null); }}
              className="w-full py-3 rounded-xl font-bold bg-white/5 text-white hover:bg-white/10 transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}