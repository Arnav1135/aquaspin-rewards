import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Gift, Trophy, UserPlus, Info, Check, X } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'reward': return <Gift size={16} className="text-yellow-400" />;
    case 'achievement': return <Trophy size={16} className="text-purple-400" />;
    case 'referral': return <UserPlus size={16} className="text-blue-400" />;
    default: return <Info size={16} className="text-cyan-400" />;
  }
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white/10 rounded-full text-white backdrop-blur-sm border border-white/20 transition-colors relative"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full transform translate-x-1 -translate-y-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900/90 backdrop-blur-xl z-10">
              <h3 className="text-white font-bold text-sm">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                >
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>
            
            <div className="flex-1 p-2">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-white/50 text-sm">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    className={`relative p-3 mb-1 rounded-xl transition-colors cursor-pointer group ${
                      notif.read ? 'hover:bg-white/5' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {!notif.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    )}
                    <div className="flex gap-3 items-start pl-2">
                      <div className="mt-0.5 p-1.5 bg-white/5 rounded-full">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className={`text-sm text-white ${notif.read ? 'opacity-70' : 'font-medium'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-white/40 mt-1">
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                      className="absolute right-2 top-2 p-1 text-white/30 hover:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
