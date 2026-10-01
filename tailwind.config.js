/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDE7D6",
        paperdim: "#E3DCC6",
        ink: "#1F2A24",
        inkfade: "#4B5A50",
        rule: "#C9BFA0",
        brass: "#A9822C",
        seal: "#B23A2E",
        credit: "#2E6B4F"
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        num: ["'IBM Plex Mono'", "monospace"]
      },
      borderRadius: {
        sm: "3px"
      }
    }
  },
  plugins: []
};
