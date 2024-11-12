/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        greenPrimary: "#D8E1D4",
        greenSecondary: "#2E5630",
        beigePrimary: "#f7ede2",
        brownPrimary: "#382b1e",
        beigeSecondary: "#988c81",
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
