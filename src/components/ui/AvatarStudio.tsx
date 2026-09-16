import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Check, Palette } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface AvatarStudioProps {
  onClose: () => void;
}

const STYLES = [
  { id: 'bottts', label: 'Robots' },
  { id: 'avataaars', label: 'Humans' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'micah', label: 'Micah' },
  { id: 'fun-emoji', label: 'Emojis' }
];

export function AvatarStudio({ onClose }: AvatarStudioProps) {
  const { profile, updateProfile } = useAuthStore();
  const [activeStyle, setActiveStyle] = useState(STYLES[0].id);
  const [seed, setSeed] = useState(() => profile?.username || Math.random().toString(36).substring(7));
  const [saving, setSaving] = useState(false);

  // Generate URL for preview
  const previewUrl = `https://api.dicebear.com/7.x/${activeStyle}/svg?seed=${seed}&backgroundColor=transparent`;

  const randomize = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from('users') as any).update({
        avatar_url: previewUrl
      }).eq('id', profile.id);

      if (error) throw error;

      updateProfile({ avatar_url: previewUrl } as any);
      toast.success('Avatar updated successfully!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md glass-card border border-white/10 rounded-3xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Palette className="text-cyan-400" />
              Avatar Studio
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          <div className="p-6">
            {/* Preview Area */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-3xl bg-navy-800 shadow-inner flex items-center justify-center overflow-hidden border-2 border-cyan-500/50 relative group">
                  <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={randomize}
                  className="absolute -bottom-3 -right-3 w-10 h-10 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full shadow-lg shadow-cyan-500/50 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {/* Category Selector */}
            <div className="mb-6">
              <p className="text-sm text-text-secondary font-medium mb-3">Choose Style</p>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setActiveStyle(style.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      activeStyle === style.id
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 text-text-primary hover:bg-white/10'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              variant="neon"
              fullWidth
              onClick={handleSave}
              disabled={saving}
              className="h-12"
            >
              {saving ? <RefreshCw className="animate-spin" /> : <Check size={18} />}
              {saving ? 'Saving...' : 'Set as Avatar'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
