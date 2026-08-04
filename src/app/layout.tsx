import type { Metadata } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/generic/SmoothScroll";
import { INTRO_BOOT_SCRIPT } from "@/components/generic/intro";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  style: ["normal", "italic"],
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
      className={`${poppins.variable} ${robotoMono.variable}`}
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
