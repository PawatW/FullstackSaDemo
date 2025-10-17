/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#b0ceff",
          300: "#86b3ff",
          400: "#5d99ff",
          500: "#347fff",
          600: "#0a64ff",
          700: "#084fcc",
          800: "#063a99",
          900: "#032666"
        }
      }
    }
  },
  plugins: []
};
