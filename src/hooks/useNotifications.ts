import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/authStore';

export interface Notification {
  id: string;
  message: string;
  type: 'reward' | 'achievement' | 'referral' | 'system';
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchNotifications = async () => {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount((data as Notification[]).filter((n) => !n.read).length);
      }
    };

    fetchNotifications();

    const channelId = `notifications:${profile.id}:${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const markAsRead = async (id: string) => {
    if (!profile?.id) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', profile.id);
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);
  };

  const dismiss = async (id: string) => {
    if (!profile?.id) return;
    setNotifications((prev) => {
      const target = prev.find(n => n.id === id);
      if (target && !target.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
    await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, dismiss };
}
