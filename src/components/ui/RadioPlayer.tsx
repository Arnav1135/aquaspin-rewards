import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, Pause, FastForward, Volume2, VolumeX, Music2 } from 'lucide-react';
import { useUIStore } from '@/features/uiStore';

const STATIONS = [
  { name: 'Lofi Girl', url: 'https://play.streamafrica.net/lofiradio' }, // Example reliable lofi stream
  { name: 'Synthwave FM', url: 'https://stream.synthwave.fm/radio/8000/radio.mp3' },
  { name: 'Chillhop', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' }, // chill stream
];

export function RadioPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stationIdx, setStationIdx] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = "anonymous";
    }
    const audio = audioRef.current;
    
    const handleEnd = () => setIsPlaying(false);
    audio.addEventListener('pause', handleEnd);
    audio.addEventListener('playing', () => setIsPlaying(true));
    
    return () => {
      audio.removeEventListener('pause', handleEnd);
      audio.removeEventListener('playing', () => setIsPlaying(true));
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = STATIONS[stationIdx].url;
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [stationIdx]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  const nextStation = () => {
    setStationIdx((prev) => (prev + 1) % STATIONS.length);
    if (!isPlaying) setIsPlaying(true); // Auto play on skip
  };

  return (
    <div className="fixed bottom-24 right-4 z-[80] flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-navy-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-64"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music2 size={16} className="text-cyan-400" />
                <span className="text-sm font-bold text-white">Aqua FM</span>
              </div>
              {isPlaying && (
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                      className="w-1 bg-cyan-400 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-xs text-cyan-400 font-medium mb-1">NOW PLAYING</p>
              <p className="text-sm text-white font-bold truncate">{STATIONS[stationIdx].name}</p>
              <p className="text-xs text-white/40">Live Radio</p>
            </div>

            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setIsMuted(!isMuted)} className="text-white/60 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <div className="flex gap-4">
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause size={20} className="fill-black" /> : <Play size={20} className="fill-black ml-1" />}
                </button>
                <button 
                  onClick={nextStation}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <FastForward size={18} className="fill-white" />
                </button>
              </div>
            </div>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (parseFloat(e.target.value) > 0) setIsMuted(false);
              }}
              className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 cursor-pointer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-navy-800 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.2)] flex items-center justify-center relative group overflow-hidden"
      >
        <Radio size={24} className="text-cyan-400 relative z-10" />
        {isPlaying && (
          <div className="absolute inset-0 bg-cyan-500/20 animate-pulse" />
        )}
      </motion.button>
    </div>
  );
}
