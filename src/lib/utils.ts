// src/lib/utils.ts
// Shared utility functions

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format token number with commas */
export function formatTokens(tokens: number): string {
  return new Intl.NumberFormat('en-IN').format(tokens);
}

/** Format tokens as USD */
export function formatTokensAsUSD(tokens: number): string {
  const usd = tokens / 1000;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);
}

/** Format date relative (e.g., "2 hours ago") */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Get level color based on level number */
export function getLevelColor(level: number): string {
  if (level >= 50) return '#FFD700';  // Gold
  if (level >= 25) return '#C0C0C0';  // Silver
  if (level >= 10) return '#CD7F32';  // Bronze
  return '#00F0FF';                   // Cyan (default)
}

/** Calculate XP needed for next level */
export function xpForLevel(level: number): number {
  return level * 500;
}

/** Vibrate device if supported and enabled */
export function vibrate(pattern: number | number[] = 50) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/** Play a simple tone using Web Audio API */
export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) {
  try {
    const ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio context not available, silently skip
  }
}

/** Truncate address for display (UPI / email) */
export function truncateAddress(address: string, maxLength: number = 20): string {
  if (address.length <= maxLength) return address;
  const start = address.slice(0, 8);
  const end = address.slice(-8);
  return `${start}...${end}`;
}

/** Generate a random avatar color from user ID */
export function getAvatarColor(userId: string): string {
  const colors = ['#00F0FF', '#FFD700', '#FF3366', '#00FF87', '#FF9900', '#A855F7'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Get initials from username */
export function getInitials(username: string | null): string {
  if (!username) return '??';
  return username.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
