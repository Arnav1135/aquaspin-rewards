// src/components/layout/Header.tsx
// Fintech-grade navigation header — deep navy, off-white text, 48px icon buttons

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Settings, LogOut, User, Volume2, VolumeX, ChevronDown, Gamepad2
} from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { useGameStore } from '@/features/gameStore';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

export function Header() {
  const location = useLocation();
  const { profile, logout, isGuest } = useAuthStore();
  const { toggleSidebar, toggleSettings } = useUIStore();
  const { soundEnabled, toggleSound } = useGameStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tokens = profile?.tokens ?? 0;

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/wheel',     label: 'Spin Wheel' },
    { to: '/games',     label: 'Games' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-16"
      style={{ background: '#16213E' }}
    >
      {/* Subtle bottom border */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(74,144,217,0.35), transparent)' }}
      />

      <div className="relative flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
        {/* ── Left: Hamburger + Logo + Nav ── */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger — 48px circle icon-btn */}
          <button
            className="icon-btn-sm lg:hidden"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4A90D9 0%, #3DDC97 100%)' }}
            >
              <Gamepad2 size={16} strokeWidth={2} style={{ color: '#16213E' }} />
            </div>
            <span
              className="font-bold text-sm tracking-tight hidden sm:block"
              style={{ color: '#F5F8FC' }}
            >
              AquaSpin
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-white'
                      : 'hover:bg-white/8'
                  )}
                  style={{
                    color: isActive ? '#F5F8FC' : 'rgba(245,248,252,0.60)',
                    background: isActive ? 'rgba(74,144,217,0.22)' : undefined,
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Right: Token counter + Controls + Avatar ── */}
        <div className="flex items-center gap-2">
          {/* Token counter chip */}
          {profile && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(74,144,217,0.18)',
                border: '1px solid rgba(74,144,217,0.30)',
              }}
            >
              <TokenCounter value={tokens} size="sm" showIcon={true} />
            </div>
          )}

          {/* Sound toggle — 36px circle icon-btn */}
          <button
            className="icon-btn-sm"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled
              ? <Volume2 size={15} strokeWidth={2} />
              : <VolumeX size={15} strokeWidth={2} />
            }
          </button>

          {/* Profile dropdown */}
          {profile ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl transition-all duration-200"
                style={{ border: '1px solid rgba(245,248,252,0.12)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,248,252,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                id="profile-btn"
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: getAvatarColor(profile.id),
                    color: '#16213E',
                  }}
                >
                  {getInitials(profile.username)}
                </div>
                <span
                  className="text-sm font-medium hidden md:block max-w-[100px] truncate"
                  style={{ color: 'rgba(245,248,252,0.80)' }}
                >
                  {profile.username ?? 'Player'}
                </span>
                <ChevronDown
                  size={13}
                  style={{ color: 'rgba(245,248,252,0.45)' }}
                  className={cn('transition-transform duration-200', dropdownOpen && 'rotate-180')}
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <motion.div
                      className="absolute right-0 top-full mt-2 w-48 z-50 py-2 overflow-hidden"
                      style={{
                        background: '#16213E',
                        border: '1px solid rgba(74,144,217,0.20)',
                        borderRadius: 16,
                        boxShadow: '0 12px 32px rgba(22,33,62,0.40)',
                      }}
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isGuest && (
                        <div
                          className="px-3 py-2 mb-1 border-b"
                          style={{ borderColor: 'rgba(247,108,108,0.20)', background: 'rgba(247,108,108,0.08)' }}
                        >
                          <p className="text-xs font-medium" style={{ color: '#F76C6C' }}>
                            Guest Mode — Limited features
                          </p>
                        </div>
                      )}

                      {[
                        { to: '/profile', icon: User, label: 'Profile' },
                      ].map(({ to, icon: Icon, label }) => (
                        <Link
                          key={to}
                          to={to}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors duration-150"
                          style={{ color: 'rgba(245,248,252,0.70)' }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(74,144,217,0.12)';
                            (e.currentTarget as HTMLElement).style.color = '#F5F8FC';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(245,248,252,0.70)';
                          }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Icon size={14} strokeWidth={2} />
                          {label}
                        </Link>
                      ))}

                      <button
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors duration-150"
                        style={{ color: 'rgba(245,248,252,0.70)' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(74,144,217,0.12)';
                          (e.currentTarget as HTMLElement).style.color = '#F5F8FC';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = 'rgba(245,248,252,0.70)';
                        }}
                        onClick={() => { toggleSettings(); setDropdownOpen(false); }}
                      >
                        <Settings size={14} strokeWidth={2} />
                        Settings
                      </button>

                      <hr style={{ borderColor: 'rgba(74,144,217,0.15)', margin: '4px 0' }} />

                      <button
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors duration-150"
                        style={{ color: '#F76C6C' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(247,108,108,0.10)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                        onClick={() => { logout(); setDropdownOpen(false); }}
                      >
                        <LogOut size={14} strokeWidth={2} />
                        {isGuest ? 'Sign Up Free' : 'Sign Out'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/auth"
              className="btn-primary text-xs px-4 py-2"
              style={{ borderRadius: 10 }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
