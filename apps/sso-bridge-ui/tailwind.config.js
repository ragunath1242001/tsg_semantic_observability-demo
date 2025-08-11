/** @type {import('tailwindcss').Config} */
import preset from "@tsg-dsp/common-ui/tailwind-preset.cjs";
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"]
};
