/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase (VITE or NEXT_PUBLIC support)
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;

  // Application
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_URL: string;

  // Feature Flags
  readonly VITE_MOCK_ADS?: string;
  readonly VITE_ENABLE_GUEST_PLAY?: string;
  readonly VITE_SPIN_COOLDOWN_SECONDS?: string;

  // Ad Networks
  readonly VITE_APPLOVIN_SDK_KEY?: string;
  readonly VITE_ADSENSE_CLIENT_ID?: string;
  readonly VITE_PROPELLERADS_ZONE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
