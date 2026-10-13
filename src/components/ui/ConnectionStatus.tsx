import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { offlineLedger } from '@/lib/reliability/OfflineTransactionLedger';
import { secureRecordGameResult } from '@/lib/secureEconomy';
import toast from 'react-hot-toast';

/**
 * Global Network, PWA Liveness & Offline Transaction Sync Engine:
 * Displays a non-intrusive status banner whenever the client drops connection or reconnects.
 * Automatically synchronizes cached offline transactions from IndexedDB once connectivity returns.
 */
export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const syncPendingTransactions = async () => {
    try {
      const pending = await offlineLedger.getPendingTransactions();
      if (pending.length === 0) return;

      setIsSyncing(true);
      toast.loading(`Replaying ${pending.length} offline actions...`, { id: 'offline-sync' });

      for (const tx of pending) {
        if (tx.type === 'win' || tx.type === 'claim') {
          await secureRecordGameResult({
            userId: tx.userId,
            betAmount: tx.metadata.betAmount || 0,
            earnedAmount: tx.amount,
            xpEarned: tx.metadata.xpEarned || 0,
          });
        }
        await offlineLedger.markSynced(tx.id);
      }

      toast.success('Offline transactions reconciled with server!', { id: 'offline-sync' });
    } catch (err) {
      console.warn('[ConnectionStatus] Offline sync error:', err);
      toast.error('Sync failed. Will retry automatically on next ping.', { id: 'offline-sync' });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      syncPendingTransactions();
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for any un-synced transactions on startup
    if (navigator.onLine) {
      syncPendingTransactions();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999999] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-xs font-black py-2.5 px-4 shadow-2xl flex items-center justify-center gap-2 border-b border-red-300/30"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          <WifiOff size={16} className="animate-pulse" />
          <span>Connection Lost — Actions are being securely recorded to local offline storage.</span>
        </motion.div>
      )}

      {isOnline && showRestored && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999999] bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black py-2.5 px-4 shadow-2xl flex items-center justify-center gap-2 border-b border-emerald-300/30"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Wifi size={16} />}
          <span>
            {isSyncing
              ? 'Reconnecting — Reconciling offline ledger...'
              : 'Connection Restored — Synced with game servers.'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
