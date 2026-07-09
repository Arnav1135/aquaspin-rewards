// src/components/layout/BottomNav.tsx
// Mobile bottom navigation bar

import { Link, useLocation } from 'react-router-dom';
import { Home, Disc3, Gamepad2, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/wheel',     icon: Disc3,     label: 'Wheel' },
  { to: '/games',     icon: Gamepad2,  label: 'Games' },
  { to: '/leaderboard', icon: Trophy,  label: 'Ranks' },
  { to: '/profile',   icon: User,      label: 'Me' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom">
      {/* Glass background */}
      <div className="absolute inset-0 bg-navy-900/90 backdrop-blur-xl border-t border-navy-700/50" />

      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-0.5 flex-1 py-2"
              aria-label={item.label}
            >
              <motion.div
                className={cn(
                  'relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200',
                  isActive ? 'bg-cyan-neon/20' : 'hover:bg-navy-700'
                )}
                whileTap={{ scale: 0.88 }}
              >
                <Icon
                  size={20}
                  className={cn(
                    'transition-colors duration-200',
                    isActive ? 'text-cyan-neon' : 'text-muted'
                  )}
                />
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-neon shadow-cyan-glow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>
              <span
                className={cn(
                  'text-2xs font-medium transition-colors duration-200',
                  isActive ? 'text-cyan-neon' : 'text-muted'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
