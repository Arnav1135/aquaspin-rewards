// src/features/uiStore.ts
// Zustand store for UI state: theme, toasts, modals, navigation

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type AppTheme = 'dark' | 'light';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  // Theme
  theme: AppTheme;

  // Navigation
  sidebarOpen: boolean;

  // Modals
  cashoutModalOpen: boolean;
  adModalOpen: boolean;
  settingsModalOpen: boolean;
  dailyRewardModalOpen: boolean;

  // Toast queue (managed by react-hot-toast, this tracks extra state)
  activeToasts: Toast[];

  // Ad state
  adInProgress: boolean;
  adType: 'rewarded' | 'interstitial' | 'banner' | null;

  // Actions
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openCashoutModal: () => void;
  closeCashoutModal: () => void;
  openAdModal: (adType: 'rewarded' | 'interstitial') => void;
  closeAdModal: () => void;
  toggleSettings: () => void;
  openDailyRewardModal: () => void;
  closeDailyRewardModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setAdInProgress: (inProgress: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'dark',
        sidebarOpen: false,
        cashoutModalOpen: false,
        adModalOpen: false,
        settingsModalOpen: false,
        dailyRewardModalOpen: false,
        activeToasts: [],
        adInProgress: false,
        adType: null,

        setTheme: (theme) => {
          set({ theme });
          // Apply to HTML element for Tailwind dark mode
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        },

        toggleTheme: () => {
          const { theme, setTheme } = get();
          setTheme(theme === 'dark' ? 'light' : 'dark');
        },

        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        openCashoutModal: () => set({ cashoutModalOpen: true }),
        closeCashoutModal: () => set({ cashoutModalOpen: false }),

        openAdModal: (adType) => set({ adModalOpen: true, adType }),
        closeAdModal: () => set({ adModalOpen: false, adType: null }),

        toggleSettings: () => set((s) => ({ settingsModalOpen: !s.settingsModalOpen })),

        openDailyRewardModal: () => set({ dailyRewardModalOpen: true }),
        closeDailyRewardModal: () => set({ dailyRewardModalOpen: false }),

        addToast: (toast) => {
          const id = Date.now().toString();
          set((s) => ({ activeToasts: [...s.activeToasts, { ...toast, id }] }));
          // Auto-remove after duration
          setTimeout(() => get().removeToast(id), toast.duration ?? 4000);
        },

        removeToast: (id) =>
          set((s) => ({ activeToasts: s.activeToasts.filter((t) => t.id !== id) })),

        setAdInProgress: (inProgress) => set({ adInProgress: inProgress }),
      }),
      {
        name: 'aquaspin-ui',
        partialize: (state) => ({ theme: state.theme }),
      }
    )
  )
);
