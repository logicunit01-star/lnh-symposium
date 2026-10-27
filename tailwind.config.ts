import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

// LNH palette — adjust here to match the official brand guide exactly.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware colours: values live in CSS variables (globals.css) so the public site can switch
        // between dark (default) and light. Defaults equal the original palette, so the admin is unchanged.
        white: v("--c-white"),
        snow: "#FFFFFF", // always white (text on red/blue buttons)
        ink: { DEFAULT: v("--c-ink"), 900: v("--c-ink"), 800: v("--c-ink-800"), 700: v("--c-ink-700"), 600: v("--c-ink-600") },
        slate: { ...colors.slate, 100: v("--c-slate-100"), 200: v("--c-slate-200"), 300: v("--c-slate-300"), 400: v("--c-slate-400"), 500: v("--c-slate-500"), 600: v("--c-slate-600") },
        lnh: {
          navy: "#0A2E6E",   // primary LNH blue
          blue: "#1560D4",   // bright blue
          sky: v("--c-sky"), // highlight (#3FB8F0; darker in light mode for contrast)
          red: "#D2192E",    // LNH red
          rose: v("--c-rose"),
          gold: v("--c-gold"),
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
        orbit: { to: { transform: "rotate(360deg)" } },
        orbitrev: { to: { transform: "rotate(-360deg)" } },
        ecg: { "0%": { strokeDashoffset: "900" }, "60%": { strokeDashoffset: "0" }, "100%": { strokeDashoffset: "-900" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        float: "float 14s ease-in-out infinite",
        spinslow: "spinslow 60s linear infinite",
        orbit: "orbit 24s linear infinite",
        "orbit-rev": "orbitrev 32s linear infinite",
        "orbit-slow": "orbit 48s linear infinite",
        ecg: "ecg 4.5s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        shimmer: "shimmer 6s linear infinite",
        blink: "blink 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
