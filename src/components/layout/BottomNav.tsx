// src/components/layout/BottomNav.tsx
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
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom bg-[#0a0f1c]/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
              aria-label={item.label}
            >
              <motion.div
                className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'transparent'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-cyan-400' : 'text-white/40'}
                />
              </motion.div>
              <span
                className={`text-[10px] mt-1 font-bold transition-colors duration-300 ${
                  isActive ? 'text-cyan-400' : 'text-white/40'
                }`}
              >
                {item.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-bar"
                  className="absolute bottom-0 w-8 h-[3px] bg-cyan-400 rounded-t-full shadow-[0_-2px_10px_rgba(6,182,212,0.8)]"
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
