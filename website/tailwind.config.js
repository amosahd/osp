/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0b",
          50: "#f7f7f8",
          100: "#ededef",
          200: "#d4d4d8",
          300: "#a1a1a8",
          400: "#71717a",
          500: "#3f3f46",
          600: "#27272a",
          700: "#1c1c1f",
          800: "#141416",
          900: "#0a0a0b",
          950: "#050506",
        },
        accent: {
          DEFAULT: "#4f6df0",
          50: "#eef2ff",
          100: "#dce4fe",
          200: "#b9c9fe",
          300: "#8da8fc",
          400: "#6b89f5",
          500: "#4f6df0",
          600: "#3b54d4",
          700: "#2e41a8",
          800: "#263588",
          900: "#1e2b6d",
        },
        warm: {
          DEFAULT: "#e8a44a",
          500: "#e8a44a",
          600: "#d4902e",
          700: "#b07424",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-space-grotesk)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "var(--font-dm-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulse_slow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        "typing-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-in-right":
          "slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        pulse_slow: "pulse_slow 4s ease-in-out infinite",
        "typing-cursor": "typing-cursor 1s step-end infinite",
      },
    },
  },
  plugins: [],
};
