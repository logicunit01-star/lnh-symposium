import type { Config } from "tailwindcss";

// LNH palette — adjust here to match the official brand guide exactly.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#040B1E", 900: "#040B1E", 800: "#081431", 700: "#0D1D45", 600: "#13285C" },
        lnh: {
          navy: "#0A2E6E",   // primary LNH blue
          blue: "#1560D4",   // bright blue
          sky: "#3FB8F0",    // highlight
          red: "#D2192E",    // LNH red
          rose: "#FF4D5E",
          gold: "#F5B942",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        float: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "50%": { transform: "translate(30px,-40px) scale(1.08)" } },
        spinslow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        float: "float 14s ease-in-out infinite",
        spinslow: "spinslow 60s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
