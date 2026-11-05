/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces, darkest to lightest
        ink: {
          950: '#000000',
          900: '#050510',
          850: '#08081a',
          800: '#0d0d1a',
          700: '#1a1a2e',
          600: '#2a2a3e',
          500: '#3d3d56',
        },
        neon: {
          cyan: '#00bfff',
          amber: '#f5a623',
          red: '#ff4444',
          green: '#00ff88',
          violet: '#8900ff',
        },
        wood: {
          light: '#8b6914',
          DEFAULT: '#5c3d1e',
          dark: '#2a1c0a',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['Rajdhani', 'system-ui', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgba(0, 191, 255, 0.35)',
        'glow-amber': '0 0 24px rgba(245, 166, 35, 0.35)',
        'glow-red': '0 0 24px rgba(255, 68, 68, 0.35)',
        panel: '0 20px 50px -20px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        shelf: '0 14px 22px -6px rgba(0, 0, 0, 0.85)',
      },
      keyframes: {
        flicker: {
          '0%, 19%, 21%, 23%, 54%, 56%, 100%': { opacity: '1' },
          '20%, 22%, 55%': { opacity: '0.55' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 191, 255, 0.45)' },
          '50%': { boxShadow: '0 0 0 8px rgba(0, 191, 255, 0)' },
        },
      },
      animation: {
        flicker: 'flicker 6s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee 60s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
