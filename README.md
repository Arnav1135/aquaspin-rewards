# 🌊 AquaSpin Rewards

> **Spin the Wheel, Win Real Cash.** A full-stack PWA gaming platform where users earn tokens via a spin wheel and mini-games, then cash out via UPI or PayPal.

[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vite.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Free-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Step 1: Create Supabase Account & Run Schema](#step-1-supabase-setup)
4. [Step 2: Clone & Install Dependencies](#step-2-install)
5. [Step 3: Set Environment Variables](#step-3-env-vars)
6. [Step 4: Run Locally](#step-4-run-locally)
7. [Step 5: Deploy to Vercel](#step-5-deploy-vercel)
8. [Step 6: Integrate Ad Networks](#step-6-ads)
9. [Step 7: User Cashout Flow (UPI/PayPal)](#step-7-user-cashout)
10. [Step 8: How YOU Receive Ad Revenue](#step-8-owner-revenue)
11. [Step 9: Scaling for Groups](#step-9-scaling)
12. [Features Overview](#features)
13. [Security](#security)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite 5 |
| **Styling** | Tailwind CSS 3 (custom blue theme) |
| **State** | Zustand 4 + TanStack Query v5 |
| **Routing** | React Router v6 |
| **Animations** | Framer Motion + Canvas API |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| **PWA** | vite-plugin-pwa (Workbox) |
| **Hosting** | Vercel (frontend) + Supabase (backend) |
| **Ads** | AppLovin MAX + Google AdSense + PropellerAds |

---

## Project Structure

```
aquaspin-rewards/
├── public/
│   ├── icons/                 # PWA icons (replace with real PNGs)
│   └── manifest.webmanifest   # PWA manifest
├── src/
│   ├── components/
│   │   ├── ads/               # Ad network components + config
│   │   ├── games/             # Clicker, Memory, Quiz, Tap games
│   │   ├── layout/            # Header, BottomNav, Sidebar
│   │   └── ui/                # Button, Card, Modal, TokenCounter, etc.
│   ├── features/              # Zustand stores (auth, game, ui)
│   ├── hooks/                 # Custom hooks (useAuth, useTokens)
│   ├── lib/                   # Supabase client + utils
│   ├── pages/                 # All route pages
│   ├── styles/                # globals.css
│   ├── types/                 # TypeScript types + DB types
│   ├── App.tsx                # Root router
│   └── main.tsx               # Entry point + PWA + Ads init
├── supabase/
│   ├── functions/
│   │   ├── spin/              # Spin edge function (anti-cheat)
│   │   ├── cashout/           # Cashout validation
│   │   └── ad-reward/         # Ad token award
│   └── migrations/
│       └── 001_schema.sql     # Complete DB schema
├── .env.example               # Environment variables template
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## Step 1: Supabase Setup

### 1.1 Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**
3. Name it `aquaspin-rewards`, choose a strong DB password, select region closest to your users (e.g., **Southeast Asia** for India)
4. Wait ~2 minutes for the project to spin up

### 1.2 Run the database schema

1. In your Supabase project, go to **SQL Editor** → **New Query**
2. Copy the entire contents of `supabase/migrations/001_schema.sql`
3. Paste it into the editor and click **Run**
4. You should see: `Success. No rows returned.`

This creates:
- ✅ `users` table (with triggers for level-up)
- ✅ `spin_history` table
- ✅ `transactions` table (cashout requests)
- ✅ `game_stats` table
- ✅ `ad_analytics` table
- ✅ `leaderboard` view
- ✅ Row Level Security (RLS) policies
- ✅ Auto-create user profile on signup trigger
- ✅ Realtime enabled on `users` table

### 1.3 Enable Google Auth (optional)

1. Go to **Authentication** → **Providers** → **Google**
2. Enable it
3. Add your Google OAuth credentials (from [console.cloud.google.com](https://console.cloud.google.com))
4. Set redirect URL to: `https://your-project.vercel.app/dashboard`

### 1.4 Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all edge functions
supabase functions deploy spin
supabase functions deploy cashout
supabase functions deploy ad-reward
```

### 1.5 Get your API keys

Go to **Settings** → **API**:
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon / public** key → `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Install Dependencies

```bash
# Clone or open the project folder
cd "d:\Web App - Aqua Blue"

# Install all packages
npm install
```

---

## Step 3: Set Environment Variables

```bash
# Copy the template
copy .env.example .env
```

Edit `.env` with your real values:

```env
# REQUIRED — from Supabase Settings → API
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# App
VITE_APP_NAME=AquaSpin Rewards
VITE_APP_URL=http://localhost:5173

# Ads (leave as-is for development with mock ads)
VITE_MOCK_ADS=true
VITE_ADSENSE_CLIENT_ID=ca-pub-YOUR_PUBLISHER_ID
VITE_APPLOVIN_SDK_KEY=your-applovin-key
VITE_PROPELLERADS_ZONE_ID=your-zone-id

# Config
VITE_ENABLE_GUEST_PLAY=true
VITE_SPIN_COOLDOWN_SECONDS=30
```

> ⚠️ **Never commit `.env` to Git.** It's in `.gitignore` by default.

---

## Step 4: Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

You'll see:
- 🏠 Landing page with animated wheel
- 🔐 Sign up / sign in (or guest mode)
- 🎡 Spin wheel (mock ads, mock cooldowns)
- 🎮 All 4 mini-games
- 📊 Leaderboard
- 👤 Profile with cashout flow

**Build check:**
```bash
npm run build    # TypeScript compile + Vite build
npm run preview  # Preview production build locally
```

---

## Step 5: Deploy to Vercel

### 5.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial AquaSpin Rewards commit"
git remote add origin https://github.com/YOUR_USERNAME/aquaspin-rewards.git
git push -u origin main
```

### 5.2 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project** → Import your GitHub repo
3. Framework preset: **Vite** (auto-detected)
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MOCK_ADS=false` (for production)
   - `VITE_ADSENSE_CLIENT_ID` (when ready)
5. Click **Deploy**

### 5.3 Add custom domain (free)

In Vercel project → **Settings** → **Domains**:
- Add `aquaspin.app` or `yourdomain.com`
- Or use the free `.vercel.app` subdomain

### 5.4 Update Supabase Redirect URLs

Go to Supabase **Authentication** → **URL Configuration**:
- Site URL: `https://aquaspin.vercel.app`
- Redirect URLs: `https://aquaspin.vercel.app/dashboard`

---

## Step 6: Integrate Ad Networks

### 6.1 Google AdSense (Recommended for starters)

**Setup (5–10 mins):**
1. Apply at [adsense.google.com](https://adsense.google.com) — takes 1–7 days for approval
2. Once approved, get your **Publisher ID** (ca-pub-XXXXXXXXXX)
3. Set `VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXX` in Vercel environment
4. Set `VITE_MOCK_ADS=false`
5. In `src/components/ads/BannerAd.tsx`, update `data-ad-slot` with your real slot IDs

**Payment:** Google pays via wire transfer or cheque. For India, NEFT/RTGS is supported. Threshold: $100.

**CPM estimates (India):** $0.50–$2.00 per 1000 views

---

### 6.2 PropellerAds (High CPM, UPI Support)

**Setup:**
1. Sign up at [propellerads.com/publishers](https://propellerads.com/publishers)
2. Add your website URL, wait for approval (usually instant)
3. Create zones: **Onclick/Popunder**, **Interstitial**, **Push Notifications**
4. Copy zone IDs → set in `.env`
5. In `src/components/ads/BannerAd.tsx`, uncomment PropellerAds script injection

**Payment to UPI (India):**
- Go to **Payments** → **Payment Details**
- Select **Crypto** (USDT) or **Wire Transfer** — India UPI is supported via their payment processors
- Minimum payout: $5

**CPM estimates (India):** $2–$6 (Push), $3–$8 (Interstitial)

---

### 6.3 AppLovin MAX (Best for Rewarded Videos)

**Setup:**
1. Sign up at [dash.applovin.com](https://dash.applovin.com)
2. Create a **Web** app property
3. Get your **SDK Key**
4. Set `VITE_APPLOVIN_SDK_KEY=your-key` in Vercel env
5. In `src/components/ads/adConfig.ts`, uncomment the AppLovin SDK loader
6. In `src/components/ads/RewardedAd.tsx`, replace mock with real AppLovin rewarded ad call

**Payment:** AppLovin pays via ACH (US), Wire Transfer, PayPal. India: Wire transfer to bank account.

**CPM estimates:** $5–$15 (Rewarded Video), $3–$8 (Interstitial)

---

### 6.4 Switch from Mock to Real Ads

In Vercel environment variables, change:
```
VITE_MOCK_ADS=false
```

Then redeploy. The app will automatically load real ad SDKs.

---

## Step 7: User Cashout Flow (UPI/PayPal)

### How users cash out:

1. User earns **1000+ tokens** through spins and games
2. Goes to **Profile** → clicks **Cash Out**
3. Selects amount (multiples of 1000 tokens = $1 USD each)
4. Chooses **UPI** or **PayPal**
5. Enters their UPI ID (e.g., `john@paytm`) or PayPal email
6. Submits request → tokens are immediately deducted
7. Transaction appears as **Pending** in their history

### How YOU (owner) process it:

1. Log into your **Supabase Dashboard**
2. Go to **Table Editor** → `transactions` table
3. Filter by `status = pending`
4. For each request:
   - Send money via **UPI** (PhonePe, GPay, Paytm) to the UPI ID shown
   - Or send via **PayPal** to the email shown
   - Note the transaction/UTR reference number
5. Update the transaction in Supabase:
   - Set `status` = `approved`
   - Set `reference` = UTR/PayPal transaction ID
6. User sees status update in real-time on their Profile page

### Cashout exchange rate:
- **1000 tokens = $1.00 USD** (≈ ₹83 at current rates)
- Minimum cashout: **1000 tokens**
- Processing time: **24–48 hours**

---

## Step 8: How YOU Receive Ad Revenue

All ad revenue goes **directly to your accounts** at each network. The app earns you money through impressions:

| Network | Payment Method | Min. Threshold |
|---|---|---|
| Google AdSense | Wire/NEFT to Indian bank | $100 |
| PropellerAds | USDT/Wire/PayPal | $5 |
| AppLovin MAX | Wire transfer | $50 |
| RichAds | Wire/PayPal/Bitcoin | $10 |

**Setup your payment in each network dashboard:**
- **AdSense:** Settings → Payments → Add payment method → Bank account (NEFT/UPI via Razorpay)
- **PropellerAds:** Dashboard → Finance → Payment Details → Add UPI or Bank
- **AppLovin:** Dashboard → Account → Payments → Wire Transfer

**Revenue cycle:** Ad networks pay monthly (Net-30 or Net-45 terms). You'll receive money 30–45 days after the previous month ends.

### Revenue projection (rough estimate for 1000 DAU):

| Format | Impressions/day | CPM | Daily Revenue |
|---|---|---|---|
| Rewarded Video | 3,000 | $8 | $24 |
| Interstitial | 5,000 | $5 | $25 |
| Banner | 15,000 | $1 | $15 |
| **Total** | | | **~$64/day** |

---

## Step 9: Scaling for Groups of Users

### Infrastructure (all free-tier initially):

| Service | Free Limit | Notes |
|---|---|---|
| **Supabase DB** | 500 MB storage, 2 GB bandwidth/mo | Upgrade at $25/mo for 8 GB |
| **Supabase Auth** | 50,000 MAU | More than enough to start |
| **Supabase Edge Functions** | 500,000 invocations/mo | Covers ~16,000 spins/day |
| **Supabase Realtime** | 200 concurrent connections | Upgrade for large leaderboards |
| **Vercel** | 100 GB bandwidth/mo | Scale with Edge Network |

### Performance tips for many simultaneous users:

1. **Enable Supabase connection pooling** (PgBouncer) in Settings → Database
2. **Add CDN** via Vercel's Edge Network (automatic)
3. **Rate limit aggressively** — the edge functions already enforce 30s cooldowns
4. **Use Supabase Realtime channels wisely** — only subscribe to leaderboard on the Leaderboard page, not globally
5. **Cache leaderboard** with TanStack Query's `staleTime: 30_000` (30-second cache)

### Multi-user sharing:
- Share your Vercel URL with anyone: `https://aquaspin.vercel.app`
- Each user signs up independently via Supabase Auth
- All spins, tokens, and cashouts are isolated per user via RLS
- Leaderboard shows all users ranked globally
- Invite collaborators to GitHub repo for code access

### Database scaling path:
```
Free tier (0–500 users) → Supabase Pro $25/mo (500–10,000 users)
→ Supabase Team $599/mo (10,000+ users) + Vercel Pro $20/mo
```

---

## Features

| Feature | Status | Details |
|---|---|---|
| 🎡 Spin Wheel | ✅ | Canvas, 12 segments, physics, server-side result |
| 🎮 Clicker Game | ✅ | 10s timed, click-speed scoring |
| 🧠 Memory Game | ✅ | 8-pair card flip, move counting |
| 🎯 Quiz Game | ✅ | 10 questions, 15 tokens/correct |
| ✨ Tap Challenge | ✅ | Spawning targets, combo multiplier |
| 💸 UPI Cashout | ✅ | Edge function validation + manual approval |
| 💰 PayPal Cashout | ✅ | Same flow |
| 📺 Rewarded Ads | ✅ | +50 tokens, daily limit, edge function verification |
| 📢 Banner Ads | ✅ | AdSense + mock fallback |
| 📲 Full-Screen Ads | ✅ | Interstitial with countdown |
| 🔥 Daily Streaks | ✅ | 7-day cycle, bonus on day 7 |
| 🎁 Daily Rewards | ✅ | Claim once per day, streak-based |
| 🏆 Leaderboard | ✅ | Realtime Supabase subscription |
| 🛒 Token Shop | ✅ | 6 power-ups purchasable with tokens |
| 👥 Referral System | ✅ | Referral code + share URL |
| 🌐 Guest Mode | ✅ | 200 tokens, no signup required |
| 📱 PWA | ✅ | Installable, offline-capable |
| 🔐 Google OAuth | ✅ | Supabase Auth |
| 🌙 Dark Mode | ✅ | Default dark, light toggle available |
| 🔊 Sound Effects | ✅ | Web Audio API tones |
| 📳 Haptic Feedback | ✅ | Vibration API on mobile |
| 🎨 Wheel Themes | ✅ | Aqua, Gold, Neon, Fire |
| 🛡️ Anti-Cheat | ✅ | Server-side random, cooldowns |
| 📊 Ad Analytics | ✅ | Impressions logged to Supabase |

---

## Security

- **Row Level Security (RLS)**: Every table has policies — users can only read/write their own data
- **Server-side spin logic**: The actual reward is generated in a Deno Edge Function using `Math.random()` — clients cannot manipulate it
- **Cooldown enforcement**: Server checks the last spin timestamp before allowing a new spin
- **Input validation**: All cashout inputs are validated server-side (UPI format, minimum tokens, etc.)
- **JWT authentication**: Every edge function call requires a valid Supabase JWT token
- **Anti-abuse limits**: Daily ad limits (10 rewarded/day), max 1 pending cashout per user
- **Guest isolation**: Guest tokens are local-only and reset on refresh

---

## Development Commands

```bash
npm run dev          # Start dev server at :5173
npm run build        # TypeScript check + production build
npm run preview      # Preview production build locally
npm run lint         # ESLint check
npm run type-check   # TypeScript type check only
```

---

## License

MIT License — Free to use, modify, and deploy. Attribution appreciated but not required.

---

## Support

- 📧 Email: support@aquaspin.app
- 🐛 Issues: Open a GitHub issue
- 💬 Community: Join the Discord (link TBD)

---

*Built with ❤️ using React, Supabase, and the open web platform.*
