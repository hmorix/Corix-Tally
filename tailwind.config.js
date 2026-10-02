/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ── Tally Prime‑inspired palette ─────────────────────────────────────
        // Primary surface (deep navy / dark-blue like Tally Prime)
        tp: {
          navy:   "#1B2B45",   // main sidebar / header bg
          navyDark: "#12203A", // active state / pressed
          navyLight: "#243553",// hover state
          blue:   "#2C5F8A",   // accent blue (Tally's blue buttons)
          sky:    "#4D9FD6",   // lighter accent
          teal:   "#1A8C7E",   // secondary accent
        },
        // Content area (light paper‑like, warm)
        paper:    "#F4F1E8",
        paperDim: "#EAE6D6",
        paperCard:"#FFFFFF",
        // Text
        ink:      "#1A1A2E",
        inkFade:  "#5A6478",
        inkLight: "#8A95A8",
        // Semantic
        rule:     "#D0CAB8",
        brass:    "#C8922A",
        brighter: "#E0A830",
        seal:     "#C0392B",
        sealBg:   "#FFF0EE",
        credit:   "#1E7E5A",
        creditBg: "#EEF9F4",
        debit:    "#C0392B",
        // Status
        warning:  "#F39C12",
        info:     "#2980B9",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body:    ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        num:     ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm:  "3px",
        md:  "6px",
        lg:  "10px",
        xl:  "14px",
      },
      boxShadow: {
        card:    "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
        elevated:"0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
        inner:   "inset 0 1px 3px rgba(0,0,0,0.1)",
        tpBtn:   "0 2px 0 rgba(0,0,0,0.25)",
      },
      animation: {
        "fade-in":      "fadeIn 0.18s ease-out",
        "slide-in-left":"slideInLeft 0.22s cubic-bezier(.4,0,.2,1)",
        "slide-up":     "slideUp 0.2s cubic-bezier(.4,0,.2,1)",
        "pulse-soft":   "pulseSoft 2s ease-in-out infinite",
        "shimmer":      "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn:      { from: { opacity: 0 }, to: { opacity: 1 } },
        slideInLeft: { from: { transform: "translateX(-16px)", opacity: 0 }, to: { transform: "translateX(0)", opacity: 1 } },
        slideUp:     { from: { transform: "translateY(8px)", opacity: 0 }, to: { transform: "translateY(0)", opacity: 1 } },
        pulseSoft:   { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.55 } },
        shimmer:     { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};
