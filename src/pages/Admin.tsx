import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/features/authStore";
import { Navigate, useNavigate } from "react-router-dom";
import { TelemetryCharts } from "@/components/admin/TelemetryCharts";
import { Shield, Users, Coins, Activity, Megaphone, Trash2, Ban } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function Admin() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({ totalUsers: 0, totalTokens: 0, activeUsers: 0 });
  const [userList, setUserList] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      // Very basic aggregate pull
      const { data, count } = await supabase.from("users").select("*", { count: "exact" }) as { data: any[] | null, count: number | null, error: any };
      if (data) {
        setStats({
          totalUsers: count || data.length,
          totalTokens: data.reduce((acc, row) => acc + (row.tokens || 0), 0),
          activeUsers: data.filter(d => d.tokens > 100).length // Rough metric
        });
        // Get newest 10 users
        setUserList(data.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 10));
      }
    }
    loadStats();
  }, []);

  if (profile?.email !== "vermaarnav113@gmail.com") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGlobalAnnouncement = async () => {
    const msg = (document.getElementById("global-msg") as HTMLInputElement).value;
    if (!msg) return toast.error("Missing message");
    
    // Broadcast via supabase realtime
    const channel = supabase.channel('global_announcements');
    channel.send({
      type: 'broadcast',
      event: 'announcement',
      payload: { message: msg }
    });
    
    toast.success("Global Announcement Dispatched!");
    (document.getElementById("global-msg") as HTMLInputElement).value = "";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6 text-white pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="text-red-500 w-10 h-10" />
          <h1 className="text-4xl font-black tracking-wider">God Mode Admin</h1>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <motion.div whileHover={{ scale: 1.02 }} className="p-6 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl">
            <Users className="w-8 h-8 text-[#66bdf2] mb-4" />
            <div className="text-sm text-white/50 mb-1 font-bold tracking-wider uppercase">Total Registered</div>
            <div className="text-4xl font-black">{stats.totalUsers}</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} className="p-6 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl">
            <Coins className="w-8 h-8 text-yellow-500 mb-4" />
            <div className="text-sm text-white/50 mb-1 font-bold tracking-wider uppercase">Network Liquidity</div>
            <div className="text-4xl font-black">{stats.totalTokens.toLocaleString()}</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} className="p-6 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl">
            <Activity className="w-8 h-8 text-emerald-500 mb-4" />
            <div className="text-sm text-white/50 mb-1 font-bold tracking-wider uppercase">Active Accounts</div>
            <div className="text-4xl font-black">{stats.activeUsers}</div>
          </motion.div>
        </div>

        {/* TELEMETRY CHARTS */}
        <TelemetryCharts />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* INJECTION */}
          <div className="p-8 bg-[#1a1a1a] rounded-3xl border border-yellow-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Coins size={100} /></div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Coins className="text-yellow-500"/> Live Economy Injection</h2>
            <div className="flex flex-col gap-4 mb-4">
              <input id="inject-uid" type="text" placeholder="Target User UUID" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500" />
              <div className="flex gap-4">
                <input id="inject-amount" type="number" placeholder="Token Amount" className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500" />
                <button 
                  onClick={async () => {
                    const uid = (document.getElementById("inject-uid") as HTMLInputElement).value;
                    const amt = parseInt((document.getElementById("inject-amount") as HTMLInputElement).value);
                    if(!uid || !amt) return toast.error("Missing fields");
                    
                    if(uid.includes("@")) return toast.error("Please use User UUID, not email.");
                    
                    const { error } = await (supabase as any).rpc("update_user_tokens", { p_user_id: uid, p_amount_change: amt });
                    if (error) return toast.error(error.message);
                    
                    await (supabase as any).from("notifications").insert({
                      user_id: uid,
                      message: `You have been granted ${amt} tokens by the System Admin!`,
                      type: `reward`
                    });
                    
                    toast.success(`Injected ${amt} tokens!`);
                  }}
                  className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                >
                  Mint Tokens
                </button>
              </div>
            </div>
            <p className="text-xs text-white/40">Mints tokens out of thin air and injects them directly into the target's wallet. Highly highly disruptive to economy.</p>
          </div>

          {/* BROADCAST */}
          <div className="p-8 bg-[#1a1a1a] rounded-3xl border border-[#66bdf2]/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Megaphone size={100} /></div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Megaphone className="text-[#66bdf2]"/> Global Broadcast</h2>
            <div className="flex flex-col gap-4 mb-4">
              <textarea id="global-msg" placeholder="Enter message to broadcast to all online players..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#66bdf2] min-h-[100px]" />
              <button 
                onClick={handleGlobalAnnouncement}
                className="px-8 py-3 bg-[#66bdf2] hover:bg-blue-400 text-black font-black rounded-xl transition-all shadow-[0_0_20px_rgba(102,189,242,0.3)] w-full"
              >
                Send to All Online Clients
              </button>
            </div>
            <p className="text-xs text-white/40">Uses Supabase Realtime to instantly trigger a toast notification on every active client browser.</p>
          </div>
        </div>

        {/* GLOBAL SETTINGS */}
        <div className="p-8 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">Global Settings</h2>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl" onClick={() => toast.success("Maintenance Mode Toggled")}>
              Toggle Maintenance Mode
            </button>
          </div>
        </div>

        {/* LATEST USERS */}
        <div className="p-8 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Latest Registrations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-sm">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">UUID</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {userList.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 font-bold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#66bdf2]/20 text-[#66bdf2] flex items-center justify-center">
                        {u.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      {u.username}
                    </td>
                    <td className="py-4 text-white/50 font-mono text-xs">{u.id}</td>
                    <td className="py-4 font-mono text-yellow-500">{u.tokens?.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors" title="Ban User">
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}