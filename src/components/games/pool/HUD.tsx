import { usePoolEconomy } from './PoolEconomy';
import { usePoolRules, PlayerId, BallGroup } from './RulesEngine';
import { AnimatePresence, motion } from 'framer-motion';

function PlayerBadge({ player, isActive, group }: { player: PlayerId, isActive: boolean, group: BallGroup }) {
  const name = player === 'PLAYER_1' ? 'Player 1' : 'Player 2';
  
  return (
    <div className={`flex flex-col items-center gap-1 p-2 px-6 rounded-xl border-2 backdrop-blur-md transition-all duration-300 ${isActive ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-black/50 border-white/10 opacity-60'}`}>
      <span className={`font-bold text-lg ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}>{name}</span>
      <span className="text-xs uppercase tracking-widest text-slate-300 font-bold">
        {group === 'UNASSIGNED' ? 'Open' : group === 'SOLIDS' ? 'Solids' : 'Stripes'}
      </span>
    </div>
  );
}

export function HUD() {
  const gameState = usePoolRules(s => s.gameState);
  const currentPlayer = usePoolRules(s => s.currentPlayer);
  const p1Group = usePoolRules(s => s.player1Group);
  const p2Group = usePoolRules(s => s.player2Group);
  const foulMessage = usePoolRules(s => s.foulMessage);

  if (usePoolEconomy(s => s.mode) === 'MENU') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6">
      {/* Top HUD: Players */}
      <div className="flex justify-between items-center max-w-2xl mx-auto w-full">
        <PlayerBadge player="PLAYER_1" isActive={currentPlayer === 'PLAYER_1'} group={p1Group} />
        
        <div className="text-white/50 text-xs font-bold uppercase tracking-widest px-4">
          VS
        </div>

        <PlayerBadge player="PLAYER_2" isActive={currentPlayer === 'PLAYER_2'} group={p2Group} />
      </div>

      {/* Center Messages (Fouls, Breaks) */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence>
          {foulMessage && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-red-500/90 text-white font-black text-2xl uppercase tracking-widest px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(255,0,0,0.6)] border border-red-400 backdrop-blur-md text-center"
            >
              {foulMessage}
            </motion.div>
          )}
          {gameState === 'BREAK' && !foulMessage && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-white/80 font-black text-2xl uppercase tracking-widest px-8 py-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
            >
              {currentPlayer}'s Break
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom HUD: Status */}
      <div className="flex justify-center">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-6 py-2 text-white/70 text-sm font-bold tracking-widest uppercase shadow-xl">
          {gameState === 'OPEN_TABLE' ? 'Table is Open' : gameState === 'IN_PLAY' ? 'Game On' : gameState === 'GAME_OVER' ? 'Match Over' : ''}
        </div>
      </div>
    </div>
  );
}
