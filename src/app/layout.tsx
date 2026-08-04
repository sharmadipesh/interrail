import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/generic/SmoothScroll";
import { INTRO_BOOT_SCRIPT } from "@/components/generic/intro";

/**
 * Only the two weights the site actually renders.
 *
 * Poppins is a static family in Google's catalogue, so every weight × style is
 * its own file and every one of them gets preloaded. Asking for 100–900 in both
 * styles meant 18 files fetched at high priority ahead of the scripts, for two
 * weights of actual use: `font-semibold` (600) and `font-normal` / the
 * inherited default (400). Nothing renders italic, nothing renders 700 —
 * Tailwind's preflight gives headings `font-weight: inherit` and there is no
 * <b> or <strong> in the tree to pick up a browser default.
 *
 * display and adjustFontFallback are unchanged, so swap behaviour and the
 * size-adjusted fallback metrics that keep CLS at zero stay exactly as they
 * were.
 */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interrail",
  description: "Interrail",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the boot script below stamps data-intro onto
    // this element before React loads, which is by definition an attribute the
    // server markup cannot carry. Scoped one level deep, to <html> itself.
    <html
      lang="en"
      className={poppins.variable}
      suppressHydrationWarning
    >
      <body>
        {/* First in the body so it runs before the page is parsed, and
            synchronous so it lands before the first paint. Decides nothing —
            it only marks the document so the stylesheet can hold the homepage
            back until React takes over. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
