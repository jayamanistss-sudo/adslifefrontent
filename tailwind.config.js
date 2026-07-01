/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#FF5500', 50: '#FFF3EE', 100: '#FFE6D9', 200: '#FFCBAD', 300: '#FFAB82', 400: '#FF7D40', 500: '#FF5500', 600: '#E24B00', 700: '#C94300', 800: '#A03600', 900: '#7A2800' },
        accent:   { DEFAULT: '#00C48C', 50: '#E6FBF5', 100: '#C2F5E5', 500: '#00C48C', 600: '#00A876', 700: '#008C62' },
        violet:   { DEFAULT: '#7C3AED', 50: '#F5F0FF', 100: '#EDE0FF', 500: '#7C3AED', 600: '#6D28D9', 700: '#5B21B6' },
        warning:  { DEFAULT: '#F59E0B', 50: '#FFFBEB', 500: '#F59E0B', 600: '#D97706' },
        danger:   { DEFAULT: '#EF4444', 50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626' },
        neutral:  { 0: '#FFFFFF', 50: '#F8F5FF', 100: '#F0ECF9', 200: '#E4DDEF', 300: '#C9BFDF', 400: '#9B90C0', 500: '#6B5F8F', 600: '#4A4270', 700: '#342B52', 800: '#1D192E', 900: '#0F0D1A', 950: '#08070F' },
        dark:     { DEFAULT: '#0E0B1E', surface: '#161324', border: '#251E3C', muted: '#5C5280' },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(14,11,30,0.06), 0 1px 2px rgba(14,11,30,0.04)',
        'card-md': '0 4px 16px rgba(14,11,30,0.09), 0 2px 4px rgba(14,11,30,0.05)',
        'card-lg': '0 12px 36px rgba(14,11,30,0.12), 0 4px 10px rgba(14,11,30,0.06)',
        'glow':    '0 0 24px rgba(255,85,0,0.28)',
        'glow-violet': '0 0 24px rgba(124,58,237,0.25)',
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
        'spring':    'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
