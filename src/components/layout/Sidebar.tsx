// src/components/layout/Sidebar.tsx
// Slide-out sidebar for mobile navigation

import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Disc3, Gamepad2, Trophy, User, ShoppingBag,
  FileText, X, Coins, TrendingUp
} from 'lucide-react';
import { useUIStore } from '@/features/uiStore';
import { useAuthStore } from '@/features/authStore';
import { cn, getAvatarColor, getInitials, formatTokens } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';

const navItems = [
  { to: '/dashboard',   icon: Home,        label: 'Dashboard' },
  { to: '/wheel',       icon: Disc3,        label: 'Spin Wheel', badge: 'SPIN' },
  { to: '/games',       icon: Gamepad2,     label: 'Mini Games' },
  { to: '/leaderboard', icon: Trophy,       label: 'Leaderboard' },
  { to: '/shop',        icon: ShoppingBag,  label: 'Shop' },
  { to: '/profile',     icon: User,         label: 'Profile' },
];

const bottomLinks = [
  { to: '/legal',       icon: FileText,     label: 'Privacy & Terms' },
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
            className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Sidebar panel */}
          <motion.aside
            className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col bg-navy-900 border-r border-navy-700 lg:hidden overflow-y-auto"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-navy-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-neon to-cyan-glow flex items-center justify-center">
                  <span className="text-navy-900 font-bold text-sm">A</span>
                </div>
                <span className="font-display font-bold text-sm text-gradient-cyan">AquaSpin</span>
              </div>
              <button onClick={close} className="btn-ghost p-2 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* User profile card */}
            {profile && (
              <div className="p-4 border-b border-navy-700">
                <div className="glass-card p-3 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-navy-900"
                      style={{ backgroundColor: getAvatarColor(profile.id) }}
                    >
                      {getInitials(profile.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate">
                        {profile.username ?? 'Player'}
                      </p>
                      <p className="text-2xs text-muted">Level {profile.level}</p>
                    </div>
                  </div>

                  {/* Token display */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Coins size={14} className="text-cyan-neon" />
                    <span className="font-mono font-bold text-sm text-cyan-neon">
                      {formatTokens(profile.tokens)}
                    </span>
                    <span className="text-2xs text-muted">tokens</span>
                  </div>

                  {/* XP bar */}
                  <ProgressBar value={xpProgress} height={4} />
                  <p className="text-2xs text-muted mt-1">{profile.xp} XP • Level {profile.level}</p>
                </div>

                {/* Cashout button */}
                {profile.tokens >= 1000 && (
                  <button
                    className="btn-gold w-full mt-3 text-xs py-2.5 rounded-xl"
                    onClick={() => { openCashoutModal(); close(); }}
                  >
                    <TrendingUp size={14} /> Cash Out Now
                  </button>
                )}
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className={cn(
                      'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-cyan-neon/15 text-cyan-neon'
                        : 'text-text-secondary hover:text-text-primary hover:bg-navy-700'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      {item.label}
                    </div>
                    {item.badge && (
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-cyan-neon/20 text-cyan-neon font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom links */}
            <div className="p-3 border-t border-navy-700 space-y-1">
              {bottomLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-text-secondary hover:bg-navy-700 transition-all duration-200"
                  >
                    <Icon size={18} /> {item.label}
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
