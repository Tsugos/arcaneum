/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arcane: {
          950: '#06080e',
          900: '#0a0e1a',
          850: '#0f1526',
          800: '#141c33',
          700: '#1e294b',
          600: '#2b3a67',
          500: '#3b4e8c',
          accent: '#6366f1',
          'accent-glow': '#818cf8',
          gold: '#f59e0b',
          cyan: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
