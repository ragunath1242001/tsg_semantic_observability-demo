import preset from "@tsg-dsp/common-ui/tailwind-preset.cjs";
import type { Config } from "tailwindcss";
export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/@tsg-dsp/common-ui/{assets,components,layout}/**/*.{vue,js,ts,jsx,tsx}"
  ]
} satisfies Config;
