import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/features/authStore";
import { MatchmakingService, MatchState } from "@/features/multiplayer/MatchmakingService";
import { GameShell } from "@/components/games/GameShell";
import { Trophy, ArrowLeft, RotateCcw, AlertTriangle, Smile, Clock } from "lucide-react";
import { audio } from "@/lib/audioEngine";
import { supabase } from "@/lib/supabase";

type Cell = "X" | "O" | null;

interface GameState {
  board: Cell[];
  xIsNext: boolean;
  winner: Cell | "DRAW" | null;
  winLine: number[] | null;
  rematchRequestedBy: string | null;
  lastMoveTimestamp: number;
}

const INITIAL_STATE: GameState = {
  board: Array(9).fill(null),
  xIsNext: true,
  winner: null,
  winLine: null,
  rematchRequestedBy: null,
  lastMoveTimestamp: Date.now()
};

export default function TicTacToeOnline() {
  const { matchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const match = location.state?.match as MatchState | undefined;
  
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [service, setService] = useState<MatchmakingService | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [synced, setSynced] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [floatingEmotes, setFloatingEmotes] = useState<{id: string, emoji: string, x: number}[]>([]);

  // Identify players
  // Player 1 in match.players array is X, Player 2 is O
  const isPlayerX = match?.players[0]?.id === profile?.id;
  const mySymbol: Cell = isPlayerX ? "X" : "O";
  const opponent = match?.players.find(p => p.id !== profile?.id);
  const isMyTurn = (gameState.xIsNext && mySymbol === "X") || (!gameState.xIsNext && mySymbol === "O");

  // Timer Effect
  useEffect(() => {
    if (gameState.winner || opponentLeft || !synced) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.lastMoveTimestamp) / 1000);
      const remaining = Math.max(0, 15 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0 && isMyTurn) {
        // Auto-play a random move to prevent stalling
        const emptyIndices = gameState.board.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
        if (emptyIndices.length > 0) {
          const randomIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          handleCellClick(randomIdx);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.lastMoveTimestamp, gameState.winner, opponentLeft, isMyTurn, synced, gameState.board]);


  useEffect(() => {
    if (!matchId || !profile || !match) {
      navigate("/multiplayer");
      return;
    }

    const s = new MatchmakingService();
    s.connectToMatch(matchId);
    
    s.onGameStateUpdate = (payload) => {
      if (payload.type === "MOVE") {
        setGameState(payload.state);
      } else if (payload.type === "REMATCH") {
        setGameState(payload.state);
      } else if (payload.type === "LEAVE") {
        setOpponentLeft(true);
      } else if (payload.type === "EMOTE") {
        setFloatingEmotes(prev => [...prev, { id: Math.random().toString(), emoji: payload.emoji, x: payload.x }]);
        setTimeout(() => setFloatingEmotes(p => p.slice(1)), 2000);
        audio.playClick(400, 0.1, "sine");
      } else if (payload.type === "SYNC") {
        setGameState(payload.state);
        setSynced(true);
      }
    };

    // Host sends initial sync
    if (isPlayerX) {
      setTimeout(() => {
        s.sendGameStateUpdate({ type: "SYNC", state: INITIAL_STATE });
        setSynced(true);
      }, 500);
    }

    setService(s);

    return () => {
      s.sendGameStateUpdate({ type: "LEAVE" });
      s.disconnectFromMatch();
    };
  }, [matchId, profile, match, navigate, isPlayerX]);

  const checkWin = (b: Cell[]): { winner: Cell, line: number[] } | null => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b1, c] of lines) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return { winner: b[a], line: [a,b1,c] };
    }
    return null;
  };

  const handleCellClick = async (index: number) => {
    audio.play("tictactoe", "place");
    if (gameState.winner || gameState.board[index] || !isMyTurn || opponentLeft) return;

    const newBoard = [...gameState.board];
    newBoard[index] = mySymbol;
    
    const winCheck = checkWin(newBoard);
    const isDraw = !winCheck && newBoard.every(c => c !== null);
    
    let winner: Cell | "DRAW" | null = winCheck?.winner || null;
    if (isDraw) winner = "DRAW";

    const newState: GameState = {
      ...gameState,
      board: newBoard,
      xIsNext: !gameState.xIsNext,
      winner,
      winLine: winCheck?.line || null
    };

    setGameState(newState);
    service?.sendGameStateUpdate({ type: "MOVE", state: newState });

    if (winner && winner !== "DRAW") audio.play("tictactoe", "win");
    else if (winner === "DRAW") audio.play("tictactoe", "draw");

    // Payout Logic (Only Host triggers economy to prevent double billing)
    if (winner && isPlayerX && match) {
      if (winner === "X" || winner === "O") {
        const winnerId = winner === "X" ? match.players[0].id : match.players[1].id;
        // Mock economy injection for winner
        await (supabase as any).rpc("update_user_tokens", { p_user_id: winnerId, p_amount_change: 50 });
      }
    }
  };

  
  const sendEmote = (emoji: string) => {
    const x = Math.random() * 80 + 10;
    setFloatingEmotes(prev => [...prev, { id: Math.random().toString(), emoji, x }]);
    setTimeout(() => setFloatingEmotes(p => p.slice(1)), 2000);
    audio.playClick(400, 0.1, "sine");
    service?.sendGameStateUpdate({ type: "EMOTE", emoji, x });
  };

  const handleRematch = () => {
    if (gameState.rematchRequestedBy && gameState.rematchRequestedBy !== profile?.id) {
      // Both agreed, restart
      const newState: GameState = { ...INITIAL_STATE };
      setGameState(newState);
      service?.sendGameStateUpdate({ type: "REMATCH", state: newState });
    } else {
      // Request rematch
      const newState = { ...gameState, rematchRequestedBy: profile?.id as string };
      setGameState(newState);
      service?.sendGameStateUpdate({ type: "MOVE", state: newState });
    }
  };

  if (!match) return null;

  return (
    <GameShell onClose={() => navigate("/multiplayer")}>
      <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
        
        {/* Header */}
        <div className="mb-8 w-full max-w-md flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
          <div className={`flex flex-col items-center ${mySymbol === "X" ? "ring-2 ring-emerald-500 rounded-lg p-2" : "opacity-50"}`}>
            <span className="text-emerald-400 font-bold text-2xl">X</span>
            <span className="text-xs">{match.players[0].username}</span>
          </div>
          <div className="text-2xl font-black text-white/20">VS</div>
          <div className={`flex flex-col items-center ${mySymbol === "O" ? "ring-2 ring-rose-500 rounded-lg p-2" : "opacity-50"}`}>
            <span className="text-rose-400 font-bold text-2xl">O</span>
            <span className="text-xs">{match.players[1].username}</span>
          </div>
        </div>

        {/* Status Tracker */}
        <div className="mb-6 h-8 flex items-center justify-center">
          {opponentLeft ? (
            <div className="text-red-400 font-bold flex items-center gap-2"><AlertTriangle size={18} /> Opponent disconnected</div>
          ) : gameState.winner ? (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-2xl font-black text-yellow-400 flex items-center gap-2">
              {gameState.winner === "DRAW" ? "IT'S A DRAW!" : gameState.winner === mySymbol ? <><Trophy className="text-yellow-400"/> YOU WIN!</> : "YOU LOSE!"}
            </motion.div>
          ) : (
            <div className="text-xl font-bold">
              {isMyTurn ? <span className="text-[#66bdf2] flex items-center gap-2">Your Turn ({mySymbol}) <Clock size={16} className={timeLeft <= 5 ? "text-red-500 animate-pulse" : ""} /> {timeLeft}s</span> : <span className="text-white/40 flex items-center gap-2">Waiting for {opponent?.username}... <Clock size={16} /> {timeLeft}s</span>}
            </div>
          )}
        </div>

        {/* Board */}
        <div className="grid grid-cols-3 gap-3 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {gameState.board.map((cell, i) => {
            const isWinCell = gameState.winLine?.includes(i);
            return (
              <motion.button
                key={i}
                whileHover={{ scale: !cell && !gameState.winner && isMyTurn ? 1.05 : 1 }}
                whileTap={{ scale: !cell && !gameState.winner && isMyTurn ? 0.95 : 1 }}
                onClick={() => handleCellClick(i)}
                disabled={!!cell || !!gameState.winner || !isMyTurn || opponentLeft}
                className={`
                  w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center rounded-2xl text-6xl font-black transition-all
                  ${!cell ? "bg-black/40 hover:bg-black/60 shadow-inner cursor-pointer" : "bg-black/80 shadow-2xl cursor-default"}
                  ${isWinCell ? "ring-4 ring-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)] z-10" : ""}
                `}
              >
                {cell === "X" && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">X</motion.span>
                )}
                {cell === "O" && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]">O</motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Game Over Actions */}
        <AnimatePresence>
          {(gameState.winner || opponentLeft) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex gap-4">
              <button
                onClick={() => navigate("/multiplayer")}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <ArrowLeft size={18} /> Leave Match
              </button>
              
              {!opponentLeft && (
                <button
                  onClick={handleRematch}
                  disabled={gameState.rematchRequestedBy === profile?.id}
                  className="px-6 py-3 rounded-xl bg-[#66bdf2] text-black font-bold hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw size={18} />
                  {gameState.rematchRequestedBy === profile?.id 
                    ? "Waiting for opponent..." 
                    : gameState.rematchRequestedBy 
                      ? "Accept Rematch" 
                      : "Rematch"}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    
        {/* Floating Emotes */}
        <AnimatePresence>
          {floatingEmotes.map(emote => (
            <motion.div
              key={emote.id}
              initial={{ opacity: 0, y: 0, x: `${emote.x}vw` }}
              animate={{ opacity: [0, 1, 0], y: -300 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="fixed bottom-20 text-6xl pointer-events-none z-50 drop-shadow-2xl"
            >
              {emote.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Emote Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
          {["??","??","??","??","??","??"].map(emoji => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => sendEmote(emoji)}
              className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-full transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>

    </GameShell>
  );
}
