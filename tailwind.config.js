/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#FF6200', 50: '#FFF4EE', 100: '#FFE8D9', 200: '#FFCFAD', 300: '#FFB082', 400: '#FF8840', 500: '#FF6200', 600: '#E55800', 700: '#CC4F00', 800: '#A33F00', 900: '#7A2F00' },
        accent:   { DEFAULT: '#10B981', 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857' },
        warning:  { DEFAULT: '#F59E0B', 50: '#FFFBEB', 500: '#F59E0B', 600: '#D97706' },
        danger:   { DEFAULT: '#EF4444', 50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626' },
        neutral:  { 0: '#FFFFFF', 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A', 950: '#020617' },
        dark:     { DEFAULT: '#0F172A', surface: '#1E293B', border: '#334155', muted: '#475569' },
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card-lg': '0 8px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
        'glow':    '0 0 20px rgba(255,98,0,0.25)',
        'inner-sm':'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '80': '20rem',
      },
      transitionTimingFunction: {
        'bounce-sm': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-down':  'slideDown 0.25s ease-out',
        'slide-left':  'slideLeft 0.3s ease-out',
        'scale-in':    'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.6s linear infinite',
        'coin-pop':    'coinPop 0.5s ease-out',
        'streak-fire': 'streakFire 1s ease-in-out infinite alternate',
        'spin-wheel':  'spinWheel 4s cubic-bezier(0.17, 0.67, 0.12, 0.99) forwards',
        'float':       'float-y 4s ease-in-out infinite',
        'glow':        'brand-glow 3s ease-in-out infinite',
        'border-dance':'border-dance 6s ease infinite',
      },
      keyframes: {
        fadeIn:     { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:    { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown:  { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideLeft:  { '0%': { transform: 'translateX(-12px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        scaleIn:    { '0%': { transform: 'scale(0.92)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        pulseSoft:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        coinPop:    { '0%': { transform: 'scale(0.5) translateY(0)', opacity: '0' }, '60%': { transform: 'scale(1.3) translateY(-20px)', opacity: '1' }, '100%': { transform: 'scale(1) translateY(-40px)', opacity: '0' } },
        streakFire: { '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(1.15)' } },
      },
    },
  },
  plugins: [],
};
