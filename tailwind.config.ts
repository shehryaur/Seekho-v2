import type { Config } from "tailwindcss";

/**
 * Seekho Engine — Design System
 *
 * Palette (locked):
 *   --seekho-cream   #FEFAE0  → backgrounds / base surface
 *   --seekho-green   #283618  → primary brand / buttons
 *   --seekho-olive   #606C38  → secondary accents
 *   --seekho-ink     #0d1321  → headings / body text
 *   --seekho-brown   #43291f  → subtle borders / dividers
 */

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand tokens
        cream: "#FEFAE0",
        ink: "#0d1321",
        olive: {
          DEFAULT: "#606C38",
          dark: "#4a5429",
        },
        brown: {
          DEFAULT: "#43291f",
          soft: "#6a4332",
        },
        brand: {
          DEFAULT: "#283618",
          dark: "#1c2611",
          light: "#3a4d22",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 10px 40px rgba(13, 19, 33, 0.10)",
        ring: "0 0 0 1px rgba(67, 41, 31, 0.18)",
      },
      backgroundImage: {
        "shell-gradient":
          "linear-gradient(135deg, #FEFAE0 0%, #f3edc4 55%, #e8e0a4 100%)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
