import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/features/authStore";
import { useLocation } from "react-router-dom";

export interface PresenceUser {
  id: string;
  username: string;
  level: number;
  status: string;
}

function getStatusFromPath(path: string): string {
  if (path.includes("tictactoe")) return "Playing Tic-Tac-Toe";
  if (path.includes("crash")) return "Playing Crash";
  if (path.includes("plinko")) return "Playing Plinko";
  if (path.includes("multiplayer")) return "In Matchmaking";
  if (path.includes("wheel")) return "Spinning the Wheel";
  if (path.includes("games")) return "Browsing Games";
  if (path.includes("leaderboard")) return "Checking Ranks";
  if (path.includes("shop")) return "In the Shop";
  return "Browsing Lobby";
}

export function useGlobalPresence() {
  const { profile } = useAuthStore();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase.channel("global:presence", {
      config: { presence: { key: profile.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        for (const key in state) {
          if (state[key] && state[key][0]) {
            users.push(state[key][0] as unknown as PresenceUser);
          }
        }
        setOnlineUsers(users.sort((a, b) => b.level - a.level));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: profile.id,
            username: profile.username || "Anonymous",
            level: profile.level || 1,
            status: getStatusFromPath(location.pathname),
          });
        }
      });

    // Update status when location changes
    const updateStatus = async () => {
      if (channel.state === "joined") {
        await channel.track({
          id: profile.id,
          username: profile.username || "Anonymous",
          level: profile.level || 1,
          status: getStatusFromPath(location.pathname),
        });
      }
    };
    updateStatus();

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [profile, location.pathname]);

  return onlineUsers;
}