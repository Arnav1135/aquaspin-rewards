// src/components/ads/BannerAd.tsx
// Persistent banner ad — bottom or top placement

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isMockAds } from './adConfig';

interface BannerAdProps {
  position?: 'top' | 'bottom';
  className?: string;
  clientId?: string;
  slot?: string;
}

export function BannerAd({ position = 'bottom', className, clientId, slot }: BannerAdProps) {
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isMockAds && clientId) {
      // Push AdSense ad unit
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setLoaded(true);
      } catch {
        // AdSense not loaded yet
      }
    } else {
      setLoaded(true);
    }
  }, [clientId]);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'relative w-full flex items-center justify-center bg-navy-800/90 border-navy-700/50',
        position === 'bottom' ? 'border-t' : 'border-b',
        'h-[60px] lg:h-[90px] overflow-hidden',
        className
      )}
      role="complementary"
      aria-label="Advertisement"
    >
      {isMockAds ? (
        /* Mock banner ad for development */
        <div className="flex items-center justify-center w-full h-full">
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-neon/20 flex items-center justify-center">
              <span className="text-xs">📢</span>
            </div>
            <div>
              <p className="text-xs text-muted">Advertisement</p>
              <p className="text-sm font-medium text-text-secondary">
                [Mock Ad] High CPM • AppLovin MAX / AdSense goes here
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Real AdSense banner */
        loaded && (
          <ins
            className="adsbygoogle block"
            style={{ display: 'block', width: '100%', height: '60px' }}
            data-ad-slot={slot ?? 'your-banner-slot-id'}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data-ad-client={clientId ?? (import.meta as any).env.VITE_ADSENSE_CLIENT_ID}
          />
        )
      )}

      {/* Dismiss button */}
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-text-secondary hover:bg-navy-700 transition-all"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss ad"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Interstitial ad component ─────────────────────────────────────────────────
interface InterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
  delay?: number;  // seconds before close button appears
}

export function InterstitialAd({ isOpen, onClose, delay = 3 }: InterstitialAdProps) {
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(delay);

  useEffect(() => {
    if (!isOpen) {
      setCanClose(false);
      setCountdown(delay);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, delay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 backdrop-blur-md">
      <div className="relative w-full max-w-md mx-4 glass-card rounded-2xl overflow-hidden aspect-[9/16] sm:aspect-video flex flex-col">
        {/* Close button */}
        <div className="absolute top-3 right-3 z-10">
          {canClose ? (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-navy-900/80 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
              aria-label="Close ad"
              id="close-interstitial-btn"
            >
              <X size={16} />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-navy-900/80 flex items-center justify-center">
              <span className="font-mono text-xs font-bold text-text-secondary">{countdown}</span>
            </div>
          )}
        </div>

        {/* Ad content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {isMockAds ? (
            <div className="space-y-3">
              <div className="text-4xl">📺</div>
              <p className="text-sm text-muted">Advertisement</p>
              <p className="text-text-secondary text-sm">
                [Mock Interstitial] Full-screen ad from AppLovin / PropellerAds goes here.
                {'\n'}High CPM for Indian users: $3–8 per 1000 impressions.
              </p>
            </div>
          ) : (
            /* Real ad integration point */
            <div className="w-full h-full" id="interstitial-ad-container" />
          )}
        </div>

        <p className="text-center text-2xs text-muted pb-3">
          Ad • {canClose ? 'You can close now' : `Close in ${countdown}s`}
        </p>
      </div>
    </div>
  );
}
