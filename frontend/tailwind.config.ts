import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      screens: {
        // A second card fits on a large phone; below this one card plus a peek
        // is the affordance that the row scrolls.
        xs: "480px",
      },
      colors: {
        rausch: "#FF385C",
        rausch_dark: "#E31C5F",
        ink: "#222222",
        hof: "#717171",
      },
      boxShadow: {
        card: "0 6px 16px rgba(0,0,0,0.12)",
        popover: "0 8px 28px rgba(0,0,0,0.28)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
