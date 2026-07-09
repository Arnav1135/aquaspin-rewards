import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === AquaSpin Brand Palette ===
        navy: {
          950: '#05091A',
          900: '#0A1428',
          800: '#0D1B36',
          700: '#112244',
          600: '#162B57',
          500: '#1A3469',
        },
        cyan: {
          neon: '#00F0FF',
          glow: '#00C8D4',
          soft: '#7EEDF5',
          dim: '#00788A',
        },
        gold: {
          neon: '#FFD700',
          warm: '#FFC107',
          dim: '#B8860B',
        },
        success: '#00FF87',
        danger: '#FF3366',
        warn: '#FF9900',
        // Semantic aliases
        background: '#0A1428',
        surface: '#0D1B36',
        border: '#162B57',
        muted: '#4A6080',
        text: {
          primary: '#E8F4FD',
          secondary: '#8BA3C4',
          muted: '#4A6080',
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
        'navy-gradient': 'linear-gradient(135deg, #0A1428 0%, #0D1B36 50%, #112244 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #00F0FF 0%, #00788A 100%)',
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(13,27,54,0.9) 0%, rgba(22,43,87,0.7) 100%)',
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0, 240, 255, 0.4), 0 0 40px rgba(0, 240, 255, 0.2)',
        'cyan-glow-sm': '0 0 8px rgba(0, 240, 255, 0.5)',
        'gold-glow': '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
        'gold-glow-sm': '0 0 8px rgba(255, 215, 0, 0.5)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'inner-glow': 'inset 0 1px 0 rgba(0, 240, 255, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'token-pop': 'token-pop 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'bounce-gentle': 'bounce-gentle 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-cyan': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 240, 255, 0.8)' },
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
