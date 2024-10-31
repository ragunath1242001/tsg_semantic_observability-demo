/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[class*="app-dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/@tsg-dsp/common-ui/{assets,components,layout}/**/*.{vue,js,ts,jsx,tsx}"
  ],
  safelist: [
    {
      pattern: /col-.*/,
      variants: ["sm", "md", "lg", "xl", "2xl"]
    }
  ],
  plugins: [require("tailwindcss-primeui")],
  theme: {
    screens: {
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1200px",
      "2xl": "1920px"
    }
  }
};
