import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Custom Brand Palette ===
        primary: {
          950: '#1a2d5a',
          900: '#2a3d7a',
          800: '#3066be',
          700: '#4d7fd6',
          600: '#6b98e8',
          500: '#8ab1f0',
        },
        secondary: {
          neon: '#8ecae6',
          glow: '#7ab8d8',
          soft: '#aedce8',
          dim: '#6fa8c4',
        },
        tertiary: {
          neon: '#b4c5e4',
          glow: '#9ab5db',
          soft: '#d4ddf0',
          dim: '#7a8ab8',
        },
        accent: {
          neon: '#fbfff1',
          warm: '#fcfffb',
          dim: '#e8ecdd',
        },
        success: '#10b981',
        danger: '#ef4444',
        warn: '#f59e0b',
        // Semantic aliases
        background: '#fbfff1',
        surface: '#f3f7e8',
        border: '#e8ecdd',
        muted: '#8ecae6',
        text: {
          primary: '#1a2d5a',
          secondary: '#6fa8c4',
          muted: '#8ecae6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'primary-gradient': 'linear-gradient(135deg, #3066be 0%, #6b98e8 50%, #8ab1f0 100%)',
        'secondary-gradient': 'linear-gradient(135deg, #8ecae6 0%, #7ab8d8 100%)',
        'accent-gradient': 'linear-gradient(135deg, #fbfff1 0%, #fcfffb 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(243,247,232,0.95) 0%, rgba(232,236,221,0.9) 100%)',
      },
      boxShadow: {
        'primary-glow': '0 0 20px rgba(48, 102, 190, 0.4), 0 0 40px rgba(48, 102, 190, 0.2)',
        'primary-glow-sm': '0 0 8px rgba(48, 102, 190, 0.5)',
        'secondary-glow': '0 0 20px rgba(142, 202, 230, 0.4), 0 0 40px rgba(142, 202, 230, 0.2)',
        'secondary-glow-sm': '0 0 8px rgba(142, 202, 230, 0.5)',
        'accent-glow': '0 0 20px rgba(251, 255, 241, 0.4), 0 0 40px rgba(251, 255, 241, 0.2)',
        'accent-glow-sm': '0 0 8px rgba(251, 255, 241, 0.5)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'inner-glow': 'inset 0 1px 0 rgba(142, 202, 230, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-primary': 'pulse-primary 2s ease-in-out infinite',
        'pulse-secondary': 'pulse-secondary 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'token-pop': 'token-pop 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'bounce-gentle': 'bounce-gentle 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-primary': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(48, 102, 190, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(48, 102, 190, 0.8)' },
        },
        'pulse-secondary': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(142, 202, 230, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(142, 202, 230, 0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'token-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
