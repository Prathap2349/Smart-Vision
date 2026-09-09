/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          darkest: '#050811',
          dark: '#0a0e1a',
          card: '#111827',
          panel: '#151d30',
          hover: '#1e293b',
        },
        brand: {
          cyan: '#00f0ff',
          blue: '#3b82f6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 240, 255, 0.15)',
        'rose-glow': '0 0 15px rgba(239, 68, 68, 0.2)',
        'emerald-glow': '0 0 15px rgba(16, 185, 129, 0.15)',
      },
    },
  },
  plugins: [],
}
