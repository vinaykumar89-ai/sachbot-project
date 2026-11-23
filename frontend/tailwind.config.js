/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sach: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          900: '#14532d',
        },
        navy: {
          800: '#0f172a',
          900: '#090d16',
          950: '#030712',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'click-robot': 'clickRobot 1.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        clickRobot: {
          '0%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.2)' },
          '20%': { opacity: '1', transform: 'translate(-50%, -65%) scale(1.12)' },
          '45%': { opacity: '1', transform: 'translate(-50%, -75%) scale(1)' },
          '75%': { opacity: '0.85', transform: 'translate(-50%, -95%) scale(0.95)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -115%) scale(0.7)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.15))' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      }
    },
  },
  plugins: [],
}
