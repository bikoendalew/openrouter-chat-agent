/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f0f10",
          1: "#1a1a1d",
          2: "#232327",
          3: "#2e2e33",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f52d3",
        },
      },
    },
  },
  plugins: [],
};
