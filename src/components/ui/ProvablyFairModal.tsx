import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, CheckCircle2, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProvablyFairStore } from '@/lib/crypto/provablyFairStore';
import { ProvablyFair } from '@/lib/crypto/provablyFair';
import toast from 'react-hot-toast';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName?: string;
}

export function ProvablyFairModal({ isOpen, onClose, gameName }: ProvablyFairModalProps) {
  const {
    clientSeed,
    serverSeedHash,
    nonce,
    previousServerSeed,
    previousClientSeed,
    previousNonce,
    generateNewClientSeed,
    rotateServerSeed
  } = useProvablyFairStore();

  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  useEffect(() => {
    if (!serverSeedHash) {
      rotateServerSeed();
      generateNewClientSeed();
    }
  }, [serverSeedHash, rotateServerSeed, generateNewClientSeed]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleVerify = async () => {
    if (!previousServerSeed || !previousClientSeed || previousNonce === null) {
      toast.error('No previous game session data to verify yet. Rotate seeds to finalize and verify past outcomes.');
      return;
    }

    const expectedHash = await ProvablyFair.hashServerSeed(previousServerSeed);
    const floatResult = await ProvablyFair.calculateOutcome(previousServerSeed, previousClientSeed, previousNonce);

    setVerifyResult(
      `Calculated Hash: ${expectedHash.substring(0, 24)}...\n` +
      `Float Outcome: ${floatResult.toFixed(8)}`
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                  <Shield className="text-cyan-400" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Provably Fair {gameName ? `• ${gameName}` : ''}</h2>
                  <p className="text-xs text-white/50">Cryptographic SHA-256 verification of game rolls</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                    Active Server Seed (Hashed SHA-256)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={serverSeedHash || 'Generating cryptographic hash...'}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/70 font-mono select-all"
                    />
                    <button 
                      onClick={() => copyToClipboard(serverSeedHash)}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 text-white transition-colors"
                      title="Copy Hash"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    This commitment hash is established prior to any roll. The server cannot alter outcomes without modifying this hash.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                    Active Client Seed
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={clientSeed}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono"
                    />
                    <button 
                      onClick={generateNewClientSeed}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 text-white transition-colors"
                      title="Generate New Seed"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                    Current Nonce (Bets Executed)
                  </label>
                  <input 
                    type="number" 
                    readOnly 
                    value={nonce}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 font-mono"
                  />
                </div>
              </div>

              {/* Past verification panel */}
              {previousServerSeed && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Revealed Previous Server Seed
                  </label>
                  <div className="text-xs text-emerald-300 font-mono break-all bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                    {previousServerSeed}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 text-xs mt-2"
                    onClick={handleVerify}
                  >
                    <CheckCircle2 size={14} className="mr-1.5" /> Verify Mathematical Fairness
                  </Button>
                  {verifyResult && (
                    <div className="mt-2 p-2.5 bg-black/60 rounded border border-emerald-500/40 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap">
                      {verifyResult}
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="text-cyan-400 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-cyan-100/70 leading-relaxed">
                  Games compute outcomes through an HMAC-SHA256 signature pairing the unrevealed server seed, your client seed, and the sequential nonce. Rotate the seed pair at any time to inspect and verify previous outcomes.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={rotateServerSeed}
              >
                Rotate Seed Pair
              </Button>
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
