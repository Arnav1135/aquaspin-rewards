import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/authStore';
import { Send, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: string;
}

export function LobbyChat() {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch last 50 messages
    const fetchMessages = async () => {
      const { data } = await (supabase as any)
        .from('lobby_chat')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        setMessages(data.reverse());
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase.channel('lobby_chat_room')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lobby_chat'
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !profile) return;
    
    const text = inputText.trim();
    setInputText('');

    await (supabase.from('lobby_chat') as any).insert({
      user_id: profile.id,
      username: profile.username || 'Anonymous',
      text
    });
  };

  return (
    <div className="flex flex-col h-[400px] w-full max-w-md mx-auto bg-navy-900/80 rounded-2xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="bg-navy-800 p-4 border-b border-white/10 flex items-center gap-2">
        <MessageSquare className="text-cyan-400" size={20} />
        <h3 className="text-white font-bold text-sm">Global Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.user_id === profile?.id;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-white/40 mb-0.5 px-1">{msg.username}</span>
              <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
                isMe ? 'bg-cyan-500 text-white rounded-tr-none' : 'bg-white/10 text-white/90 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-navy-800/50 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={profile ? "Type a message..." : "Login to chat"}
          disabled={!profile}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
          maxLength={150}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || !profile}
          className="bg-cyan-500 text-white p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
