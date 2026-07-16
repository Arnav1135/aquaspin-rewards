// src/components/layout/Sidebar.tsx
// Fintech-grade mobile slide-out sidebar — deep navy, off-white text

import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Disc3, Gamepad2, Trophy, User, ShoppingBag,
  FileText, X, Coins, TrendingUp, Gamepad
} from 'lucide-react';
import { useUIStore } from '@/features/uiStore';
import { useAuthStore } from '@/features/authStore';
import { getAvatarColor, getInitials, formatTokens } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';

const navItems = [
  { to: '/dashboard',   icon: Home,        label: 'Dashboard'  },
  { to: '/wheel',       icon: Disc3,        label: 'Spin Wheel', badge: 'SPIN' },
  { to: '/games',       icon: Gamepad2,     label: 'Mini Games' },
  { to: '/leaderboard', icon: Trophy,       label: 'Leaderboard' },
  { to: '/shop',        icon: ShoppingBag,  label: 'Shop' },
  { to: '/profile',     icon: User,         label: 'Profile' },
];

const bottomLinks = [
  { to: '/legal', icon: FileText, label: 'Privacy & Terms' },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, openCashoutModal } = useUIStore();
  const { profile } = useAuthStore();

  const close = () => setSidebarOpen(false);
  const xpProgress = profile ? ((profile.xp % 500) / 500) * 100 : 0;

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(22,33,62,0.55)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Sidebar panel */}
          <motion.aside
            className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col overflow-y-auto lg:hidden"
            style={{
              background: '#16213E',
              borderRight: '1px solid rgba(74,144,217,0.18)',
              boxShadow: '8px 0 32px rgba(22,33,62,0.30)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid rgba(74,144,217,0.15)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4A90D9 0%, #3DDC97 100%)' }}
                >
                  <Gamepad size={16} strokeWidth={2} style={{ color: '#16213E' }} />
                </div>
                <span className="font-bold text-sm" style={{ color: '#F5F8FC' }}>
                  AquaSpin
                </span>
              </div>
              <button
                className="icon-btn-sm"
                onClick={close}
                aria-label="Close menu"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* ── User Profile Card ── */}
            {profile && (
              <div
                className="p-4"
                style={{ borderBottom: '1px solid rgba(74,144,217,0.15)' }}
              >
                <div
                  className="p-3 rounded-2xl"
                  style={{
                    background: 'rgba(74,144,217,0.10)',
                    border: '1px solid rgba(74,144,217,0.20)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: getAvatarColor(profile.id),
                        color: '#16213E',
                      }}
                    >
                      {getInitials(profile.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#F5F8FC' }}>
                        {profile.username ?? 'Player'}
                      </p>
                      <p className="text-2xs" style={{ color: 'rgba(245,248,252,0.50)' }}>
                        Level {profile.level}
                      </p>
                    </div>
                  </div>

                  {/* Token display */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Coins size={14} style={{ color: '#3DDC97' }} />
                    <span className="font-mono font-bold text-sm" style={{ color: '#3DDC97' }}>
                      {formatTokens(profile.tokens)}
                    </span>
                    <span className="text-2xs" style={{ color: 'rgba(245,248,252,0.45)' }}>
                      tokens
                    </span>
                  </div>

                  {/* XP bar */}
                  <ProgressBar value={xpProgress} height={4} />
                  <p className="text-2xs mt-1" style={{ color: 'rgba(245,248,252,0.40)' }}>
                    {profile.xp} XP • Level {profile.level}
                  </p>
                </div>

                {/* Cashout CTA */}
                {profile.tokens >= 1000 && (
                  <button
                    className="btn-success w-full mt-3 text-xs py-2.5"
                    style={{ borderRadius: 12 }}
                    onClick={() => { openCashoutModal(); close(); }}
                  >
                    <TrendingUp size={14} /> Cash Out Now
                  </button>
                )}
              </div>
            )}

            {/* ── Section Header: Navigation ── */}
            <div className="px-4 pt-4 pb-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-2xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(245,248,252,0.35)' }}
                >
                  Navigation
                </span>
                <span style={{ color: 'rgba(245,248,252,0.25)', fontSize: 16 }}>•••</span>
              </div>
            </div>

            {/* ── Nav Links ── */}
            <nav className="flex-1 px-3 pb-3 space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive ? 'rgba(74,144,217,0.18)' : 'transparent',
                      color: isActive ? '#4A90D9' : 'rgba(245,248,252,0.60)',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(245,248,252,0.05)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} strokeWidth={2} />
                      {item.label}
                    </div>
                    {item.badge && (
                      <span
                        className="text-2xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: 'rgba(74,144,217,0.22)',
                          color: '#4A90D9',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* ── Bottom Links ── */}
            <div
              className="p-3 space-y-0.5"
              style={{ borderTop: '1px solid rgba(74,144,217,0.15)' }}
            >
              {bottomLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200"
                    style={{ color: 'rgba(245,248,252,0.35)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(245,248,252,0.65)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(245,248,252,0.35)';
                    }}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
