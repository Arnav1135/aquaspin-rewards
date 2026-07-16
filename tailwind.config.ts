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
        'app-bg-start': '#F4F8FC',
        'app-bg-end':   '#E4EEF9',

        // Primary dark card / nav / buttons
        'navy': {
          950: '#0d1628',
          900: '#111d38',
          800: '#16213E',   // ← PRIMARY: all nav, cards, primary buttons
          700: '#1e2d52',
          600: '#243560',
          500: '#2d4070',
          400: '#3b5080',
        },

        // Secondary sky-blue card & accent
        'sky': {
          600: '#2b7cc4',
          500: '#4A90D9',   // ← SECONDARY: card backgrounds, accents
          400: '#6aaae4',
          300: '#8dbfe9',
          200: '#A8CBEA',   // ← TERTIARY: light accent cards, borders
          100: '#c8dff2',
          50:  '#e4eff9',
        },

        // Text
        'offwhite':  '#F5F8FC',   // ← text on navy
        'darknavy':  '#16213E',   // ← text on light backgrounds

        // Status
        'success-teal': '#3DDC97',   // ← wins, positive
        'coral-loss':   '#F76C6C',   // ← losses, negative

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
        'app-gradient':     'linear-gradient(160deg, #F4F8FC 0%, #E4EEF9 100%)',
        'navy-gradient':    'linear-gradient(135deg, #16213E 0%, #1e2d52 100%)',
        'sky-gradient':     'linear-gradient(135deg, #4A90D9 0%, #6aaae4 100%)',
        'teal-gradient':    'linear-gradient(135deg, #3DDC97 0%, #2bc47e 100%)',
        'coral-gradient':   'linear-gradient(135deg, #F76C6C 0%, #e55555 100%)',
        'primary-gradient': 'linear-gradient(135deg, #16213E 0%, #2d4070 100%)',
        'card-gradient':    'linear-gradient(135deg, rgba(244,248,252,0.97) 0%, rgba(228,238,249,0.95) 100%)',
        'secondary-gradient':'linear-gradient(135deg, #A8CBEA 0%, #8dbfe9 100%)',
        'accent-gradient':  'linear-gradient(135deg, #F4F8FC 0%, #E4EEF9 100%)',
      },

      boxShadow: {
        // Card shadows — soft diffused, WCAG-safe
        'card-navy':  '0 8px 24px rgba(22,33,62,0.18), 0 2px 8px rgba(22,33,62,0.10)',
        'card-sky':   '0 8px 24px rgba(74,144,217,0.14), 0 2px 8px rgba(74,144,217,0.08)',
        'card-lift':  '0 12px 32px rgba(22,33,62,0.22), 0 4px 12px rgba(22,33,62,0.12)',
        // Glow effects
        'teal-glow':  '0 0 20px rgba(61,220,151,0.35), 0 0 40px rgba(61,220,151,0.15)',
        'sky-glow':   '0 0 20px rgba(74,144,217,0.35), 0 0 40px rgba(74,144,217,0.15)',
        'navy-glow':  '0 0 20px rgba(22,33,62,0.4), 0 0 40px rgba(22,33,62,0.2)',
        // Legacy
        'primary-glow':    '0 0 20px rgba(22,33,62,0.4)',
        'primary-glow-sm': '0 0 8px rgba(22,33,62,0.5)',
        'secondary-glow':  '0 0 20px rgba(74,144,217,0.4)',
        'secondary-glow-sm':'0 0 8px rgba(74,144,217,0.5)',
        'cyan-glow':       '0 0 20px rgba(74,144,217,0.4), 0 0 40px rgba(74,144,217,0.2)',
        'gold-glow':       '0 0 20px rgba(61,220,151,0.4), 0 0 40px rgba(61,220,151,0.2)',
        'accent-glow':     '0 0 20px rgba(244,248,252,0.4)',
        'accent-glow-sm':  '0 0 8px rgba(244,248,252,0.5)',
        'glass':           '0 8px 32px rgba(22,33,62,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
        'inner-glow':      'inset 0 1px 0 rgba(74,144,217,0.15)',
        'cyan-glow-sm':    '0 0 8px rgba(74,144,217,0.5)',
        'gold-glow-sm':    '0 0 8px rgba(61,220,151,0.5)',
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
