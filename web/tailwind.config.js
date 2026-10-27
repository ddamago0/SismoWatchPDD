/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      colors: {
        dark: {
          950: '#050505',
          900: '#0A0F18',
          850: '#0E1624',
          800: '#131D30',
          750: '#18243C',
          700: '#1E2D4A',
          600: '#293C62',
        },
        cobalt: {
          400: '#387BFF',
          500: '#0052FF',
          600: '#0044D6',
          700: '#0037AD',
        },
        coral: {
          400: '#FF6B4A',
          500: '#FF5733',
          600: '#E04120',
        },
      },
      boxShadow: {
        'glow-cobalt': '0 0 25px -5px rgba(0, 82, 255, 0.35)',
        'glow-coral': '0 0 25px -5px rgba(255, 87, 51, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
      },
    },
  },
  plugins: [],
}
