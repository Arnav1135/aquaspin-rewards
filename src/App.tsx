// src/App.tsx
// Root router with protected routes, layout, and global providers

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Sidebar } from '@/components/layout/Sidebar';

import { Landing } from '@/pages/Landing';
import { Auth } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { WheelGame } from '@/pages/WheelGame';
import { MiniGames } from '@/pages/MiniGames';
import { Leaderboard } from '@/pages/Leaderboard';
import { Profile } from '@/pages/Profile';
import { Shop } from '@/pages/Shop';
import { Legal } from '@/pages/Legal';

// ── TanStack Query client ───────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Protected route wrapper ─────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#16213E' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#4A90D9]/30 border-t-[#4A90D9] animate-spin" />
          <p className="text-[#A8CBEA] text-sm font-medium">Loading AquaSpin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// ── Layout wrapper for authenticated pages ──────────────────────────────────
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/auth';

  // Don't show header/nav on landing and auth pages
  if (isLanding || isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <Sidebar />
      <main className="relative z-0">{children}</main>
      <BottomNav />
    </>
  );
}

// ── Auth Initializer (runs exactly once) ────────────────────────────────────
function AuthInitializer() {
  const { initialize } = useAuthStore();
  useEffect(() => {
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Theme initializer ───────────────────────────────────────────────────────
function ThemeInit() {
  const { theme } = useUIStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return null;
}

// ── Main App ────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/legal" element={<Legal />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/wheel" element={<ProtectedRoute><WheelGame /></ProtectedRoute>} />
          <Route path="/games" element={<ProtectedRoute><MiniGames /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer />
        <ThemeInit />
        <AppRoutes />

        {/* Global toast notifications */}
        <Toaster
          position="top-center"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#16213E',
              color: '#F5F8FC',
              border: '1px solid rgba(74, 144, 217, 0.20)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              boxShadow: '0 8px 32px rgba(22, 33, 62, 0.35)',
            },
            success: {
              iconTheme: { primary: '#3DDC97', secondary: '#16213E' },
            },
            error: {
              iconTheme: { primary: '#F76C6C', secondary: '#16213E' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
