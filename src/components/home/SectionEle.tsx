"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  cubicBezier,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);

/**
 * The arrow's two strokes, lifted verbatim from trustpilot-arrow.svg.
 *
 * `MAIN` runs (8.495, 1.0) → (1.66, 54.13): top to bottom already, so
 * pathLength draws it in the direction the hand would have. `HEAD` is the
 * two-legged tip. Inline rather than an <Image> because next/image cannot
 * reach inside the file to animate either one.
 */
const ARROW_MAIN =
  "M8.49544 1.00006C10.9074 4.18714 11.8248 6.31213 12.8373 11.1166C13.5329 14.4175 13.8144 19.6116 13.9773 23.0438C14.1402 26.476 13.9758 28.0252 13.6805 29.7065C13.0715 33.1749 12.1732 36.004 10.3011 39.8312C8.90316 42.6889 6.12482 47.163 4.56022 49.7381C2.99563 52.3133 2.60855 52.7919 2.31912 53.1778C2.02969 53.5636 1.84964 53.8422 1.66414 54.1292";
const ARROW_HEAD =
  "M1.87272 42.4336C1.85997 42.6993 1.84721 42.9649 1.67745 45.1298C1.50769 47.2947 1.1813 51.3508 1.05636 53.3957C0.931423 55.4406 1.01782 55.3513 1.28248 55.1411C1.54715 54.9309 1.98747 54.6025 2.90893 54.0164C3.83038 53.4302 5.21963 52.5963 7.30455 51.6838C9.38948 50.7713 12.128 49.8054 14.8845 48.8281";

/* ------------------------------------------------------------------ *
 * Timeline — one shared trigger, ordered by explicit delays
 * ------------------------------------------------------------------ */

const shell: Variants = { hidden: {}, show: {} };

const logoIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 1.025, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

/**
 * The stars fill left to right, as a rating would.
 *
 * A clip-path wipe rather than anything touching width: the artwork is a single
 * raster of five tiles, so revealing it by inset keeps every star at its final
 * size and position and never resamples the image. Opacity resolves early so
 * the wipe reads as a fill rather than a fade.
 */
const starWipe: Variants = {
  hidden: { opacity: 0, clipPath: "inset(0% 100% 0% 0%)" },
  show: {
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    transition: {
      duration: 0.85,
      ease: EASE,
      delay: 0.12,
      opacity: { duration: 0.3, ease: EASE, delay: 0.12 },
    },
  },
};

const ratingIn: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(3px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE, delay: 0.35 },
  },
};

/* ------------------------------------------------------------------ *
 * Arrow — drawn by scroll position, like the route lines elsewhere
 * ------------------------------------------------------------------ */

type Range = readonly [number, number];
type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>["offset"];

/** The same spring every drawn line on this page uses. */
const ARROW_SPRING = {
  stiffness: 120,
  damping: 16,
  mass: 0.4,
  restDelta: 0.0001,
} as const;

/**
 * The arrow's own crossing owns the draw: progress opens as the tip noses in
 * and closes with its tail above centre, so the whole stroke is laid down
 * while it is on screen rather than on a timer that may already have run.
 */
const ARROW_OFFSET: ScrollOffset = ["start 0.92", "end 0.55"];

/**
 * The head begins at 77.6% of the curve — (0.57 - 0.05) / 0.67 — so the tip
 * arrives just as the stroke reaches it, and finishes last.
 */
const MAIN: Range = [0.05, 0.72];
const HEAD: Range = [0.57, 0.85];

/**
 * Draws a stroke on as progress moves through `range`.
 *
 * Linear on purpose: an ease here would make the line bolt away and then crawl,
 * which reads as uneven when it is pinned to the wheel — the spring is what
 * supplies the smoothing. The opacity ramp is the other half of it: these caps
 * are round, so a zero-length dash paints a stationary yellow dot until the
 * stroke is switched on at the instant drawing begins.
 */
function useDraw(progress: MotionValue<number>, [from, to]: Range) {
  const pathLength = useTransform(progress, [from, to], [0, 1]);
  const opacity = useTransform(progress, [from, from + 0.01], [0, 1]);
  return { pathLength, opacity };
}

export default function SectionEle() {
  const reduce = !!useReducedMotion();

  // The arrow is scroll-driven while the badge, stars and rating stay on the
  // section's shared viewport timeline — they are discrete reveals, whereas the
  // stroke reads best tied to the wheel.
  const arrowRef = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({
    target: arrowRef,
    offset: ARROW_OFFSET,
  });
  const smoothed = useSpring(scrollYProgress, ARROW_SPRING);
  // Reduced motion pins progress at the end rather than branching the render,
  // so both strokes resolve to fully drawn through the identical path.
  const settled = useMotionValue(1);
  const progress = reduce ? settled : smoothed;

  const main = useDraw(progress, MAIN);
  const head = useDraw(progress, HEAD);

  return (
    <section className="bg-white px-6 py-12">
      <motion.div
        variants={shell}
        initial={reduce ? "show" : "hidden"}
        whileInView="show"
        // One trigger for the whole composition. 0.75 rather than 1 so a short
        // viewport can still satisfy it, but high enough that nothing fires
        // while the block is still mostly under the fold.
        viewport={{ once: true, amount: 0.75 }}
        // `relative` anchors the arrow, which the design hangs off the right of
        // the badge rather than placing it in flow.
        className="relative mx-auto flex max-w-[342px] flex-col items-center"
      >
        {/* Badge — logo over its star row, both locked to a 165px column.
            The aspect ratios are the shipped PNGs' own (1864×452, 2000×376)
            rather than Figma's frame ratios, which differ because the design
            crops each source inside its frame. object-contain against the real
            files is what keeps them from letterboxing. */}
        <div className="flex w-[165px] flex-col items-start gap-3">
          <motion.div
            variants={logoIn}
            className="relative aspect-[1864/452] w-full"
          >
            <Image
              src="/images/trustpilot-logo.png"
              alt="Trustpilot"
              fill
              sizes="165px"
              className="object-contain"
            />
          </motion.div>

          <motion.div
            variants={starWipe}
            className="relative aspect-[2000/376] w-full"
          >
            <Image
              src="/images/trustpilot-stars.png"
              alt="Rated five stars"
              fill
              sizes="165px"
              className="object-contain"
            />
          </motion.div>
        </div>

        {/* Rating line. whitespace-pre-wrap keeps the design's wide spacing
            between the score and the review count.

            The visible run reads as one sentence to a screen reader through the
            label; the spans are hidden so the spacing characters and the "i"
            standing in for a divider are not spelled out on top of it. */}
        <motion.p
          variants={ratingIn}
          aria-label="Trustpilot rating: 4.7 out of 5, from 72 thousand reviews"
          className="mt-[25px] whitespace-pre-wrap text-center text-base capitalize leading-[1.1] tracking-16 text-[#0F141C]"
        >
          <span aria-hidden>
            <span className="text-[#0F141C]/50">Trustpilot</span>
            <span className="font-gveret">{`  4.7 i  5    72K reviews`}</span>
          </span>
        </motion.p>

        {/* Hand-drawn arrow, pointing down at the score. The box is the
            stroke-inclusive one — Figma's 13.884×54.245 frame at 281,36 plus
            the -7.2%/-1.84% bleed its own render applies. */}
        <span
          ref={arrowRef}
          aria-hidden
          className="pointer-events-none absolute left-[280px] top-[35px] block h-[56.25px] w-[15.88px]"
        >
          <svg
            viewBox="0 0 15.8848 56.2453"
            preserveAspectRatio="none"
            overflow="visible"
            fill="none"
            aria-hidden="true"
            focusable="false"
            className="absolute inset-0 h-full w-full"
          >
            <motion.path
              d={ARROW_MAIN}
              stroke="#FFD400"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={main}
            />
            <motion.path
              d={ARROW_HEAD}
              stroke="#FFD400"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={head}
            />
          </svg>
        </span>
      </motion.div>
    </section>
  );
}
