/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0e0e12',
        panel: '#17171d',
        line: '#2a2a33',
        brand: '#2f9e62',
        paper: '#f5f3ee',
        mute: '#a3a3b0',
      },
    },
  },
  plugins: [],
}
