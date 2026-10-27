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
        mono: ['"JetBrains Mono"', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      colors: {
        mocha: {
          950: '#0c0a09',
          900: '#130f0e',
          850: '#191412',
          800: '#201a18',
          750: '#28211e',
          700: '#342b27',
          600: '#463a35',
          500: '#5c4d47',
        },
        platinum: {
          50: '#ffffff',
          100: '#f7f7f9',
          200: '#ececf1',
          300: '#dedee6',
          400: '#c2c2d1',
          500: '#9b9baa',
          600: '#737384',
        },
        lavender: {
          50: '#faf8fe',
          100: '#f3eeff',
          200: '#e7ddfe',
          300: '#d5c4fb',
          400: '#bd9ff8',
          500: '#9f73f2',
          600: '#844dea',
          700: '#6d35d2',
        },
      },
      boxShadow: {
        'glow-lavender': '0 0 25px -5px rgba(189, 159, 248, 0.25)',
        'glow-mocha': '0 10px 30px -10px rgba(12, 10, 9, 0.8)',
      },
    },
  },
  plugins: [],
}
