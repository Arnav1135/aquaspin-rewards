// src/pages/Auth.tsx
// Authentication: email/password + Google OAuth + guest mode

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Disc3, Chrome, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-sky-100 to-blue-200 flex flex-col items-center justify-center px-4 py-20 relative">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-cyan-300/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Disc3 size={32} className="text-white" />
            </div>
            <span className="font-display text-2xl font-extrabold text-slate-800 tracking-tight">AquaSpin Rewards</span>
          </Link>
          <p className="text-slate-600 text-sm mt-2 font-medium">
            {mode === 'login' ? 'Welcome back! Log in to continue.' : 'Join 50,000+ players earning real cash'}
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-2xl shadow-blue-900/10">
          {/* Mode tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            {(['login', 'signup'] as AuthMode[]).map((m) => (
              <button
                key={m}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                  mode === m
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setMode(m)}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google login */}
          <button
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-700 text-sm font-bold hover:border-blue-400 hover:text-blue-600 transition-all duration-200 mb-6 shadow-sm"
            onClick={handleGoogle}
            id="google-login-btn"
          >
            <Chrome size={20} className="text-blue-500" />
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <hr className="flex-1 border-slate-200" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">or</span>
            <hr className="flex-1 border-slate-200" />
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
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
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
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                required
                id="email-input"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl py-3 pl-11 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                required
                minLength={6}
                id="password-input"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === 'signup' && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xl">🎁</span>
                <p className="text-sm text-blue-800 font-medium leading-tight">Sign up bonus: <strong className="text-blue-900 font-extrabold">500 tokens</strong> credited instantly!</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
              disabled={loading}
              id="auth-submit-btn"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-slate-500 hover:text-blue-600 font-semibold text-sm transition-colors"
              onClick={handleGuest}
              id="guest-play-btn"
            >
              Play as Guest (200 free tokens)
            </button>
          </div>
        </div>

        {/* Legal notice */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          By signing up, you agree to our{' '}
          <Link to="/legal" className="text-blue-600 font-bold hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/legal" className="text-blue-600 font-bold hover:underline">Privacy Policy</Link>.
          {' '}<br className="hidden sm:block" />You must be 18+ to cash out.
        </p>
      </div>
    </div>
  );
}
