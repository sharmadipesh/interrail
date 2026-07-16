"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Wraps the app in Lenis smooth scrolling. Runs on the client, drives Lenis
 * from a single requestAnimationFrame loop, and cleans up on unmount.
 * `position: fixed` elements (e.g. the navbar) are unaffected — Lenis smooths
 * the native window scroll rather than transforming the page.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Respect users who prefer reduced motion — skip the smoothing entirely.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 0.9,
      // easeOutExpo — smooth, premium deceleration.
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
      // Let Lenis own its rAF loop (started here, stopped on destroy) — more
      // robust than a manual loop across React StrictMode remounts.
      autoRaf: true,
    });

    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
