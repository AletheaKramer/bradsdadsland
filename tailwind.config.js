/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        greenSecondary: "#abc5a9",
        greenPrimary: "#344a32",
        beigePrimary: "#f7ede2",
        brownPrimary: "#382b1e",
        beigeSecondary: "#988c81",
        peach: "#edcfb3"
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        lora: ['"Lora"', "serif"],
      },
    },
  },
  plugins: [],
}
