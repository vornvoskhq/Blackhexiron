/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'antarctica-blue': '#8FD7FF',
        'antarctica-dark': '#0B1C2C',
        'antarctica-slate': '#223447',
        'antarctica-ice': '#E3F6FF',
        'antarctica-steel': '#B0B5BD',
        'antarctica-frost': '#79B8F3',
        'antarctica-black': '#090C10',
        'antarctica-glitch': '#56FFC5'
      },
      fontFamily: {
        'mono': ['"IBM Plex Mono"', 'Menlo', 'Monaco', 'monospace'],
        'sans': ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
};