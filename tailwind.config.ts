import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      "#000000",
        surface: {
          DEFAULT: "#171717",
          2:       "#262626",
        },
        text: {
          DEFAULT: "#FAFAFA",
          strong:  "#FFFFFF",
        },
        muted:   "#A3A3A3",
        border: {
          DEFAULT: "#262626",
          hi:      "#404040",
        },
        accent: {
          DEFAULT: "#FFD944",
          2:       "#F0C920",
        },
        success: "#4ADE80",
        error:   "#F87171",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      minHeight: {
        tap: "60px",
      },
    },
  },
  plugins: [],
};
export default config;
