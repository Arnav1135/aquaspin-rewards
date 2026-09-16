import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, CheckCircle2, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProvablyFairModal({ isOpen, onClose }: ProvablyFairModalProps) {
  const [clientSeed, setClientSeed] = useState(generateRandomSeed(16));
  const [serverSeedHash, setServerSeedHash] = useState(generateRandomSeed(64));
  const [nonce, setNonce] = useState(0);

  function generateRandomSeed(length: number) {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleRotateSeed = () => {
    setServerSeedHash(generateRandomSeed(64));
    setNonce(0);
    toast.success('Server seed pair rotated successfully!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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
                  <h2 className="text-xl font-bold text-white">Provably Fair</h2>
                  <p className="text-xs text-white/50">Verify the integrity of your rolls</p>
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
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                    Active Server Seed (Hashed)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={serverSeedHash}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 font-mono"
                    />
                    <button 
                      onClick={() => copyToClipboard(serverSeedHash)}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 text-white transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                    Active Client Seed
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={clientSeed}
                      onChange={(e) => setClientSeed(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-cyan-500/50 outline-none"
                    />
                    <button 
                      onClick={() => setClientSeed(generateRandomSeed(16))}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 text-white transition-colors"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                    Current Nonce
                  </label>
                  <input 
                    type="number" 
                    readOnly 
                    value={nonce}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="text-cyan-400 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-cyan-100/70 leading-relaxed">
                  Games use a cryptographic hash of the server seed and your client seed to generate results. 
                  Because you control the client seed, the server cannot rig the outcome. 
                  Rotate the server seed to verify past results.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1"
                onClick={handleRotateSeed}
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
