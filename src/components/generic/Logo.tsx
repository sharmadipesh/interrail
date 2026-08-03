"use client";

import { motion, type Variants } from "framer-motion";

/**
 * Premium, one-shot logo reveal for the Interrail mark.
 *
 * Sequence (staggered, ~2s total, plays once on mount, never loops):
 *   1. Yellow ring        — scales up slightly while fading in (ease-out).
 *   2. Railway symbol     — drawn in bottom-to-top via an animated SVG clip.
 *   3. "interrail" word   — uncovered left-to-right via an animated SVG clip.
 *
 * Swapping in official artwork: everything inside the `LOGO ART` markers is the
 * static drawing. Replace the shapes but keep the three wrappers (ring
 * `<motion.g>`, `#icon-clip` rect, `#text-clip` rect) — the animation keys off
 * those wrappers, not the specific shapes.
 */

// Premium easing — smooth ease-out, no overshoot / no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;

const YELLOW = "#EEB63C";
const NAVY = "#242438";

// Step 1 — the ring eases in with a gentle scale-up.
const ringVariants: Variants = {
  hidden: { scale: 0.85, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: EASE },
  },
};

// Step 2 — the clip rect grows upward (its bottom edge stays fixed), so the
// railway symbol is drawn into the ring from the bottom. The delay leaves a
// small overlap with step 1 for a smoother hand-off.
const iconClipVariants: Variants = {
  hidden: { y: 74, height: 0 },
  visible: {
    y: 46,
    height: 28,
    transition: { duration: 0.7, ease: EASE, delay: 0.45 },
  },
};

// Step 3 — the clip rect expands its width, uncovering the wordmark
// left-to-right. Starts once the icon is essentially complete.
const textClipVariants: Variants = {
  hidden: { width: 0 },
  visible: {
    width: 320,
    transition: { duration: 0.8, ease: EASE, delay: 1.15 },
  },
};

type LogoProps = {
  /** Size / color overrides. `w-auto` keeps the aspect ratio. */
  className?: string;
};

export default function Logo({ className = "h-12 w-auto" }: LogoProps) {
  return (
    <motion.svg
      viewBox="0 0 400 100"
      role="img"
      aria-label="interrail"
      className={className}
      style={{ maxWidth: "100%" }}
    >
      <title>interrail</title>

      <defs>
        {/* Clip that reveals the railway symbol from the bottom up. */}
        <clipPath id="icon-clip">
          <motion.rect
            x={33}
            width={32}
            variants={iconClipVariants}
            initial="hidden"
            animate="visible"
          />
        </clipPath>

        {/* Clip that uncovers the wordmark from left to right. */}
        <clipPath id="text-clip">
          <motion.rect
            x={100}
            y={0}
            height={100}
            variants={textClipVariants}
            initial="hidden"
            animate="visible"
          />
          {/* width set in textClipVariants below */}
        </clipPath>
      </defs>

      {/* ─────────────── LOGO ART ─────────────── */}

      {/* Step 1: yellow "omega" ring, open at the bottom — scales in. */}
      <motion.g
        variants={ringVariants}
        initial="hidden"
        animate="visible"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <path
          d="M27.43 70.51 A 32 32 0 1 1 68.57 70.51"
          fill="none"
          stroke={YELLOW}
          strokeWidth={13}
          strokeLinecap="butt"
        />
      </motion.g>

      {/* Step 2: solid tunnel + sleeper, clipped for the bottom-up reveal.
          Sized to leave clear space between the ring and the symbol. */}
      <g clipPath="url(#icon-clip)" fill={NAVY}>
        {/* Tunnel mouth — trapezoid, narrow at top, wide at the base */}
        <path d="M41 47.5 L55 47.5 L60 62 L36 62 Z" />
        {/* Front sleeper — wider bar spanning the ring's opening */}
        <path d="M36 65 L60 65 L61.5 72 L34.5 72 Z" />
      </g>

      {/* Step 3: wordmark (Poppins), clipped for the left-to-right reveal. */}
      <g clipPath="url(#text-clip)">
        <text
          x={104}
          y={48}
          fill={NAVY}
          dominantBaseline="central"
          style={{
            fontFamily: "var(--font-poppins), sans-serif",
            fontWeight: 700,
            fontSize: "84px",
            letterSpacing: "-1.5px",
          }}
        >
          interrail
        </text>
        {/* Two-dot tittle on the last "i": the font supplies the navy (ink)
            dot; this yellow dot overlaps it, offset up-and-right. Position
            tuned to Poppins metrics below. */}
        <circle cx={362} cy={18.5} r={8.5} fill={YELLOW} />
      </g>

      {/* ─────────────── /LOGO ART ─────────────── */}
    </motion.svg>
  );
}
