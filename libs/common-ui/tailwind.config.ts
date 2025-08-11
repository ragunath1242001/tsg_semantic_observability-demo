import type { Config } from "tailwindcss";

import preset from "./tailwind-preset.cjs";
export default {
  presets: [preset],
  content: ["./**/*.{vue,js,ts,jsx,tsx}"]
} satisfies Config;
