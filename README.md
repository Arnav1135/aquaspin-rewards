<div align="center">
  <h1>🌊 AquaSpin Rewards</h1>
  <p><strong>Spin the Wheel, Play Mini-Games, Win Real Cash.</strong></p>

  [![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vite.dev)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
  [![Supabase](https://img.shields.io/badge/Supabase-Free-3ECF8E?logo=supabase)](https://supabase.com)
  [![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
  [![Zustand](https://img.shields.io/badge/Zustand-4-orange?logo=react)](https://zustand-demo.pmnd.rs)

</div>

---

## 🌟 Introduction & Vision

**AquaSpin Rewards** is a full-stack PWA gaming platform designed to provide a rich, multi-genre gaming experience where users earn tokens for playing and cash out real money via UPI or PayPal. We focus on a **Secure Economy**, engaging gameplay mechanics, and deep ad-integration for continuous revenue generation.

---

## 🏛️ Architecture Overview

AquaSpin Rewards is built on a modern, decoupled architecture designed for scale, speed, and security.

### 🎨 Frontend Layer
- **Core:** React 18, TypeScript, and Vite 5 for lightning-fast HMR and optimized production builds.
- **Styling:** Tailwind CSS 3 for responsive, dark-mode-first UI design.
- **State Management:** Zustand for global state (Auth, UI, Game) and TanStack Query (React Query) for caching and asynchronous data fetching.
- **Animations & Graphics:** Framer Motion for UI transitions, Canvas API for 2D graphics, and Babylon.js / Three.js integrations for rich 3D gaming experiences.
- **PWA Ready:** Implemented with `vite-plugin-pwa` utilizing Workbox for offline caching and installability.

### ⚙️ Backend Layer (Supabase)
- **Database:** PostgreSQL handling user profiles, transaction history, and game statistics.
- **Authentication:** Supabase Auth with Google OAuth and Email/Password support.
- **Edge Functions:** Deno-based edge functions handle critical actions (e.g., spin wheel outcomes, cashouts, ad-reward verification) to ensure zero client-side tampering.
- **Realtime:** Supabase Realtime subscriptions power live leaderboards and multiplayer game mechanics.

---

## 🎮 The Games Catalog

AquaSpin offers a massive catalog of interactive mini-games, grouped into distinct categories for every type of player.

### 🎰 Casino Games
Test your luck and strategy in our secure, provably fair casino section.
- **Crash Game:** Ride the multiplier before it crashes!
- **Mines:** Uncover gems, avoid the mines.
- **Plinko:** Drop the ball and hit the highest multiplier.
- **Roulette, Slots, Blackjack & Baccarat:** Classic table games with a modern twist.
- **Coin Flip & Dragon Tiger:** Fast-paced, high-stakes 50/50 action.
- **Limbo & Video Poker:** Set your target multiplier or build the best hand.

### 🕹️ Arcade & Action
Fast-paced games requiring skill and reflexes.
- **Candy Crush & Water Sort:** Colorful puzzle action.
- **Knife Thrower & Archery:** Precision targeting games.
- **Flappy Bird & Chicken Jump:** Endless runner and jumping mechanics.
- **Clicker & Tap Challenge:** Test your clicking speed.
- **Ninja Fruit:** Slice through flying targets for high scores.

### 🏅 Sports Games (3D & 2D)
Engaging physics-based sports simulations.
- **Air Hockey 3D & Bowling 3D:** Immersive 3D physics.
- **Basketball 3D:** Shoot hoops with realistic trajectories.
- **Pool & Darts:** Precision-based pub classics.

### 🧩 Board & Logic
Exercise your brain and compete on the leaderboards.
- **Chess 3D & Ludo:** Classic strategy board games.
- **2048, Sudoku & Solitaire:** Deep single-player puzzles.
- **Maths Quiz & General Quiz:** Test your knowledge and calculate fast to win tokens.
- **TicTacToe & Dots and Boxes:** Casual multiplayer classics.
- **Memory Game:** Flip and match pairs.

---

## 🛡️ Secure Economy System

At the heart of AquaSpin is a robust, tamper-proof economy driven by server-side validations.

### **Atomic RPC Transactions**
We bypass direct client-side database writes (`supabase.from('users').update()`) and utilize secure **PostgreSQL Remote Procedure Calls (RPCs)** via `secureEconomy.ts`.
- `record_game_result`: Atomically calculates win/loss token adjustments, updates player XP, and mitigates race conditions.
- `update_user_tokens`: Safely handles token deductions for shop purchases and rewards.

### **Anti-Cheat Mechanics**
- **Edge Function Verification:** Outcomes for critical features (like the Spin Wheel) are computed on Supabase Edge Functions. The client merely renders the result.
- **Row Level Security (RLS):** Strict PostgreSQL policies ensure users can only modify their own non-critical profile data.
- **Cooldown Enforcement:** Server-side timestamp validation prevents macro-clicking and spam abuse.

---

## 💸 Monetization & Cashout Flow

### Ad Integrations
AquaSpin is ready to monetize out-of-the-box with multiple ad networks:
- **Google AdSense:** Integrated Banner Ads.
- **AppLovin MAX:** Rewarded Video Ads (+50 Tokens per view).
- **PropellerAds:** Interstitials and Push Notifications.

### Cashout Lifecycle
1. **Earn:** Users accumulate tokens (1000 Tokens = $1 USD).
2. **Request:** Users request cashout via UPI (India) or PayPal (Global) directly from their dashboard.
3. **Approve:** Requests land in the `transactions` table. Admins fulfill the payment manually and mark the status as `approved` with a transaction reference.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/aquaspin-rewards.git
cd aquaspin-rewards
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your Supabase details:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MOCK_ADS=true
```

### 3. Database Migration
Run the SQL script located at `supabase/migrations/001_schema.sql` in your Supabase SQL Editor.

### 4. Run Locally
```bash
npm run dev
```

---

## 📜 License & Support

**License:** MIT License — Free to use, modify, and deploy.
**Support:** Contact support@aquaspin.app or open a GitHub issue for bugs and feature requests.

<div align="center">
  <i>Built with ❤️ using React, Supabase, and the open web platform.</i>
</div>
