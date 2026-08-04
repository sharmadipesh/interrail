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
          yellow: "#FFD400",
          "yellow-hover": "#F2C65F",
          "yellow-1": "#FFD400",
        },
        navy: {
          DEFAULT: "#140A33",
          deep: "#1B2040",
          1: "#140A33",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        // Roboto Mono is no longer loaded — nothing on the site renders
        // `font-mono`. The in-var fallback keeps the utility valid rather than
        // leaving an undefined var() that would invalidate the declaration.
        mono: ["var(--font-roboto-mono, ui-monospace)", "ui-monospace", "monospace"],
        departure: ['"Departure Mono"', "monospace"],
      },
      fontSize: {
        // Hero headline — Molitor Display Bold (Figma spec)
        hero: "48px",
        // Lead paragraph — Molitor Display Regular (Figma spec)
        lead: "20px",
      },
      lineHeight: {
        hero: "1.066",
        lead: "1.1",
      },
      letterSpacing: {
        "1px": "-1px",
        "2px": "-0.2px",
        "3px": "-3px",
        16: "0.16px",
        hero: "-0.44px",
        lead: "1px",
        "27px": "-0.27px",
        "85px": "-0.85px",
        "144%": "144%",
        "1%": "1%",
        "2%": "2%",
        "3%": "3%",
        "6%": "6%",
      },
    },
  },
  plugins: [],
};
