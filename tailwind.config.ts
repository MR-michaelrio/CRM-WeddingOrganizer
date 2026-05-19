import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F8F5F0",
        card: "#FFFFFF",
        gold: {
          DEFAULT: "#D4B483",
          light: "#E8D9BF",
          dark: "#B89A6A",
        },
        ink: {
          DEFAULT: "#2E2A27",
          medium: "#6B6662",
          light: "#9D9691",
        },
        beige: "#EFE7DD",
        line: "#E5DED5",
        success: "#5A9B7D",
        warning: "#D99B5A",
        danger: "#D97757",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["var(--font-cormorant)", "serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(46, 42, 39, 0.04), 0 1px 2px rgba(46, 42, 39, 0.02)",
        card: "0 4px 6px rgba(46, 42, 39, 0.04), 0 2px 4px rgba(46, 42, 39, 0.03)",
        hover: "0 10px 15px rgba(46, 42, 39, 0.06), 0 4px 6px rgba(46, 42, 39, 0.04)",
        pop: "0 20px 25px rgba(46, 42, 39, 0.08), 0 10px 10px rgba(46, 42, 39, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
