// src/main.tsx
// Application entry point — mounts React, registers PWA, loads ad SDKs

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@/styles/globals.css';

// ── Global Error Handling ───────────────────────────────────────────────────
// Phase 3: Setup centralized error handling for the entire app
import { setupGlobalErrorHandlers } from '@/lib/errors';

// Initialize global error handlers
// Catches unhandled promise rejections and window errors
setupGlobalErrorHandlers();

// Optional: Setup error analytics/tracking service
// Uncomment and configure when ready to send errors to Sentry, Rollbar, etc.
// Example:
// window.__ERROR_ANALYTICS__ = {
//   track: (data) => {
//     fetch('/api/errors', { 
//       method: 'POST', 
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(data)
//     });
//   }
// };

// ── PWA Service Worker ──────────────────────────────────────────────────────
// vite-plugin-pwa provides the virtual module for SW registration
// @ts-expect-error — virtual module provided by vite-plugin-pwa at build time
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegisteredSW(swUrl: string, r: { installing: unknown; update: () => Promise<void> } | undefined) {
    console.log('[PWA] Service Worker registered:', swUrl);
    if (r) {
      setInterval(async () => {
        if (!navigator.onLine) return;
        const resp = await fetch(swUrl, { cache: 'no-store' });
        if (resp?.status === 200) await r.update();
      }, 60 * 60 * 1000);
    }
  },
  onOfflineReady() {
    console.log('[PWA] App ready for offline use.');
  },
});

// ── Ad SDK initialization ───────────────────────────────────────────────────
import { loadGoogleAdSense, loadAppLovinSDK } from '@/components/ads/adConfig';

 
const env = (import.meta as any).env;
const adsenseClientId = env.VITE_ADSENSE_CLIENT_ID as string | undefined;
const appLovinKey = env.VITE_APPLOVIN_SDK_KEY as string | undefined;

if (adsenseClientId) loadGoogleAdSense(adsenseClientId);
if (appLovinKey) loadAppLovinSDK(appLovinKey);

// ── Mount React ─────────────────────────────────────────────────────────────
const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
