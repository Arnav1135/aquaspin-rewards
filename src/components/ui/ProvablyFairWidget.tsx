import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, ShieldCheck, RefreshCw, CheckCircle, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProvablyFairStore } from '@/lib/crypto/provablyFairStore';
import { ProvablyFair } from '@/lib/crypto/provablyFair';
import toast from 'react-hot-toast';

export function ProvablyFairWidget() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isGameActive = (location.pathname.includes('/games/') && location.pathname !== '/games') 
    || (location.pathname === '/games' && !!searchParams.get('game'))
    || location.pathname === '/wheel'
    || location.pathname === '/crash';

  const [isOpen, setIsOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  
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
      toast.error('No previous game data to verify yet.');
      return;
    }

    const expectedHash = await ProvablyFair.hashServerSeed(previousServerSeed);
    const floatResult = await ProvablyFair.calculateOutcome(previousServerSeed, previousClientSeed, previousNonce);
    
    setVerifyResult(`
      Calculated Hash: ${expectedHash.substring(0, 16)}...
      Float Outcome: ${floatResult.toFixed(8)}
    `);
  };

  if (isGameActive) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 rounded-full text-sm font-bold shadow-lg hover:bg-slate-800 transition-colors"
      >
        <ShieldCheck size={16} /> Provably Fair
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-4 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Shield size={18} /> Provably Fair
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Active Server Seed (Hashed)</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={serverSeedHash} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono" />
                  <button onClick={() => copyToClipboard(serverSeedHash)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400"><Copy size={14}/></button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">This is a SHA256 hash of the active server seed. We cannot change it without changing this hash.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Your Client Seed</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={clientSeed} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono" />
                  <button onClick={generateNewClientSeed} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"><RefreshCw size={14}/></button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nonce (Bets Placed)</label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono">
                  {nonce}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2">Verify Previous Game</h3>
                <p className="text-xs text-slate-400 mb-3">
                  To verify your previous bets, rotate the server seed. This reveals the unhashed previous server seed.
                </p>
                <button 
                  onClick={rotateServerSeed}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold mb-3 border border-slate-700"
                >
                  Rotate Seed Pair
                </button>

                {previousServerSeed && (
                  <div className="space-y-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Revealed Server Seed</label>
                      <div className="text-xs text-emerald-400 font-mono break-all">{previousServerSeed}</div>
                    </div>
                    <button 
                      onClick={handleVerify}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} /> Verify Mathematical Fairness
                    </button>
                    {verifyResult && (
                      <div className="mt-2 p-2 bg-slate-900 rounded border border-emerald-500/30 text-[10px] font-mono text-emerald-300 whitespace-pre-wrap">
                        {verifyResult}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
