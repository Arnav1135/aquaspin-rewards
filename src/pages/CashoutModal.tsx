// src/pages/CashoutModal.tsx
// Cashout request modal — UPI / PayPal

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Smartphone, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { invokeEdgeFunction } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatTokens } from '@/lib/utils';
import type { CashoutResult } from '@/types/database';
import toast from 'react-hot-toast';

interface CashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Method = 'upi' | 'paypal';
type Phase = 'form' | 'confirm' | 'success' | 'error';

const CASHOUT_OPTIONS = [1000, 2000, 5000, 10000];

export function CashoutModal({ isOpen, onClose }: CashoutModalProps) {
  const { profile, refreshProfile, isGuest } = useAuthStore();

  const [method, setMethod] = useState<Method>('upi');
  const [paymentAddress, setPaymentAddress] = useState('');
  const [amountTokens, setAmountTokens] = useState(1000);
  const [phase, setPhase] = useState<Phase>('form');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CashoutResult | null>(null);

  const amountUSD = amountTokens / 1000;
  const canCashout = profile && profile.tokens >= amountTokens;

  const handleReset = () => {
    setPhase('form');
    setPaymentAddress('');
    setAmountTokens(1000);
    setResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!profile || !paymentAddress.trim()) {
      toast.error('Please enter your payment address');
      return;
    }

    if (isGuest) {
      toast.error('Sign up to cash out your tokens!');
      return;
    }

    setPhase('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction<CashoutResult>('cashout', {
        amount_tokens: amountTokens,
        method,
        payment_address: paymentAddress.trim(),
      });

      if (error || !data?.success) {
        setResult({ success: false, error: error ?? data?.error ?? 'Failed' });
        setPhase('error');
        return;
      }

      setResult(data);
      setPhase('success');
      await refreshProfile();
    } catch {
      setPhase('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cash Out Tokens" size="md">
      <AnimatePresence mode="wait">

        {/* ── Form phase ── */}
        {phase === 'form' && (
          <motion.div
            key="form"
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Exchange rate info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-neon/5 border border-cyan-neon/20">
              <span className="text-sm text-text-secondary">Exchange Rate</span>
              <span className="font-mono font-semibold text-cyan-neon">1000 tokens = $1.00 USD</span>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Available Balance</span>
              <span className="font-mono font-bold text-text-primary">
                {formatTokens(profile?.tokens ?? 0)} tokens
              </span>
            </div>

            {/* Amount selector */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">Amount to Cash Out</label>
              <div className="grid grid-cols-2 gap-2">
                {CASHOUT_OPTIONS.filter(opt => opt <= (profile?.tokens ?? 0)).map((opt) => (
                  <button
                    key={opt}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                      amountTokens === opt
                        ? 'border-cyan-neon bg-cyan-neon/15 text-cyan-neon'
                        : 'border-navy-600 text-text-secondary hover:border-navy-500'
                    }`}
                    onClick={() => setAmountTokens(opt)}
                  >
                    <span className="font-mono">{formatTokens(opt)}</span> tokens
                    <span className="block text-2xs text-muted">${opt / 1000}.00 USD</span>
                  </button>
                ))}
              </div>
              {CASHOUT_OPTIONS.every(opt => opt > (profile?.tokens ?? 0)) && (
                <p className="text-sm text-danger mt-2">
                  Need {formatTokens(1000 - (profile?.tokens ?? 0))} more tokens to cash out.
                </p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">Payment Method</label>
              <div className="flex gap-2">
                {(['upi', 'paypal'] as Method[]).map((m) => (
                  <button
                    key={m}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                      method === m
                        ? 'border-cyan-neon bg-cyan-neon/15 text-cyan-neon'
                        : 'border-navy-600 text-text-secondary hover:border-navy-500'
                    }`}
                    onClick={() => setMethod(m)}
                  >
                    {m === 'upi' ? <Smartphone size={16} /> : <Globe size={16} />}
                    {m === 'upi' ? 'UPI (India)' : 'PayPal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Address input */}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">
                {method === 'upi' ? 'UPI ID (e.g., yourname@paytm)' : 'PayPal Email Address'}
              </label>
              <input
                type={method === 'paypal' ? 'email' : 'text'}
                placeholder={method === 'upi' ? 'yourname@upi' : 'you@email.com'}
                value={paymentAddress}
                onChange={(e) => setPaymentAddress(e.target.value)}
                className="input-neon"
                id="payment-address-input"
              />
            </div>

            {/* Amount summary */}
            {canCashout && paymentAddress && (
              <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                <p className="text-sm text-text-secondary">
                  You'll receive <strong className="text-success">${amountUSD.toFixed(2)} USD</strong>{' '}
                  for <strong>{formatTokens(amountTokens)} tokens</strong> to{' '}
                  <strong className="text-text-primary">{paymentAddress}</strong>
                </p>
              </div>
            )}

            <Button
              variant="gold"
              fullWidth
              size="lg"
              disabled={!canCashout || !paymentAddress.trim()}
              onClick={handleSubmit}
              id="cashout-submit-btn"
            >
              <TrendingUp size={18} />
              Request ${amountUSD.toFixed(2)} USD Cashout
            </Button>

            <p className="text-2xs text-muted text-center">
              Cashouts are processed manually within 24–48 hours. Minimum: 1000 tokens ($1 USD).
            </p>
          </motion.div>
        )}

        {/* ── Confirm phase ── */}
        {phase === 'confirm' && (
          <motion.div
            key="confirm"
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="text-center">
              <p className="text-4xl mb-3">💸</p>
              <h3 className="font-display text-xl font-bold text-text-primary mb-1">Confirm Cashout</h3>
              <p className="text-text-secondary text-sm">Please review your cashout details</p>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Amount', value: `${formatTokens(amountTokens)} tokens → $${amountUSD.toFixed(2)} USD` },
                { label: 'Method', value: method === 'upi' ? 'UPI Transfer' : 'PayPal' },
                { label: 'Address', value: paymentAddress },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between p-3 rounded-xl bg-navy-800">
                  <span className="text-sm text-muted">{label}</span>
                  <span className="text-sm font-medium text-text-primary max-w-[60%] text-right break-all">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setPhase('form')}>Back</Button>
              <Button variant="gold" fullWidth loading={loading} onClick={handleConfirm} id="cashout-confirm-btn">
                Confirm Cashout
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Success phase ── */}
        {phase === 'success' && (
          <motion.div
            key="success"
            className="text-center space-y-4 py-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle size={56} className="text-success mx-auto" />
            </motion.div>
            <div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-2">Request Submitted!</h3>
              <p className="text-text-secondary text-sm">
                Your cashout of <strong className="text-gold-neon">${amountUSD.toFixed(2)} USD</strong> has been submitted.
                The owner will process it within <strong>24–48 hours</strong>.
              </p>
              <p className="text-2xs text-muted mt-2">Transaction ID: {result?.transaction_id?.slice(0, 8)}...</p>
            </div>
            <Button variant="primary" fullWidth onClick={handleClose}>Done</Button>
          </motion.div>
        )}

        {/* ── Error phase ── */}
        {phase === 'error' && (
          <motion.div
            key="error"
            className="text-center space-y-4 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle size={48} className="text-danger mx-auto" />
            <div>
              <h3 className="font-display text-lg font-bold text-text-primary mb-1">Cashout Failed</h3>
              <p className="text-text-secondary text-sm">{result?.error ?? 'An error occurred. Please try again.'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" fullWidth onClick={handleClose}>Close</Button>
              <Button variant="primary" fullWidth onClick={() => setPhase('form')}>Retry</Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </Modal>
  );
}
