import { motion, AnimatePresence } from 'framer-motion';
import { X, PackageOpen, Zap, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { Button } from '@/components/ui/Button';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryModal({ isOpen, onClose }: InventoryModalProps) {
  const { profile } = useAuthStore();
  const inventory = Array.isArray((profile as any)?.inventory) ? (profile as any).inventory : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-navy-900/50">
              <div className="flex items-center gap-2">
                <PackageOpen className="text-neon-cyan" />
                <h3 className="font-display font-bold text-lg text-white">Your Inventory</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-white/70" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle size={48} className="text-white/20 mb-4" />
                  <p className="text-text-secondary font-medium">Your inventory is empty.</p>
                  <p className="text-sm text-white/40 mt-1">Visit the Shop to buy power-ups and items!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {inventory.map((item: any) => (
                    <div
                      key={item.instanceId}
                      className="flex items-center gap-4 p-3 rounded-xl bg-navy-800 border border-white/5"
                    >
                      <div className="w-12 h-12 rounded-lg bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                        <Zap className="text-cyan-400" size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">{item.name}</h4>
                        <p className="text-xs text-white/50">
                          Acquired: {new Date(item.acquiredAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => alert('Item activation coming soon!')}>
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
