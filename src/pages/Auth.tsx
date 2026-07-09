// src/pages/Auth.tsx
// Authentication: email/password + Google OAuth + guest mode

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Disc3, Chrome, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'signup';

export function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, loginWithGoogle, loginAsGuest, profile } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (profile) navigate('/dashboard');
  }, [profile, navigate]);

  // Handle guest redirect from URL param
  useEffect(() => {
    if (searchParams.get('guest') === 'true') {
      loginAsGuest();
      navigate('/dashboard');
    }
  }, [searchParams, loginAsGuest, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await login(email, password);
        if (error) { toast.error(error); return; }
        toast.success('Welcome back! 🎉');
        navigate('/dashboard');
      } else {
        if (username.length < 3) {
          toast.error('Username must be at least 3 characters');
          return;
        }
        const { error } = await signup(email, password, username);
        if (error) { toast.error(error); return; }
        toast.success('Account created! You earned 500 bonus tokens! 🎊');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await loginWithGoogle();
    if (error) toast.error(error);
  };

  const handleGuest = () => {
    loginAsGuest();
    toast('Playing as guest. Sign up to save your progress!', { icon: '👋' });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 py-20">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-neon/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-neon to-cyan-glow flex items-center justify-center shadow-cyan-glow">
              <Disc3 size={28} className="text-navy-900" />
            </div>
            <span className="font-display text-xl font-bold text-gradient-cyan">AquaSpin Rewards</span>
          </Link>
          <p className="text-text-secondary text-sm mt-2">
            {mode === 'login' ? 'Welcome back!' : 'Join 50,000+ players earning real cash'}
          </p>
        </div>

        {/* Auth card */}
        <div className="glass-card rounded-2xl p-6">
          {/* Mode tabs */}
          <div className="flex bg-navy-800 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as AuthMode[]).map((m) => (
              <button
                key={m}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-cyan-neon/20 text-cyan-neon'
                    : 'text-muted hover:text-text-secondary'
                }`}
                onClick={() => setMode(m)}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google login */}
          <button
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-navy-600 text-text-secondary text-sm font-medium hover:bg-navy-700 hover:text-text-primary transition-all duration-200 mb-4"
            onClick={handleGoogle}
            id="google-login-btn"
          >
            <Chrome size={18} />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <hr className="flex-1 border-navy-700" />
            <span className="text-xs text-muted">or</span>
            <hr className="flex-1 border-navy-700" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-neon pl-9"
                      minLength={3}
                      maxLength={20}
                      required={mode === 'signup'}
                      id="username-input"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-neon pl-9"
                required
                id="email-input"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-neon pl-9 pr-10"
                required
                minLength={6}
                id="password-input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-secondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === 'signup' && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-neon/5 border border-cyan-neon/20">
                <span className="text-lg">🎁</span>
                <p className="text-xs text-cyan-neon">Sign up bonus: <strong>500 tokens</strong> credited instantly!</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              size="lg"
              id="auth-submit-btn"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-4">
            <Button
              variant="ghost"
              fullWidth
              onClick={handleGuest}
              id="guest-play-btn"
            >
              Play as Guest (200 free tokens)
            </Button>
          </div>
        </div>

        {/* Legal notice */}
        <p className="text-center text-2xs text-muted mt-4">
          By signing up, you agree to our{' '}
          <Link to="/legal" className="text-cyan-neon hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/legal" className="text-cyan-neon hover:underline">Privacy Policy</Link>.
          {' '}You must be 18+ to cash out.
        </p>
      </div>
    </div>
  );
}
