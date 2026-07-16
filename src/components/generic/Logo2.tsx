"use client";

import { motion, type Variants } from "framer-motion";

/**
 * Animated interrail logo built from the flat artwork at /images/logo.svg.
 *
 * The file is a single raster image, so instead of animating individual paths
 * (as Logo.tsx does) we clip the one artwork into two regions and reveal them
 * in a staggered sequence — mirroring the feel of Logo.tsx:
 *   1. Emblem  — scales up while fading in (ease-out).
 *   2. Wordmark — wiped in left-to-right via an animated clip-path.
 *   3. Sheen   — a single light sweep, masked to the logo, once it lands.
 *
 * Plays once on mount, never loops.
 */

// Premium ease-out — smooth, no overshoot / no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;

// The emblem (circle) occupies roughly the left ~23% of the artwork; the
// wordmark fills the rest. This is where we split the two regions.
const SPLIT = 23; // percent

// Shared artwork, painted as a background so it can be clipped per-region.
const ART = {
  backgroundImage: "url('/images/logo.svg')",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left center",
} as const;

// Step 1 — emblem eases in with a gentle scale-up about its own centre.
const emblemVariants: Variants = {
  hidden: { scale: 0.55, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: EASE },
  },
};

// Step 2 — wordmark is uncovered left-to-right (its clip's right edge sweeps
// from the split point across to the end). Overlaps step 1 slightly.
const wordmarkVariants: Variants = {
  hidden: { clipPath: `inset(0% ${100 - SPLIT}% 0% ${SPLIT}%)` },
  visible: {
    clipPath: `inset(0% 0% 0% ${SPLIT}%)`,
    transition: { duration: 0.8, ease: EASE, delay: 0.45 },
  },
};

type Logo2Props = {
  /** Size / color overrides. `w-auto` keeps the aspect ratio. */
  className?: string;
};

export default function Logo2({ className = "h-8 w-auto" }: Logo2Props) {
  return (
    <span
      role="img"
      aria-label="interrail"
      className={`relative inline-block ${className}`}
      style={{ aspectRatio: "111 / 26" }}
    >
      {/* Step 1: emblem — clipped to the left region, scales in */}
      <motion.span
        aria-hidden
        variants={emblemVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 block"
        style={{
          ...ART,
          clipPath: `inset(0% ${100 - SPLIT}% 0% 0%)`,
          transformOrigin: `${SPLIT / 2}% 50%`,
        }}
      />

      {/* Step 2: wordmark — clipped to the right region, wipes in L→R */}
      <motion.span
        aria-hidden
        variants={wordmarkVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 block"
        style={ART}
      />

      {/* Step 3: sheen — a single light sweep, masked to the logo silhouette */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 block overflow-hidden"
        style={{
          WebkitMaskImage: "url('/images/logo.svg')",
          maskImage: "url('/images/logo.svg')",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "left center",
          maskPosition: "left center",
        }}
      >
        <motion.span
          className="absolute inset-y-0 block w-1/2"
          initial={{ x: "-160%" }}
          animate={{ x: "320%" }}
          transition={{ delay: 1.45, duration: 0.9, ease: "easeInOut" }}
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.85) 50%, transparent 70%)",
          }}
        />
      </span>
    </span>
  );
}
