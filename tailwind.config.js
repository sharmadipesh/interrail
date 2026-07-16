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
        brand: {
          yellow: "#FBC626",
          "yellow-hover": "#F2C65F",
          "yellow-1": "#FFD400",
        },
        navy: {
          DEFAULT: "#242438",
          deep: "#1B2040",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        molitor: ["Molitor", "sans-serif"],
        humant: ["Humant", "sans-serif"],
        departure: ['"Departure Mono"', "monospace"],
      },
      fontSize: {
        // Hero headline — Molitor Display Bold (Figma spec)
        hero: "50px",
        // Lead paragraph — Molitor Display Regular (Figma spec)
        lead: "20px",
      },
      lineHeight: {
        hero: "1.066",
        lead: "1.1",
      },
      letterSpacing: {
        hero: "-0.44px",
        lead: "1px",
        "27px": "-0.27px",
        "85px": "-0.85px",
        "144%": "144%",
      },
    },
  },
  plugins: [],
};
