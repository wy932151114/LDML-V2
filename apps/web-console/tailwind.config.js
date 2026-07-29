/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 道之自然主题色
        dzg: {
          50: '#faf5eb',
          100: '#f0e4c6',
          200: '#e0c78a',
          300: '#d4a94e',
          400: '#c9942e',
          500: '#b87a1e',
          600: '#a06219',
          700: '#804c16',
          800: '#6a3e16',
          900: '#573416',
          950: '#311a0a',
        },
        // 五行色
        wuxing: {
          wood: '#2ECC71',
          fire: '#E74C3C',
          earth: '#F39C12',
          metal: '#BDC3C7',
          water: '#3498DB',
        },
        // 深色科技风基础色
        cyber: {
          bg: '#0a0e17',
          surface: '#111827',
          border: '#1e293b',
          text: '#e2e8f0',
          muted: '#94a3b8',
          accent: '#f59e0b',
          glow: '#fbbf24',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        cn: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float-energy': 'floatEnergy 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)' },
        },
        floatEnergy: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'dzg-gradient': 'linear-gradient(135deg, #0a0e17 0%, #1a0e2e 50%, #0a0e17 100%)',
        'gold-glow': 'radial-gradient(ellipse at center, rgba(245,158,11,0.15) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
