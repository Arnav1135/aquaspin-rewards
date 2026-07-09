// src/components/layout/Header.tsx
// Top navigation header with token display

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Settings, LogOut, User, Volume2, VolumeX,
  Sun, Moon, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { useGameStore } from '@/features/gameStore';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

export function Header() {
  const location = useLocation();
  const { profile, logout, isGuest } = useAuthStore();
  const { toggleSidebar, toggleTheme, theme, toggleSettings } = useUIStore();
  const { soundEnabled, toggleSound } = useGameStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tokens = profile?.tokens ?? 0;

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/wheel', label: 'Spin Wheel' },
    { to: '/games', label: 'Mini Games' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-xl border-b border-navy-700/50" />

      {/* Top cyan line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-neon/60 to-transparent" />

      <div className="relative flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden btn-ghost p-2"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-neon to-cyan-glow flex items-center justify-center shadow-cyan-glow-sm">
              <span className="text-navy-900 font-bold text-sm">A</span>
            </div>
            <span className="font-display font-bold text-sm text-gradient-cyan hidden sm:block">
              AquaSpin
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  location.pathname === link.to
                    ? 'bg-cyan-neon/15 text-cyan-neon'
                    : 'text-text-secondary hover:text-text-primary hover:bg-navy-700'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Token + Controls + Avatar */}
        <div className="flex items-center gap-3">
          {/* Token counter */}
          {profile && (
            <div className="token-badge hidden sm:flex">
              <TokenCounter value={tokens} size="sm" showIcon={true} />
            </div>
          )}

          {/* Sound toggle */}
          <button
            className="btn-ghost p-2 rounded-lg"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Theme toggle */}
          <button
            className="btn-ghost p-2 rounded-lg"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Profile dropdown */}
          {profile ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-navy-700 transition-all duration-200"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                id="profile-btn"
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-navy-900"
                  style={{ backgroundColor: getAvatarColor(profile.id) }}
                >
                  {getInitials(profile.username)}
                </div>
                <span className="text-sm font-medium text-text-secondary hidden md:block max-w-[100px] truncate">
                  {profile.username ?? 'Player'}
                </span>
                <ChevronDown size={14} className="text-muted" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    {/* Click-away backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />

                    <motion.div
                      className="absolute right-0 top-full mt-2 w-48 glass-card rounded-xl z-50 py-2 overflow-hidden"
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isGuest && (
                        <div className="px-3 py-2 mb-1 bg-warn/10 border-b border-navy-700">
                          <p className="text-2xs text-warn font-medium">Guest Mode — Limited features</p>
                        </div>
                      )}

                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-navy-700 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User size={14} /> Profile
                      </Link>

                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-navy-700 transition-colors"
                        onClick={() => { toggleSettings(); setDropdownOpen(false); }}
                      >
                        <Settings size={14} /> Settings
                      </button>

                      <hr className="my-1 border-navy-700" />

                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                        onClick={() => { logout(); setDropdownOpen(false); }}
                      >
                        <LogOut size={14} /> {isGuest ? 'Sign Up Free' : 'Sign Out'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/auth" className="btn-primary text-xs px-4 py-2 rounded-lg">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
