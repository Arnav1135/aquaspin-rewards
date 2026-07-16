import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════
        // FINTECH REFERENCE PALETTE — DO NOT MODIFY THESE VALUES
        // ═══════════════════════════════════════════════════════
        'app-bg-start': '#e1eff8',
        'app-bg-end':   '#cfe5f5',

        // Primary dark card / nav / buttons (Muted purplish slate blue)
        'navy': {
          950: '#4a5b8c',
          900: '#5a6b9c',
          800: '#7b8bc1',   // ← PRIMARY: all nav, cards, primary buttons
          700: '#8ba0cd',
          600: '#9cb1d9',
          500: '#adc2e5',
          400: '#becff1',
        },

        // Secondary sky-blue card & accent (Bright cyan-blue)
        'sky': {
          600: '#45a9ee',
          500: '#66bdf2',   // ← SECONDARY: card backgrounds, accents
          400: '#85ccf5',
          300: '#a6dbf8',
          200: '#c2e7fa',   // ← TERTIARY: light accent cards, borders
          100: '#dcf2fc',
          50:  '#eff9fe',
        },

        // Text
        'offwhite':  '#FFFFFF',   // ← text on navy
        'darknavy':  '#2a3b6c',   // ← text on light backgrounds

        // Status
        'success-teal': '#66bdf2',   // using cyan for positive to match theme
        'coral-loss':   '#7b8bc1',   // using slate for negative to match theme

        // Scrim overlay (defined as CSS var too)
        'scrim': 'rgba(22,33,62,0.6)',

        // Legacy aliases (keep for backward compat — map to new tokens)
        primary: {
          950: '#0d1628',
          900: '#111d38',
          800: '#16213E',
          700: '#1e2d52',
          600: '#2d4070',
          500: '#4A90D9',
        },
        secondary: {
          neon:  '#A8CBEA',
          glow:  '#8dbfe9',
          soft:  '#c8dff2',
          dim:   '#6aaae4',
        },
        tertiary: {
          neon: '#A8CBEA',
          glow: '#8dbfe9',
          soft: '#c8dff2',
          dim:  '#6aaae4',
        },
        accent: {
          neon:  '#F5F8FC',
          warm:  '#e4eff9',
          dim:   '#A8CBEA',
        },
        success:    '#3DDC97',
        danger:     '#F76C6C',
        warn:       '#f59e0b',
        background: '#F4F8FC',
        surface:    '#E4EEF9',
        border:     '#A8CBEA',
        muted:      '#4A90D9',

        // Semantic text tokens
        text: {
          primary:   '#16213E',
          secondary: '#4A90D9',
          muted:     '#6aaae4',
        },

        // OLD navy aliases kept so existing pages don't break
        'cyan-neon':  '#4A90D9',
        'gold-neon':  '#3DDC97',
        'navy-950':   '#0d1628',
        'navy-900':   '#111d38',
        'navy-800':   '#16213E',
        'navy-700':   '#1e2d52',
        'navy-600':   '#243560',
      },

      fontFamily: {
        sans:    ['Poppins', 'Inter', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },

      fontSize: {
        '3xs': ['0.5rem',   { lineHeight: '0.75rem' }],
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      borderRadius: {
        '4xl': '2rem',    // 32px — hero cards
        '3xl': '1.75rem', // 28px — primary cards (navy)
        '2xl': '1.5rem',  // 24px — secondary cards (sky)
      },

      backgroundImage: {
        'app-gradient':     'linear-gradient(160deg, #e1eff8 0%, #cfe5f5 100%)',
        'navy-gradient':    'linear-gradient(135deg, #7b8bc1 0%, #8ba0cd 100%)',
        'sky-gradient':     'linear-gradient(135deg, #66bdf2 0%, #85ccf5 100%)',
        'teal-gradient':    'linear-gradient(135deg, #66bdf2 0%, #85ccf5 100%)',
        'coral-gradient':   'linear-gradient(135deg, #7b8bc1 0%, #8ba0cd 100%)',
        'primary-gradient': 'linear-gradient(135deg, #7b8bc1 0%, #9cb1d9 100%)',
        'card-gradient':    'linear-gradient(135deg, rgba(225,239,248,0.97) 0%, rgba(207,229,245,0.95) 100%)',
        'secondary-gradient':'linear-gradient(135deg, #c2e7fa 0%, #a6dbf8 100%)',
        'accent-gradient':  'linear-gradient(135deg, #e1eff8 0%, #cfe5f5 100%)',
      },

      boxShadow: {
        // Card shadows — soft glassmorphic, WCAG-safe
        'card-navy':  '0 8px 32px rgba(123,139,193,0.3), inset 0 2px 4px rgba(255,255,255,0.4)',
        'card-sky':   '0 8px 32px rgba(102,189,242,0.3), inset 0 2px 4px rgba(255,255,255,0.5)',
        'card-lift':  '0 12px 40px rgba(123,139,193,0.4), inset 0 2px 4px rgba(255,255,255,0.4)',
        // Glow effects
        'teal-glow':  '0 0 20px rgba(102,189,242,0.4), 0 0 40px rgba(102,189,242,0.2)',
        'sky-glow':   '0 0 20px rgba(102,189,242,0.4), 0 0 40px rgba(102,189,242,0.2)',
        'navy-glow':  '0 0 20px rgba(123,139,193,0.4), 0 0 40px rgba(123,139,193,0.2)',
        // Legacy
        'primary-glow':    '0 0 20px rgba(123,139,193,0.4)',
        'primary-glow-sm': '0 0 8px rgba(123,139,193,0.5)',
        'secondary-glow':  '0 0 20px rgba(102,189,242,0.4)',
        'secondary-glow-sm':'0 0 8px rgba(102,189,242,0.5)',
        'cyan-glow':       '0 0 20px rgba(102,189,242,0.4), 0 0 40px rgba(102,189,242,0.2)',
        'gold-glow':       '0 0 20px rgba(102,189,242,0.4), 0 0 40px rgba(102,189,242,0.2)',
        'accent-glow':     '0 0 20px rgba(225,239,248,0.4)',
        'accent-glow-sm':  '0 0 8px rgba(225,239,248,0.5)',
        'glass':           '0 8px 32px rgba(123,139,193,0.2), inset 0 2px 4px rgba(255,255,255,0.6)',
        'inner-glow':      'inset 0 2px 4px rgba(255,255,255,0.6)',
        'cyan-glow-sm':    '0 0 8px rgba(102,189,242,0.5)',
        'gold-glow-sm':    '0 0 8px rgba(102,189,242,0.5)',
      },

      backdropBlur: { xs: '2px' },

      animation: {
        'spin-slow':      'spin 3s linear infinite',
        'pulse-navy':     'pulse-navy 2s ease-in-out infinite',
        'pulse-sky':      'pulse-sky 2s ease-in-out infinite',
        'float':          'float 3s ease-in-out infinite',
        'glow-pulse':     'glow-pulse 2s ease-in-out infinite',
        'token-pop':      'token-pop 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'slide-up':       'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in':        'fade-in 0.5s ease-out',
        'shimmer':        'shimmer 2s infinite',
        'bounce-gentle':  'bounce-gentle 1s ease-in-out infinite',
        'blue-pulse':     'blue-pulse 1.8s ease-in-out infinite',
        // legacy
        'pulse-primary':  'pulse-navy 2s ease-in-out infinite',
        'pulse-secondary':'pulse-sky 2s ease-in-out infinite',
      },

      keyframes: {
        'pulse-navy': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(22,33,62,0.3)' },
          '50%':       { boxShadow: '0 0 30px rgba(22,33,62,0.7)' },
        },
        'pulse-sky': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(74,144,217,0.3)' },
          '50%':       { boxShadow: '0 0 30px rgba(74,144,217,0.7)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%':       { opacity: '1' },
        },
        'token-pop': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-5px)' },
        },
        'blue-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
