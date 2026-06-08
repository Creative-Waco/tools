import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f4f1ea",
        panel: "#ffffff",
        ink: "#1a1a1a",
        muted: "#666666",
        line: "#e4dfd4",
        accent: "#1a1a1a",
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', "Arial", "sans-serif"],
      },
      boxShadow: {
        panel: "0 12px 30px rgba(26, 26, 26, 0.05)",
      },
      borderRadius: {
        panel: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
