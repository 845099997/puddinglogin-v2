/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        22: '0.22',
        35: '0.35',
        38: '0.38',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      colors: {
        // 以下 token 全部由 CSS 变量驱动（src/styles/index.css），
        // 通过 <html data-theme="day|night"> 切换日间暖色 / 夜间深色。
        white: 'rgb(var(--pl-white) / <alpha-value>)',
        ink: {
          950: 'rgb(var(--pl-ink-950) / <alpha-value>)',
          900: 'rgb(var(--pl-ink-900) / <alpha-value>)',
          850: 'rgb(var(--pl-ink-850) / <alpha-value>)',
          800: 'rgb(var(--pl-ink-800) / <alpha-value>)',
          700: 'rgb(var(--pl-ink-700) / <alpha-value>)',
          600: 'rgb(var(--pl-ink-600) / <alpha-value>)',
          500: 'rgb(var(--pl-ink-500) / <alpha-value>)',
        },
        cream: 'rgb(var(--pl-cream) / <alpha-value>)',
        'on-pudding': 'rgb(var(--pl-on-pudding) / <alpha-value>)',
        pudding: {
          50: '#FFF6EC',
          100: '#FFEAD3',
          200: '#FFD4A8',
          300: 'rgb(var(--pl-pudding-300) / <alpha-value>)',
          400: 'rgb(var(--pl-pudding-400) / <alpha-value>)',
          500: 'rgb(var(--pl-pudding-500) / <alpha-value>)',
        },
        berry: {
          200: '#FFC7DD',
          300: 'rgb(var(--pl-berry-300) / <alpha-value>)',
          400: 'rgb(var(--pl-berry-400) / <alpha-value>)',
          500: 'rgb(var(--pl-berry-500) / <alpha-value>)',
          600: 'rgb(var(--pl-berry-600) / <alpha-value>)',
        },
        lilac: {
          300: 'rgb(var(--pl-lilac-300) / <alpha-value>)',
          400: 'rgb(var(--pl-lilac-400) / <alpha-value>)',
          500: 'rgb(var(--pl-lilac-500) / <alpha-value>)',
        },
        mint: 'rgb(var(--pl-mint) / <alpha-value>)',
        sky: 'rgb(var(--pl-sky) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        glow: '0 24px 70px -20px rgba(255, 107, 157, 0.55)',
        card: 'var(--pl-shadow-card)',
        soft: 'var(--pl-shadow-soft)',
      },
      backgroundImage: {
        'pudding-gradient': 'var(--pl-grad-btn)',
        'pudding-soft': 'linear-gradient(135deg, rgba(255,184,107,0.16) 0%, rgba(255,107,157,0.16) 50%, rgba(167,139,250,0.16) 100%)',
        mesh: 'var(--pl-surface-grad)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        'spin-slow': 'spinSlow 22s linear infinite',
      },
    },
  },
  plugins: [],
};
