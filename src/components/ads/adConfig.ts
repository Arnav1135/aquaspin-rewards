// src/components/ads/adConfig.ts
// Ad network configuration and SDK helpers

export const AD_NETWORKS = {
  applovin: {
    name: 'AppLovin MAX',
    sdkUrl: 'https://d3ux4g2i7nt7k0.cloudfront.net/sdk/applovin-max-sdk.js',
    setup: `
      // 1. Sign up at https://dash.applovin.com
      // 2. Create a Web app and get your SDK Key
      // 3. Add your bank/UPI in payment settings
      // 4. Replace VITE_APPLOVIN_SDK_KEY in .env
    `,
  },
  adsense: {
    name: 'Google AdSense',
    setup: `
      // 1. Apply at https://adsense.google.com
      // 2. Add your payment info (supports UPI in India)
      // 3. Get your Publisher ID (ca-pub-XXXXXXXXXX)
      // 4. Add VITE_ADSENSE_CLIENT_ID to .env
    `,
  },
  propellerads: {
    name: 'PropellerAds',
    setup: `
      // 1. Sign up at https://propellerads.com
      // 2. Add publisher profile with UPI payment
      // 3. Create ad zones (rewarded, interstitial, banner)
      // 4. Add zone IDs to .env
    `,
  },
  richads: {
    name: 'RichAds',
    setup: `
      // 1. Sign up at https://richads.com (publisher)
      // 2. Add your UPI/bank for payment
      // 3. Get your publisher tag/zone IDs
      // 4. High CPM for Indian traffic (push + pop ads)
    `,
  },
};

// ── Mock ad for development (always succeeds) ─────────────────────────────────
export interface AdOptions {
  adType: 'rewarded' | 'interstitial' | 'banner';
  network?: string;
  onComplete?: (success: boolean) => void;
  onError?: (error: string) => void;
}

 
export const isMockAds = (import.meta as any).env.VITE_MOCK_ADS === 'true';

/**
 * Mock ad system for development.
 * Replace with real SDK calls in production.
 */
export function showMockAd(options: AdOptions): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`[MockAd] Showing ${options.adType} ad from ${options.network ?? 'mock'}`);

    // Simulate ad duration
    const durations = { rewarded: 5000, interstitial: 3000, banner: 0 };
    const duration = durations[options.adType];

    if (options.adType === 'banner') {
      resolve(true);
      options.onComplete?.(true);
      return;
    }

    setTimeout(() => {
      // 95% success rate for mock ads
      const success = Math.random() > 0.05;
      resolve(success);
      options.onComplete?.(success);
    }, duration);
  });
}

/**
 * Load AppLovin MAX SDK (call once on app init)
 * Uncomment when you have a real SDK key.
 */
export function loadAppLovinSDK(sdkKey: string) {
  if (!sdkKey || isMockAds) return;

  // TODO: Load real AppLovin SDK
  // const script = document.createElement('script');
  // script.src = AD_NETWORKS.applovin.sdkUrl;
  // script.onload = () => { window.AppLovinMAX?.initialize(sdkKey); };
  // document.head.appendChild(script);

  console.log('[AdSDK] AppLovin SDK would load here with key:', sdkKey.slice(0, 8) + '...');
}

/**
 * Load Google AdSense (call once on app init)
 */
export function loadGoogleAdSense(clientId: string) {
  if (!clientId || isMockAds) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

// ── CPM estimates for owner reference ────────────────────────────────────────
// These are approximate CPM rates for Indian traffic (USD per 1000 impressions)
// Actual rates vary based on content, traffic quality, ad format.
export const CPM_ESTIMATES = {
  'Rewarded Video (AppLovin)': '$5 - $15',
  'Interstitial (AppLovin)': '$3 - $8',
  'Banner (AdSense)': '$0.5 - $2',
  'Push Notification (PropellerAds)': '$2 - $6',
  'Native (RichAds)': '$3 - $10',
};
