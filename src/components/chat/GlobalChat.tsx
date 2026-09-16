import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle } from "lucide-react";
import { useAuthStore } from "@/features/authStore";
import { useUIStore } from "@/features/uiStore";
import { supabase } from "@/lib/supabase";
import { getAvatarColor, getInitials } from "@/lib/utils";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  users: {
    username: string;
    avatar_url: string;
  };
}

export function GlobalChat() {
  const { chatOpen, toggleChat } = useUIStore();
  const { profile, isGuest } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatOpen) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("global_chat")
        .select("*, users(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (data) {
        setMessages(data.reverse() as unknown as ChatMessage[]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    };
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase.channel("global_chat_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        async (payload) => {
          // Fetch the user details for the new message
          const { data: user } = await supabase.from("users").select("username, avatar_url").eq("id", payload.new.user_id).single();
          const newMsg = { ...payload.new, users: user || { username: "Unknown", avatar_url: null } } as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGuest || !profile) return;
    
    const text = input.trim();
    setInput("");
    
    await supabase.from("global_chat").insert({
      user_id: profile.id,
      message: text
    });
  };

  return (
    <AnimatePresence>
      {chatOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleChat}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-[100dvh] w-full sm:w-80 bg-[#0a0a0a] border-l border-white/10 shadow-2xl z-[100] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#16213e]">
              <div className="flex items-center gap-2">
                <MessageCircle className="text-[#66bdf2]" size={20} />
                <h2 className="font-bold text-white tracking-wide">Global Chat</h2>
              </div>
              <button onClick={toggleChat} className="text-white/50 hover:text-white transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-white/40 mt-10 text-sm">No messages yet. Be the first!</div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === profile?.id;
                  const username = msg.users?.username || "Player";
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-lg
                        ${!msg.users?.avatar_url ? getAvatarColor(username) : ""}
                      `}>
                        {msg.users?.avatar_url ? (
                          <img src={msg.users.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getInitials(username)
                        )}
                      </div>
                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                        <span className="text-2xs text-white/40 mb-1">{username}</span>
                        <div className={`px-3 py-2 rounded-2xl text-sm break-words
                          ${isMe ? "bg-[#66bdf2] text-black rounded-tr-none" : "bg-[#1a1a1a] text-white/90 border border-white/10 rounded-tl-none"}
                        `}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
              {isGuest ? (
                <div className="text-center p-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white/60">
                  Please sign up to chat.
                </div>
              ) : (
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={200}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#66bdf2] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="w-10 h-10 rounded-xl bg-[#66bdf2] text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors flex-shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}