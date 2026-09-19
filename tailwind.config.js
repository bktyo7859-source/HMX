/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F7F7F5",
        "surface-subtle": "#FBFBFA",
        primary: "#111111",
        secondary: "#6B6B6B",
        "secondary-light": "#949494",
        border: "#E7E7E7",
        "border-light": "#F0F0EE",
        accent: {
          DEFAULT: "#C5A880",
          light: "#F5EFE6",
          hover: "#B6976F",
          dark: "#9E8056",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-dmsans)", "DM Sans", "system-ui", "sans-serif"],
        accent: ["var(--font-italiana)", "Italiana", "serif"],
      },
      letterSpacing: {
        luxury: "0.18em",
        tightest: "-0.04em",
        widest: "0.22em",
      },
      boxShadow: {
        subtle: "0 2px 16px rgba(0, 0, 0, 0.03)",
        card: "0 4px 24px -2px rgba(17, 17, 17, 0.04)",
        "card-hover": "0 12px 32px -4px rgba(17, 17, 17, 0.08)",
        luxury: "0 20px 40px -15px rgba(0, 0, 0, 0.06)",
        modal: "0 25px 50px -12px rgba(0, 0, 0, 0.12)",
      },
      borderRadius: {
        luxury: "20px",
        "card-lg": "24px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        fadeUp: "fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        pulseSubtle: "pulseSubtle 2.5s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite linear",
      },
    },
  },
  plugins: [],
};
