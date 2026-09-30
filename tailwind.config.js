/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        aurora: {
          bg: '#050816',
          bgSecondary: '#080D1C',
          surface: '#0B1224',
          elevated: '#111A30',
          elevatedHover: '#16223F',
          border: 'rgba(255, 255, 255, 0.08)',
          borderGlow: 'rgba(59, 130, 246, 0.2)',
          borderCyan: 'rgba(34, 211, 238, 0.25)',
          borderViolet: 'rgba(139, 92, 246, 0.25)',
          borderRose: 'rgba(244, 63, 94, 0.25)',
        },
        brand: {
          blue: '#3B82F6',
          cyan: '#22D3EE',
          violet: '#8B5CF6',
          success: '#34D399',
          warning: '#FBBF24',
          alert: '#F43F5E',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'aurora-glow': '0 0 35px -5px rgba(59, 130, 246, 0.12), 0 0 20px -5px rgba(139, 92, 246, 0.10)',
        'cyan-glow': '0 0 25px -4px rgba(34, 211, 238, 0.25)',
        'blue-glow': '0 0 25px -4px rgba(59, 130, 246, 0.25)',
        'violet-glow': '0 0 25px -4px rgba(139, 92, 246, 0.25)',
        'rose-glow': '0 0 25px -4px rgba(244, 63, 94, 0.25)',
        'card-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
