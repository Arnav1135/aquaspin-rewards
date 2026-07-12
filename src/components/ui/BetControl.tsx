// src/components/ui/BetControl.tsx
// Reusable bet input control for Stake-style games

import { Coins } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { Button } from '@/components/ui/Button';

interface BetControlProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;
  disabled?: boolean;
  minBet?: number;
  maxBet?: number;
}

export function BetControl({
  betAmount,
  setBetAmount,
  disabled = false,
  minBet = 10,
  maxBet = 5000,
}: BetControlProps) {
  const { profile } = useAuthStore();
  const balance = profile?.tokens ?? 0;

  const handleHalf = () => {
    const next = Math.max(minBet, Math.floor(betAmount / 2));
    setBetAmount(next);
  };

  const handleDouble = () => {
    const next = Math.min(Math.min(balance, maxBet), betAmount * 2);
    setBetAmount(next);
  };

  const handleMin = () => {
    setBetAmount(minBet);
  };

  const handleMax = () => {
    setBetAmount(Math.min(balance, maxBet));
  };

  const handleInputChange = (val: string) => {
    const parsed = parseInt(val.replace(/[^0-9]/g, '')) || 0;
    setBetAmount(parsed);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-text-secondary">Bet Amount</span>
        <span className="text-muted flex items-center gap-1">
          Balance: <span className="font-semibold text-gold-neon">{balance}</span> <Coins size={10} className="text-gold-neon" />
        </span>
      </div>

      <div className="flex rounded-xl bg-navy-950 p-1 border border-navy-700/60 focus-within:border-cyan-neon/50 transition-colors">
        <div className="flex-1 flex items-center px-3 gap-2">
          <Coins size={14} className="text-gold-neon" />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={betAmount === 0 ? '' : betAmount}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-text-primary placeholder:text-muted py-1.5 font-mono"
            placeholder="0"
          />
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHalf}
            disabled={disabled || betAmount <= minBet}
            className="px-2 py-1 text-2xs text-text-secondary hover:bg-navy-800 rounded-lg min-w-8"
          >
            ½
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDouble}
            disabled={disabled || betAmount * 2 > Math.min(balance, maxBet)}
            className="px-2 py-1 text-2xs text-text-secondary hover:bg-navy-800 rounded-lg min-w-8"
          >
            2x
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMin}
            disabled={disabled}
            className="px-2 py-1 text-2xs text-muted hover:bg-navy-800 rounded-lg min-w-8"
          >
            Min
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMax}
            disabled={disabled || balance < minBet}
            className="px-2 py-1 text-2xs text-muted hover:bg-navy-800 rounded-lg min-w-8"
          >
            Max
          </Button>
        </div>
      </div>

      {betAmount > balance && (
        <p className="text-2xs text-danger font-medium animate-pulse">
          ⚠️ Insufficient balance
        </p>
      )}
    </div>
  );
}
