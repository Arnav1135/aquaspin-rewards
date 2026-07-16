// src/components/games/QuizGame.tsx
// Multiple-choice trivia quiz — earn 15 tokens per correct answer

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trophy } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
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

  const question = QUESTIONS[qIndex];
  const progress = (qIndex / QUESTIONS.length) * 100;
  const tokensEarned = correct * TOKENS_PER_CORRECT;

  const startGame = () => {
    setPhase('playing');
    setQIndex(0);
    setSelected(null);
    setCorrect(0);
    setAnswered(false);
  };

  const handleSelect = (optionIndex: number) => {
    if (answered) return;
    setSelected(optionIndex);
    setAnswered(true);

    const isCorrect = optionIndex === question.correct;
    if (isCorrect) {
      setCorrect(c => c + 1);
      playTone(660, 0.2, 'sine', 0.3);
    } else {
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
      return 'border-[rgba(168,203,234,0.45)] hover:border-[#4A90D9] bg-white cursor-pointer text-[#16213E]';
    }
    if (i === question.correct) {
      return 'border-[#3DDC97] bg-[#3DDC97]/15 text-[#1a8a5c] cursor-default';
    }
    if (i === selected && i !== question.correct) {
      return 'border-[#F76C6C] bg-[#F76C6C]/15 text-[#c04040] cursor-default';
    }
    return 'border-[rgba(168,203,234,0.25)] bg-[#F4F8FC] opacity-50 cursor-default text-[#16213E]';
  };

  return (
    <div className="flex flex-col items-center p-6 gap-6 min-h-[calc(100vh-140px)]">

      {phase === 'ready' && (
        <motion.div className="text-center space-y-6 mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-7xl">🎯</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-[#16213E] mb-2">Trivia Quiz</h2>
            <p className="text-[#4A90D9]">Answer {QUESTIONS.length} questions correctly.</p>
            <p className="text-[#3DDC97] font-semibold mt-1">+{TOKENS_PER_CORRECT} tokens per correct answer!</p>
          </div>
          <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
            <Button variant="primary" size="lg" onClick={startGame} id="start-quiz-btn">Start Quiz</Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close Game
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'playing' && (
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#4A90D9]">Question {qIndex + 1}/{QUESTIONS.length}</span>
            <span className="text-[#3DDC97] font-semibold">{correct} correct ✓</span>
          </div>

          {/* Simple progress bar matching sky design */}
          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-[#4A90D9] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="card-white rounded-2xl p-5"
            >
              <p className="font-semibold text-[#16213E] mb-4 leading-relaxed">{question.q}</p>

              <div className="space-y-2">
                {question.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${getOptionClass(i)}`}
                    onClick={() => handleSelect(i)}
                    whileTap={!answered ? { scale: 0.97 } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt}</span>
                      {answered && i === question.correct && <CheckCircle size={16} className="text-[#3DDC97]" />}
                      {answered && i === selected && i !== question.correct && <XCircle size={16} className="text-[#F76C6C]" />}
                    </div>
                  </motion.button>
                ))}
              </div>

              {answered && (
                <Button variant="primary" fullWidth className="mt-4" onClick={handleNext} id="next-question-btn">
                  {qIndex + 1 >= QUESTIONS.length ? 'See Results' : 'Next Question →'}
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {phase === 'result' && (
        <motion.div className="text-center space-y-6 mt-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Trophy size={56} className="text-[#3DDC97] mx-auto" />
          <div>
            <h2 className="font-display text-2xl font-bold text-[#16213E] mb-2">Quiz Complete!</h2>
            <p className="text-[#4A90D9] mb-1">{correct}/{QUESTIONS.length} correct answers</p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#3DDC97]/15 border border-[#3DDC97]/30 mt-2">
              <span className="font-display font-bold text-2xl text-[#3DDC97]">+{tokensEarned}</span>
              <span className="text-[#4A90D9]">tokens earned!</span>
            </div>
            {correct === QUESTIONS.length && (
              <p className="text-[#3DDC97] font-semibold mt-2">🏆 Perfect Score!</p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="primary" onClick={startGame}>Play Again</Button>
            <Button variant="ghost" onClick={onClose}>Done</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
