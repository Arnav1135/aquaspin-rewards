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