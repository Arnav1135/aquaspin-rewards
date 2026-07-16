// src/components/games/MathsQuizGame.tsx — Premium Maths Blitz
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Question = { a: number; b: number; op: '+' | '-' | '×' | '÷'; answer: number; choices: number[] };
type Phase = 'idle' | 'playing' | 'dead';

function makeQuestion(level: number): Question {
  const ops: ('+' | '-' | '×' | '÷')[] = level < 3 ? ['+', '-'] : level < 6 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 0, b = 0, answer = 0;
  switch (op) {
    case '+': a = Math.floor(Math.random()*(10*level+10)); b = Math.floor(Math.random()*(10*level+10)); answer = a+b; break;
    case '-': a = Math.floor(Math.random()*(10*level+10)); b = Math.floor(Math.random()*(a+1)); answer = a-b; break;
    case '×': a = Math.floor(Math.random()*12+1); b = Math.floor(Math.random()*12+1); answer = a*b; break;
    case '÷': b = Math.floor(Math.random()*11+2); answer = Math.floor(Math.random()*12+1); a = b*answer; break;
  }
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const w = answer + (Math.floor(Math.random()*10)-5);
    if (w !== answer && !wrongs.has(w)) wrongs.add(w);
  }
  const choices = [...wrongs, answer].sort(() => Math.random()-0.5);
  return { a, b, op, answer, choices };
}

export function MathsQuizGame({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(15);
  const [totalQ, setTotalQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('mq-best')||'0'));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockRef = useRef(false);

  const nextQuestion = useCallback((lvl: number) => {
    setQuestion(makeQuestion(lvl));
    setTimeLeft(Math.max(5, 15 - lvl));
    setChosen(null); setFeedback(null);
    lockRef.current = false;
  }, []);

  const startGame = useCallback(() => {
    setScore(0); setStreak(0); setLevel(1); setTotalQ(0); setCorrect(0);
    setPhase('playing');
    nextQuestion(1);
    playTone(500, 0.05, 'sine', 0.08);
  }, [nextQuestion]);

  const endGame = useCallback((finalScore: number) => {
    setPhase('dead');
    const nb = Math.max(finalScore, best);
    setBest(nb); localStorage.setItem('mq-best', String(nb));
    if (timerRef.current) clearInterval(timerRef.current);
  }, [best]);

  const answer = useCallback((choice: number) => {
    if (lockRef.current || !question || phase !== 'playing') return;
    lockRef.current = true;
    setChosen(choice);
    const isRight = choice === question.answer;
    setFeedback(isRight ? 'correct' : 'wrong');
    if (isRight) {
      const newStreak = streak + 1;
      const bonus = Math.floor(newStreak / 3) * 5;
      const pts = 10 + bonus + Math.floor(timeLeft * 1.5);
      const newScore = score + pts;
      const newCorrect = correct + 1;
      const newTotal = totalQ + 1;
      const newLevel = Math.min(10, Math.floor(newTotal / 5) + 1);
      setStreak(newStreak); setScore(newScore); setCorrect(newCorrect); setTotalQ(newTotal); setLevel(newLevel);
      playTone(700 + newStreak*30, 0.06, 'sine', 0.12); vibrate(15);
      if (newStreak >= 3) toast.success(`🔥 ${newStreak} streak! +${bonus} bonus`);
      setTimeout(() => { if (newTotal >= 20) { endGame(newScore); return; } nextQuestion(newLevel); }, 600);
    } else {
      setStreak(0);
      const newTotal = totalQ + 1;
      const newScore = Math.max(0, score - 5);
      setTotalQ(newTotal); setScore(newScore);
      playTone(200, 0.1, 'sawtooth', 0.15); vibrate(60);
      setTimeout(() => { if (newTotal >= 20) { endGame(newScore); return; } nextQuestion(level); }, 700);
    }
  }, [question, phase, streak, score, timeLeft, correct, totalQ, level, nextQuestion, endGame]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!lockRef.current) {
            lockRef.current = true; setFeedback('wrong'); setStreak(0);
            playTone(150, 0.1, 'sawtooth', 0.15); vibrate(60);
            const newTotal = totalQ + 1;
            setTotalQ(newTotal);
            setTimeout(() => { if (newTotal >= 20) { endGame(score); return; } nextQuestion(level); }, 700);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [question, phase]);

  const opColor = { '+': '#66bdf2', '-': '#7b8bc1', '×': '#66bdf2', '÷': '#F97316' };
  const timeRatio = timeLeft / Math.max(5, 15 - level);

  return (
    <div className="flex flex-col items-center gap-5 min-h-screen px-4 py-6"
      style={{ background: 'linear-gradient(135deg, #0d0820 0%, #1a0a2e 100%)' }}>
      {/* Header */}
      <div className="flex w-full max-w-sm justify-between items-center">
        <div className="flex flex-col">
          <span className="text-white/50 text-xs">Level {level}</span>
          <span className="text-white font-bold text-xl">{score}pts</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white/50 text-xs">Q {totalQ}/20</span>
          {streak >= 2 && <span className="text-orange-400 font-bold text-sm">🔥×{streak}</span>}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-white/50 text-xs">Best</span>
          <span className="text-yellow-400 font-bold text-sm">{best}pts</span>
        </div>
      </div>

      {phase === 'playing' && question && (
        <>
          {/* Timer bar */}
          <div className="w-full max-w-sm h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: timeRatio > 0.5 ? '#66bdf2' : timeRatio > 0.25 ? '#FFD700' : '#7b8bc1' }}
              animate={{ width: `${timeRatio*100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-white/60 text-sm">{timeLeft}s</span>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div key={question.a+question.op+question.b}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex flex-col items-center px-8 py-6 rounded-3xl w-full max-w-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)' }}
            >
              <span className="text-white/50 text-xs mb-1">{['Easy','Easy','Med','Med','Hard','Hard','Expert','Expert','🔥Expert','🔥Master'][level-1]}</span>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-5xl">{question.a}</span>
                <span className="font-bold text-4xl" style={{ color: opColor[question.op] }}>{question.op}</span>
                <span className="text-white font-bold text-5xl">{question.b}</span>
                <span className="text-white/50 font-bold text-4xl">=</span>
                <span className="text-white/30 font-bold text-5xl">?</span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Choices */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {question.choices.map((c, i) => {
              let bg = 'rgba(255,255,255,0.08)';
              let border = 'rgba(255,255,255,0.15)';
              let color = '#fff';
              if (chosen !== null) {
                if (c === question.answer) { bg = 'rgba(61,220,151,0.25)'; border = '#66bdf2'; color = '#66bdf2'; }
                else if (c === chosen) { bg = 'rgba(247,108,108,0.25)'; border = '#7b8bc1'; color = '#7b8bc1'; }
              }
              return (
                <motion.button key={i} onClick={() => answer(c)}
                  whileHover={{ scale: chosen === null ? 1.04 : 1 }}
                  whileTap={{ scale: chosen === null ? 0.96 : 1 }}
                  className="py-4 rounded-2xl font-bold text-2xl transition-all"
                  style={{ background: bg, border: `2px solid ${border}`, color }}
                  animate={feedback && c === question.answer ? { scale: [1, 1.1, 1] } : {}}
                >
                  {c}
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="text-6xl">🔢</div>
          <h2 className="text-white font-bold text-3xl">Maths Blitz</h2>
          <p className="text-white/60 text-center text-sm max-w-xs">Answer 20 rapid-fire maths questions. Score big with streaks and fast answers!</p>
          <div className="flex gap-6 mt-2">
            <div className="text-center"><span className="text-yellow-400 font-bold text-xl">{best}</span><br/><span className="text-white/40 text-xs">Best</span></div>
          </div>
          <Button variant="primary" onClick={startGame} className="mt-2 px-10 py-3 text-lg">🎮 Start</Button>
        </div>
      )}

      {phase === 'dead' && (
        <div className="flex flex-col items-center gap-4 mt-6">
          <div className="text-5xl">🏁</div>
          <h2 className="text-white font-bold text-2xl">Game Over!</h2>
          <div className="flex gap-6">
            <div className="text-center"><span className="text-green-400 font-bold text-2xl">{score}</span><br/><span className="text-white/50 text-xs">Score</span></div>
            <div className="text-center"><span className="text-yellow-400 font-bold text-2xl">{best}</span><br/><span className="text-white/50 text-xs">Best</span></div>
            <div className="text-center"><span className="text-blue-400 font-bold text-2xl">{correct}/20</span><br/><span className="text-white/50 text-xs">Correct</span></div>
          </div>
          <Button variant="primary" onClick={startGame} className="mt-2 px-8 py-3">▶ Play Again</Button>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={onClose} className="mt-auto">Exit</Button>
    </div>
  );
}
