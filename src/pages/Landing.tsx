// src/pages/Landing.tsx
// Hero landing page with animated wheel preview, features, testimonials

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
    color: '#00F0FF',
  },
  {
    icon: Zap,
    title: 'Mini Games',
    description: 'Clicker, Memory, Quiz, and Tap Challenge — earn tokens in multiple ways.',
    color: '#FFD700',
  },
  {
    icon: Coins,
    title: 'Real Cashouts',
    description: '1000 tokens = $1 USD. Cash out via UPI or PayPal instantly.',
    color: '#00FF87',
  },
  {
    icon: Trophy,
    title: 'Leaderboard',
    description: 'Compete globally. Top players earn bonus multipliers and special rewards.',
    color: '#FF9900',
  },
  {
    icon: Shield,
    title: 'Anti-Cheat',
    description: 'Server-side spin logic. Fair for everyone. Audited and secure.',
    color: '#A855F7',
  },
  {
    icon: Star,
    title: 'Daily Streaks',
    description: 'Log in daily for streak bonuses. Day 7 reward: 500 tokens!',
    color: '#FF3366',
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
  { label: 'Countries', value: '85+' },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-navy-900 overflow-x-hidden">
      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-neon/5 blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gold-neon/5 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-neon/3 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-neon/10 border border-cyan-neon/30 mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Zap size={14} className="text-cyan-neon" />
            <span className="text-xs font-semibold text-cyan-neon">1000 Tokens = $1 USD • Cashout via UPI / PayPal</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-display font-black mb-4 leading-tight"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-text-primary">Spin the Wheel,</span>
            <br />
            <span className="text-gradient-cyan">Win Real Cash</span>
          </motion.h1>

          <motion.p
            className="text-text-secondary text-lg mb-8 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Play spinning wheel and mini-games to earn tokens. Cash out to your UPI or PayPal. Completely free to start!
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/auth">
              <Button size="xl" variant="primary" id="hero-signup-btn">
                Play Now — It's Free
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link to="/auth?guest=true">
              <Button size="xl" variant="neon" id="hero-guest-btn">
                <Play size={18} />
                Try as Guest
              </Button>
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="flex items-center justify-center gap-2 mt-6 text-sm text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex -space-x-1">
              {['#00F0FF', '#FFD700', '#00FF87', '#FF9900'].map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-navy-900"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span>50,000+ players already earning</span>
          </motion.div>
        </div>

        {/* Animated wheel preview */}
        <motion.div
          className="relative mt-12 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="relative w-48 h-48 sm:w-64 sm:h-64">
            {/* Animated ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-cyan-neon/40"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              style={{ boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-gold-neon/30"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            />

            {/* Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <Disc3 size={48} className="text-cyan-neon drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]" />
              </motion.div>
              <p className="font-display text-xs font-bold text-cyan-neon mt-2 animate-pulse-cyan">SPIN!</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-8 border-y border-navy-700">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="font-display text-2xl font-bold text-gradient-cyan">{stat.value}</p>
                <p className="text-sm text-muted">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-3">Everything You Need</h2>
            <p className="text-text-secondary">A complete rewards ecosystem powered by Supabase and edge computing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card hover glow="cyan" className="h-full">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${feature.color}20`, border: `1px solid ${feature.color}40` }}
                    >
                      <Icon size={20} style={{ color: feature.color }} />
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1">{feature.title}</h3>
                    <p className="text-sm text-text-secondary">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Banner Ad (mid-page) ── */}
      <BannerAd position="bottom" className="my-4" />

      {/* ── Testimonials ── */}
      <section className="py-20 px-4 bg-navy-800/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center text-text-primary mb-12">Real Players, Real Earnings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full">
                  <div className="flex mb-2">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} size={14} className="fill-gold-neon text-gold-neon" />
                    ))}
                  </div>
                  <p className="text-sm text-text-secondary mb-3 italic">"{t.text}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-text-primary">{t.name}</p>
                      <p className="text-2xs text-muted">{t.location}</p>
                    </div>
                    <div className="token-badge text-xs">
                      <Coins size={12} className="text-cyan-neon" />
                      {t.tokens}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="font-display text-3xl font-bold text-text-primary mb-4">
            Start Earning Today
          </h2>
          <p className="text-text-secondary mb-8">
            Join 50,000+ players. Free to join. Real cash rewards. No investment required.
          </p>
          <Link to="/auth">
            <Button size="xl" variant="primary" fullWidth className="max-w-xs mx-auto" id="cta-signup-btn">
              Create Free Account
              <ArrowRight size={20} />
            </Button>
          </Link>
          <p className="text-muted text-xs mt-4">No credit card required • Instant access • Works on mobile</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-navy-700 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-neon to-cyan-glow flex items-center justify-center">
              <span className="text-navy-900 font-bold text-xs">A</span>
            </div>
            <span className="font-display text-sm text-gradient-cyan">AquaSpin Rewards</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <Link to="/legal" className="hover:text-text-secondary transition-colors">Privacy Policy</Link>
            <Link to="/legal#terms" className="hover:text-text-secondary transition-colors">Terms of Service</Link>
            <a href="mailto:support@aquaspin.app" className="hover:text-text-secondary transition-colors">Support</a>
          </div>
          <p className="text-2xs text-muted">© 2024 AquaSpin Rewards. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
