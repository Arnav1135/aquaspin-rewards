// src/components/games/QuizGame.tsx
// Multiple-choice trivia quiz — earn 15 tokens per correct answer with Cyberpunk Holographic HUD

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, Sparkles, Zap, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { playTone } from '@/lib/utils';
import toast from 'react-hot-toast';

const QUESTIONS = [
  { q: 'What does "UPI" stand for?', options: ['Unified Payment Interface', 'Universal Payment Index', 'United Pay Institution', 'Unified Purchase ID'], correct: 0 },
  { q: 'How many tokens equal $1 USD in AquaSpin?', options: ['500', '750', '1000', '1500'], correct: 2 },
  { q: 'What is the capital of India?', options: ['Mumbai', 'Chennai', 'Kolkata', 'New Delhi'], correct: 3 },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1 },
  { q: 'What is 2 to the power of 10?', options: ['512', '1000', '1024', '2048'], correct: 2 },
  { q: 'Who invented the World Wide Web?', options: ['Bill Gates', 'Tim Berners-Lee', 'Steve Jobs', 'Mark Zuckerberg'], correct: 1 },
  { q: 'What programming language is TypeScript based on?', options: ['Java', 'Python', 'JavaScript', 'C++'], correct: 2 },
  { q: 'Which bank operates UPI in India?', options: ['HDFC', 'NPCI', 'RBI', 'SBI'], correct: 1 },
  { q: 'What does "PWA" stand for?', options: ['Progressive Web App', 'Personal Web Access', 'Public Web Application', 'Portable Web Agent'], correct: 0 },
  { q: 'How many segments does the AquaSpin wheel have?', options: ['8', '10', '12', '16'], correct: 2 },
];

const TOKENS_PER_CORRECT = 15;

interface QuizGameProps { onClose: () => void; }

export function QuizGame({ onClose }: QuizGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [streak, setStreak] = useState(0);

  const question = QUESTIONS[qIndex];
  const progress = (qIndex / QUESTIONS.length) * 100;
  const tokensEarned = correct * TOKENS_PER_CORRECT;

  const startGame = () => {
    setPhase('playing');
    setQIndex(0);
    setSelected(null);
    setCorrect(0);
    setStreak(0);
    setAnswered(false);
  };

  const handleSelect = (optionIndex: number) => {
    if (answered) return;
    setSelected(optionIndex);
    setAnswered(true);

    const isCorrect = optionIndex === question.correct;
    if (isCorrect) {
      setCorrect(c => c + 1);
      setStreak(s => s + 1);
      playTone(660, 0.2, 'sine', 0.3);
    } else {
      setStreak(0);
      playTone(220, 0.2, 'sawtooth', 0.2);
    }
  };

  const handleNext = async () => {
    if (qIndex + 1 >= QUESTIONS.length) {
      setPhase('result');
      // Award tokens
      const earned = correct * TOKENS_PER_CORRECT;
      if (profile && earned > 0) {
        try {
          if (!profile.id.startsWith('guest')) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('users') as any).update({
              tokens: profile.tokens + earned,
              total_earned: profile.total_earned + earned,
            }).eq('id', profile.id);
          }
          updateProfile({ tokens: profile.tokens + earned });
          toast.success(`Quiz complete! +${earned} tokens! 🎯`);
        } catch { /* fail silently */ }
      }
    } else {
      setQIndex(q => q + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const getOptionClass = (i: number) => {
    if (!answered) {
      return 'border-cyan-500/30 hover:border-cyan-400 bg-navy-900/70 hover:bg-navy-800/80 text-text-primary hover:shadow-[0_0_15px_rgba(0,243,255,0.2)] cursor-pointer';
    }
    if (i === question.correct) {
      return 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.35)] cursor-default';
    }
    if (i === selected && i !== question.correct) {
      return 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.35)] cursor-default';
    }
    return 'border-navy-800 bg-navy-950/60 opacity-40 cursor-default';
  };

  return (
    <div className="relative flex flex-col items-center p-6 gap-6 min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Background Holographic Scanlines & Ambient Radial Lighting */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      {phase === 'ready' && (
        <motion.div 
          className="relative text-center space-y-6 mt-8 z-10 max-w-md w-full p-8 rounded-3xl border border-cyan-500/30 bg-navy-900/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,243,255,0.15)]" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative inline-block">
            <div className="text-7xl drop-shadow-[0_0_25px_rgba(0,243,255,0.6)]">🎯</div>
            <motion.div 
              className="absolute -top-2 -right-2 text-cyan-400"
              animate={{ rotate: 360 }} 
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            >
              <Zap size={24} />
            </motion.div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider mb-2">
              <Sparkles size={12} /> Quantum Trivia Terminal
            </div>
            <h2 className="font-display text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300 mb-2">
              Trivia Challenge
            </h2>
            <p className="text-text-secondary text-sm">Test neural recall across {QUESTIONS.length} quantum queries.</p>
            <p className="text-cyan-neon font-bold mt-2 text-base drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">
              +{TOKENS_PER_CORRECT} tokens per correct answer!
            </p>
          </div>
          <div className="flex flex-col gap-3 max-w-[220px] mx-auto pt-2">
            <Button variant="primary" size="lg" onClick={startGame} id="start-quiz-btn" className="shadow-[0_0_20px_rgba(0,243,255,0.3)]">
              Launch Console
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted hover:text-white text-xs">
              Close Game
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'playing' && (
        <div className="relative z-10 w-full max-w-lg space-y-4">
          {/* Cyberpunk Status Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-navy-900/80 border border-cyan-500/20 backdrop-blur-md text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-muted font-mono">Q-{qIndex + 1} / {QUESTIONS.length}</span>
            </div>
            {streak > 1 && (
              <motion.span 
                initial={{ scale: 0.8 }} 
                animate={{ scale: 1 }} 
                className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30"
              >
                🔥 {streak}x Streak!
              </motion.span>
            )}
            <span className="text-cyan-neon font-bold font-mono drop-shadow-[0_0_8px_rgba(0,243,255,0.4)]">
              {correct} ACCURATE ✓
            </span>
          </div>

          <div className="relative">
            <ProgressBar value={progress} height={6} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ duration: 0.2 }}
              className="relative p-6 rounded-3xl border border-cyan-500/30 bg-navy-900/90 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,243,255,0.12)] overflow-hidden"
            >
              <div className="flex items-start gap-3 mb-5">
                <HelpCircle size={22} className="text-cyan-400 shrink-0 mt-0.5" />
                <p className="font-semibold text-lg text-text-primary leading-snug">
                  {question.q}
                </p>
              </div>

              <div className="space-y-3">
                {question.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl border text-sm font-medium transition-all duration-200 backdrop-blur-md ${getOptionClass(i)}`}
                    onClick={() => handleSelect(i)}
                    whileHover={!answered ? { scale: 1.015, x: 4 } : {}}
                    whileTap={!answered ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs text-muted">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {answered && i === question.correct && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle size={18} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        </motion.div>
                      )}
                      {answered && i === selected && i !== question.correct && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <XCircle size={18} className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {answered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                  <Button variant="primary" fullWidth size="lg" onClick={handleNext} id="next-question-btn" className="shadow-[0_0_20px_rgba(0,243,255,0.25)]">
                    {qIndex + 1 >= QUESTIONS.length ? 'Calculate Rewards →' : 'Next Transmission →'}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {phase === 'result' && (
        <motion.div 
          className="relative text-center space-y-6 mt-8 z-10 max-w-md w-full p-8 rounded-3xl border border-gold-neon/40 bg-navy-900/90 backdrop-blur-xl shadow-[0_0_50px_rgba(255,215,0,0.2)]" 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="relative inline-block">
            <Trophy size={64} className="text-gold-neon mx-auto drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]" />
            <motion.div 
              className="absolute -top-1 -right-2 text-cyan-400"
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }} 
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles size={24} />
            </motion.div>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold text-text-primary mb-2">Quiz Concluded!</h2>
            <p className="text-text-secondary mb-2">{correct} of {QUESTIONS.length} answers verified</p>
            <div className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gold-neon/15 border border-gold-neon/40 shadow-[0_0_25px_rgba(255,215,0,0.25)] mt-2">
              <span className="font-display font-extrabold text-3xl text-gold-neon">+{tokensEarned}</span>
              <span className="text-text-primary font-semibold text-sm">TOKENS CREDITED</span>
            </div>
            {correct === QUESTIONS.length && (
              <p className="text-emerald-400 font-bold mt-3 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                🏆 Flawless Victory! Maximum Accuracy!
              </p>
            )}
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="neon" size="lg" onClick={startGame}>Replay Quiz</Button>
            <Button variant="ghost" size="lg" onClick={onClose}>Done</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
