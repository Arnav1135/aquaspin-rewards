// src/components/layout/BottomNav.tsx
// Fintech-grade mobile bottom navigation — deep navy background

import { Link, useLocation } from 'react-router-dom';
import { Home, Disc3, Gamepad2, Trophy, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/dashboard',   icon: Home,     label: 'Home'  },
  { to: '/wheel',       icon: Disc3,    label: 'Wheel' },
  { to: '/games',       icon: Gamepad2, label: 'Games' },
  { to: '/leaderboard', icon: Trophy,   label: 'Ranks' },
  { to: '/profile',     icon: User,     label: 'Me'    },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      style={{ background: '#16213E', borderTop: '1px solid rgba(74,144,217,0.18)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
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
                className="relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(74,144,217,0.20)' : 'transparent',
                }}
                whileTap={{ scale: 0.88 }}
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  style={{ color: isActive ? '#4A90D9' : 'rgba(245,248,252,0.45)' }}
                />
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#4A90D9' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.div>
              <span
                className="text-2xs font-medium transition-colors duration-200"
                style={{ color: isActive ? '#4A90D9' : 'rgba(245,248,252,0.40)' }}
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
