// Shared Tailwind CSS preset for all UI apps (Tailwind v4)
// Centralizes dark mode strategy, screens and plugins.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[class*="app-dark"]'],
  theme: {
    screens: {
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1200px",
      "2xl": "1920px"
    }
  },
  plugins: [require("tailwindcss-primeui")]
};
