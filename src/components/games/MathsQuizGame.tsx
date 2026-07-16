// src/components/games/MathsQuizGame.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Trophy, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MathsQuizGameProps {
  onClose: () => void;
}

type Question = {
  text: string;
  options: number[];
  answer: number;
};

type QuizCategory = 'all' | 'arithmetic' | 'algebra' | 'geometry';

export function MathsQuizGame({ onClose }: MathsQuizGameProps) {
  const [category, setCategory] = useState<QuizCategory>('all');
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answered, setAnswered] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const maxTime = 15;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateQuestion = useCallback((): Question => {
    let num1 = 0, num2 = 0;
    let text = '';
    let answer = 0;
    
    // Choose actual sub-type based on category select
    const activeCat = category === 'all' 
      ? (['arithmetic', 'algebra', 'geometry'][Math.floor(Math.random() * 3)] as QuizCategory)
      : category;

    if (activeCat === 'algebra') {
      const x = Math.floor(Math.random() * 9) + 2;
      const coeff = Math.floor(Math.random() * 5) + 2;
      const constant = Math.floor(Math.random() * 20) + 1;
      const rightHand = coeff * x + constant;
      text = `Solve for x: ${coeff}x + ${constant} = ${rightHand}`;
      answer = x;
    } else if (activeCat === 'geometry') {
      const shape = ['rectangle', 'triangle', 'circle'][Math.floor(Math.random() * 3)];
      if (shape === 'rectangle') {
        num1 = Math.floor(Math.random() * 9) + 3;
        num2 = Math.floor(Math.random() * 9) + 3;
        text = `Find area of rectangle with width ${num1}m and height ${num2}m`;
        answer = num1 * num2;
      } else if (shape === 'triangle') {
        num1 = Math.floor(Math.random() * 10) + 2;
        num2 = Math.floor(Math.random() * 5) * 2 + 2;
        text = `Find area of triangle with base ${num1}m and height ${num2}m`;
        answer = 0.5 * num1 * num2;
      } else {
        num1 = Math.floor(Math.random() * 4) + 2; // radius
        text = `Find area of circle with radius ${num1}m (use \u03c0 = 3)`;
        answer = 3 * num1 * num1;
      }
    } else {
      // Arithmetic
      const operation = ['+', '-', '*', '/'][Math.floor(Math.random() * 4)];
      if (operation === '+') {
        num1 = Math.floor(Math.random() * 89) + 10;
        num2 = Math.floor(Math.random() * 89) + 10;
        text = `${num1} + ${num2}`;
        answer = num1 + num2;
      } else if (operation === '-') {
        num1 = Math.floor(Math.random() * 89) + 10;
        num2 = Math.floor(Math.random() * (num1 - 5)) + 5;
        text = `${num1} - ${num2}`;
        answer = num1 - num2;
      } else if (operation === '*') {
        num1 = Math.floor(Math.random() * 12) + 3;
        num2 = Math.floor(Math.random() * 12) + 3;
        text = `${num1} \u00d7 ${num2}`;
        answer = num1 * num2;
      } else {
        num2 = Math.floor(Math.random() * 8) + 3;
        answer = Math.floor(Math.random() * 9) + 3;
        num1 = num2 * answer;
        text = `${num1} \u00f7 ${num2}`;
      }
    }

    const options = new Set<number>();
    options.add(answer);
    while (options.size < 4) {
      const variation = Math.floor((Math.random() - 0.5) * 20);
      const wrong = answer + (variation === 0 ? 5 : variation);
      if (wrong > 0) options.add(wrong);
    }

    return {
      text,
      options: Array.from(options).sort(() => Math.random() - 0.5),
      answer
    };
  }, [category]);

  const handleNextQuestion = useCallback(() => {
    setAnswered(null);
    setTimeLeft(maxTime);
    setCurrentQuestion(generateQuestion());
  }, [generateQuestion]);

  const handleAnswer = (selected: number) => {
    if (answered !== null || gameOver) return;
    setAnswered(selected);
    if (timerRef.current) clearInterval(timerRef.current);

    if (selected === currentQuestion?.answer) {
      const gainedScore = Math.max(10, Math.floor(timeLeft * 1.5)) * (1 + combo * 0.1);
      const gainedXp = 5;
      setScore(prev => Math.floor(prev + gainedScore));
      setXp(prev => {
        const nextXp = prev + gainedXp;
        if (nextXp >= level * 50) {
          setLevel(l => l + 1);
          playTone(600, 0.1, 'sine', 0.25);
          toast.success(`Level Up! You are now Level ${level + 1}`, { icon: '⭐' });
        }
        return nextXp;
      });
      setCombo(prev => prev + 1);
      playTone(523, 0.08, 'sine', 0.1);
      vibrate(20);
      toast.success(`Correct! +${Math.floor(gainedScore)} pts`, { id: 'math-quiz-feedback' });
    } else {
      setCombo(0);
      playTone(200, 0.25, 'sawtooth', 0.25);
      vibrate(100);
      toast.error(`Wrong Answer! Correct is ${currentQuestion?.answer}`, { id: 'math-quiz-feedback' });
    }

    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  };

  const startQuiz = () => {
    setScore(0);
    setCombo(0);
    setLevel(1);
    setXp(0);
    setIsPlaying(true);
    setGameOver(false);
    handleNextQuestion();
  };

  useEffect(() => {
    if (isPlaying && !gameOver && answered === null) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameOver(true);
            setIsPlaying(false);
            playTone(180, 0.35, 'sawtooth', 0.3);
            vibrate(200);
            toast.error('Time limit exceeded!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, gameOver, answered, currentQuestion]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #0d1e3d 100%)' }}>
      
      {/* Settings Card */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-widest">
              Maths Blitz
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Quiz Subject</span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              {(['all', 'arithmetic', 'algebra', 'geometry'] as const).map(cat => (
                <button
                  key={cat}
                  disabled={isPlaying}
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 rounded-lg text-3xs font-bold capitalize transition-all ${
                    category === cat 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                      : 'text-slate-500 border border-transparent hover:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Level Info</span>
            <span className="font-mono text-xs font-bold text-cyan-400">Level {level}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-2xs font-mono text-slate-400 font-bold uppercase">
              <span>XP Gauge</span>
              <span>{xp} / {level * 50}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-900">
              <motion.div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500" animate={{ width: `${(xp / (level * 50)) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={startQuiz}>
              Start Blitz
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setGameOver(true); }}>
              Abort Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Panel
          </Button>
        </div>
      </Card>

      {/* Main Board View */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>BLITZ SPEED TIMERS ACTIVE</span>
        </div>

        {isPlaying && currentQuestion ? (
          <div className="w-full max-w-md flex flex-col items-center justify-between h-full space-y-6">
            
            {/* Combo Multiplier indicator */}
            {combo > 1 && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-2xs font-mono font-bold uppercase">
                <Zap size={10} className="animate-bounce" />
                <span>COMBO {combo}X</span>
              </motion.div>
            )}

            {/* Time Bar */}
            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-2xs text-slate-500 font-mono font-bold">
                <span>TIME REMAINING</span>
                <span className={timeLeft <= 4 ? 'text-red-500 animate-pulse' : 'text-slate-400'}>{timeLeft}s</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-900">
                <motion.div 
                  className={`h-full ${timeLeft <= 4 ? 'bg-red-500' : 'bg-cyan-400'}`} 
                  animate={{ width: `${(timeLeft / maxTime) * 100}%` }} 
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Equation statement */}
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 w-full text-center">
              <h3 className="text-xl font-bold tracking-wide leading-relaxed font-mono">
                {currentQuestion.text}
              </h3>
            </div>

            {/* Response Options */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answered === option;
                const isCorrect = option === currentQuestion.answer;
                return (
                  <motion.button
                    key={idx}
                    disabled={answered !== null}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAnswer(option)}
                    className={`p-4 rounded-xl text-center text-sm font-semibold transition-all border outline-none ${
                      answered !== null
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : isSelected
                            ? 'border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                            : 'border-slate-800 bg-slate-900/10 text-slate-600'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
                    }`}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm">
            {gameOver ? (
              <>
                <AlertTriangle size={36} className="text-amber-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-slate-200">BLITZ ENDED</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">Total Score: <span className="text-cyan-400 font-bold">{score} pts</span></p>
                  <p className="text-slate-400">Final Level: <span className="text-indigo-400 font-bold">Lvl {level}</span></p>
                </div>
                <Button variant="neon" size="lg" className="w-full" onClick={startQuiz}>
                  Restart Run
                </Button>
              </>
            ) : (
              <>
                <Zap size={36} className="text-cyan-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Ready for Maths Blitz?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Solve as many equations as you can within the 15-second limit. Combos award score multipliers!
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={startQuiz}>
                  Initiate Run
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
