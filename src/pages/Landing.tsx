// src/pages/Landing.tsx
// Hero landing page with animated wheel preview, features, testimonials — Fintech Redesign

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Disc3, Coins, Zap, Shield, Trophy, Star, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BannerAd } from '@/components/ads/BannerAd';

const features = [
  {
    icon: Disc3,
    title: 'Spin to Win',
    description: 'Physics-based spinning wheel with 12 segments. Win up to 500 tokens per spin!',
    color: '#66bdf2',
  },
  {
    icon: Zap,
    title: 'Mini Games',
    description: '16 premium games (Mines, Chess, Flappy, Pool, Solitaire, and more) — earn tokens instantly.',
    color: '#66bdf2',
  },
  {
    icon: Coins,
    title: 'Real Cashouts',
    description: '1000 tokens = $1 USD. Cash out via UPI or PayPal instantly.',
    color: '#66bdf2',
  },
  {
    icon: Trophy,
    title: 'Leaderboard',
    description: 'Compete globally. Top players earn bonus multipliers and special rewards.',
    color: '#7b8bc1',
  },
  {
    icon: Shield,
    title: 'Anti-Cheat',
    description: 'Server-side spin logic. Fair for everyone. Audited and secure.',
    color: '#66bdf2',
  },
  {
    icon: Star,
    title: 'Daily Streaks',
    description: 'Log in daily for streak bonuses. Day 7 reward: 500 tokens!',
    color: '#7b8bc1',
  },
];

const testimonials = [
  {
    name: 'Priya S.',
    location: 'Mumbai, India',
    text: 'I cashed out ₹500 via UPI in just 2 weeks of playing! The wheel is super addictive.',
    stars: 5,
    tokens: '12,450',
  },
  {
    name: 'Rahul K.',
    location: 'Bangalore, India',
    text: 'Got jackpot 3 times this month. Already earned $15 USD. Amazing platform!',
    stars: 5,
    tokens: '23,100',
  },
  {
    name: 'Alex M.',
    location: 'Toronto, Canada',
    text: 'PayPal cashout was smooth. Took 24 hours to receive. Totally legit!',
    stars: 5,
    tokens: '8,900',
  },
];

const stats = [
  { label: 'Active Players', value: '50,000+' },
  { label: 'Tokens Earned', value: '12M+' },
  { label: 'Cashouts Paid', value: '$45,000+' },
  { label: 'Countries Supported', value: '85+' },
];

export function Landing() {
  return (
    <div
      className="min-h-screen overflow-x-hidden pt-16"
      style={{ background: 'linear-gradient(160deg, #e1eff8 0%, #cfe5f5 100%)' }}
    >
      {/* ── Hero Section ── */}
      <section className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-16">
        {/* Soft layout background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#66bdf2]/8 blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#66bdf2]/8 blur-[100px] animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center z-10">
          {/* Tagline Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{
              background: 'rgba(74, 144, 217, 0.12)',
              border: '1px solid rgba(74, 144, 217, 0.25)',
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Zap size={14} style={{ color: '#66bdf2' }} />
            <span className="text-xs font-semibold" style={{ color: '#7b8bc1' }}>
              1000 Tokens = $1 USD • Cashout via UPI / PayPal
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-black mb-4 leading-tight"
            style={{
              fontSize: 'clamp(2.3rem, 6vw, 4.5rem)',
              color: '#7b8bc1',
              letterSpacing: '-0.03em',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Spin the Wheel,
            <br />
            <span className="text-gradient-sky">Win Real Cash Rewards</span>
          </motion.h1>

          <motion.p
            className="text-lg mb-8 max-w-xl mx-auto"
            style={{ color: 'rgba(22,33,62,0.65)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Play the spinning wheel and 16+ premium mini-games to earn tokens. Cash out directly to your UPI or PayPal instantly.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/auth">
              <Button size="lg" variant="primary" id="hero-signup-btn">
                Play Now — It's Free
                <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/auth?guest=true">
              <Button size="lg" variant="ghost" id="hero-guest-btn">
                <Play size={16} className="mr-1" />
                Try as Guest
              </Button>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            className="flex items-center justify-center gap-2 mt-8 text-sm"
            style={{ color: 'rgba(22,33,62,0.50)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex -space-x-1.5">
              {['#66bdf2', '#66bdf2', '#7b8bc1', '#c2e7fa'].map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-[#e1eff8]"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span>Over 50,000+ active players earning</span>
          </motion.div>
        </div>

        {/* Animated wheel preview (Fintech Style) */}
        <motion.div
          className="relative mt-14 flex items-center justify-center z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <motion.div
              className="absolute inset-0 rounded-full border-4"
              style={{
                borderColor: 'rgba(74, 144, 217, 0.25)',
                boxShadow: '0 0 32px rgba(74, 144, 217, 0.20)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2"
              style={{ borderColor: 'rgba(61, 220, 151, 0.20)' }}
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />

            {/* Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <Disc3 size={44} style={{ color: '#66bdf2' }} />
              </motion.div>
              <p
                className="font-bold text-xs mt-3.5 tracking-wider animate-pulse"
                style={{ color: '#66bdf2' }}
              >
                SPIN!
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section
        className="py-10"
        style={{
          background: 'rgba(74, 144, 217, 0.08)',
          borderTop: '1px solid rgba(74, 144, 217, 0.15)',
          borderBottom: '1px solid rgba(74, 144, 217, 0.15)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <p className="text-2xl font-bold font-mono" style={{ color: '#7b8bc1' }}>{stat.value}</p>
                <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: 'rgba(22,33,62,0.45)' }}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#7b8bc1' }}>
              Designed For Transparency
            </h2>
            <p className="text-sm" style={{ color: 'rgba(22,33,62,0.55)' }}>
              A complete and secure play-to-earn rewards ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card variant="white" className="h-full">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{
                        backgroundColor: `${feature.color}15`,
                        border: `1.5px solid ${feature.color}30`,
                      }}
                    >
                      <Icon size={18} style={{ color: feature.color }} />
                    </div>
                    <h3 className="font-bold text-sm mb-1" style={{ color: '#7b8bc1' }}>
                      {feature.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(22,33,62,0.60)' }}>
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Mid-page Ad Banner ── */}
      <BannerAd position="bottom" className="my-4" />

      {/* ── Testimonials ── */}
      <section
        className="py-20 px-4"
        style={{ background: 'rgba(74, 144, 217, 0.04)' }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12" style={{ color: '#7b8bc1' }}>
            Earners Feedback
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card variant="white" className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex gap-0.5 mb-2.5">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} size={12} className="fill-[#66bdf2] text-[#66bdf2]" />
                      ))}
                    </div>
                    <p className="text-xs mb-4 italic" style={{ color: 'rgba(22,33,62,0.65)' }}>
                      "{t.text}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[rgba(168,203,234,0.25)]">
                    <div>
                      <p className="font-bold text-xs" style={{ color: '#7b8bc1' }}>{t.name}</p>
                      <p className="text-3xs" style={{ color: 'rgba(22,33,62,0.40)' }}>{t.location}</p>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-semibold font-mono"
                      style={{ background: 'rgba(61,220,151,0.12)', color: '#66bdf2' }}
                    >
                      <Coins size={10} />
                      {t.tokens}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final Call to Action ── */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-lg mx-auto space-y-4">
          <h2 className="text-2xl font-bold" style={{ color: '#7b8bc1' }}>
            Start Earning Today
          </h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'rgba(22,33,62,0.60)' }}>
            Join 50,000+ players completely free. Play casual, fun arcade games and get real cashouts.
          </p>
          <div className="pt-2">
            <Link to="/auth">
              <Button size="lg" variant="primary" className="max-w-xs mx-auto" id="cta-signup-btn">
                Create Free Account
                <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
          <p className="text-2xs" style={{ color: 'rgba(22,33,62,0.40)' }}>
            No deposit required • Instant registration • Works on mobile browsers
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-10 px-4"
        style={{ borderTop: '1px solid rgba(168,203,234,0.25)' }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #66bdf2 0%, #66bdf2 100%)' }}
            >
              <span className="text-[#7b8bc1] font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-xs" style={{ color: '#7b8bc1' }}>
              AquaSpin Rewards
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold" style={{ color: 'rgba(22,33,62,0.50)' }}>
            <Link to="/legal" className="hover:text-[#66bdf2] transition-colors">Privacy Policy</Link>
            <Link to="/legal#terms" className="hover:text-[#66bdf2] transition-colors">Terms of Service</Link>
            <a href="mailto:support@aquaspin.app" className="hover:text-[#66bdf2] transition-colors">Support</a>
          </div>
          <p className="text-3xs" style={{ color: 'rgba(22,33,62,0.40)' }}>
            © 2024 AquaSpin Rewards. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
