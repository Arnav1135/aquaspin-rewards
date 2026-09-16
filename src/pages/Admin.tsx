import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/features/authStore";
import { Navigate } from "react-router-dom";
import { Shield, Users, Coins, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Admin() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({ totalUsers: 0, totalTokens: 0, activeUsers: 0 });

  useEffect(() => {
    async function loadStats() {
      // Very basic aggregate pull
      const { data, count } = await supabase.from("users").select("tokens", { count: "exact" }) as { data: { tokens: number }[] | null, count: number | null, error: any };
      if (data) {
        setStats({
          totalUsers: count || data.length,
          totalTokens: data.reduce((acc, row) => acc + (row.tokens || 0), 0),
          activeUsers: data.filter(d => d.tokens > 100).length // Rough metric
        });
      }
    }
    loadStats();
  }, []);

  if (profile?.email !== "vermaarnav113@gmail.com") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6 text-white pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="text-red-500 w-8 h-8" />
          <h1 className="text-3xl font-black tracking-wider">God Mode Admin</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-xl">
            <Users className="w-8 h-8 text-[#66bdf2] mb-4" />
            <div className="text-sm text-white/50 mb-1">Total Registered Users</div>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </div>
          <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-xl">
            <Coins className="w-8 h-8 text-yellow-500 mb-4" />
            <div className="text-sm text-white/50 mb-1">Tokens in Circulation</div>
            <div className="text-3xl font-bold">{stats.totalTokens.toLocaleString()}</div>
          </div>
          <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-xl">
            <Activity className="w-8 h-8 text-emerald-500 mb-4" />
            <div className="text-sm text-white/50 mb-1">Active Accounts</div>
            <div className="text-3xl font-bold">{stats.activeUsers}</div>
          </div>
        </div>

        <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-xl mt-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Coins className="text-yellow-500"/> Live Economy Injection</h2>
          <div className="flex gap-4 mb-4">
            <input id="inject-uid" type="text" placeholder="Target User ID or Email" className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500" />
            <input id="inject-amount" type="number" placeholder="Token Amount" className="w-32 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500" />
            <button 
              onClick={async () => {
                const uid = (document.getElementById("inject-uid") as HTMLInputElement).value;
                const amt = parseInt((document.getElementById("inject-amount") as HTMLInputElement).value);
                if(!uid || !amt) return alert("Missing fields");
                
                // For safety, only allow injecting by precise ID in this simple prototype
                if(uid.includes("@")) return alert("Please use User UUID, not email for now.");
                
                await supabase.rpc("update_user_tokens", { p_user_id: uid, p_amount_change: amt });
                
                // Send notification
                await supabase.from("notifications").insert({
                  user_id: uid,
                  message: `You have been granted ${amt} tokens by the System Admin!`,
                  type: `reward`
                });
                
                alert("Tokens injected and notification dispatched!");
              }}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all"
            >
              Inject
            </button>
          </div>
          <p className="text-xs text-white/40">WARNING: This directly mints tokens into the live economy and dispatches a realtime system notification to the target user.</p>
        </div>

        <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20">
          <h2 className="text-xl font-bold text-red-400 mb-2">Restricted Access Zone</h2>
          <p className="text-sm text-white/70">
            Welcome back, Creator. This panel provides real-time economy monitoring for the AquaSpin network. Future modules will include RLS bypass user editing, game parameter tuning, and direct real-time broadcast messaging to all connected clients.
          </p>
        </div>
      </div>
    </div>
  );
}