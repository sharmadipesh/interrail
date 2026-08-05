"use client";

import { useEffect, useRef } from "react";
import {
  cubicBezier,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type MotionStyle,
} from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);

/**
 * Fades get their own curve. EASE is a hard ease-out: on travel that reads as
 * arriving with authority, but on opacity it front-loads so heavily that a clip
 * is 77% opaque a quarter of the way through its window — the abrupt fade this
 * timeline is meant to avoid. This is symmetric and gentle at both ends, so the
 * fade still resolves gradually while starting and finishing without the
 * velocity step a linear ramp leaves behind.
 */
const EASE_FADE = cubicBezier(0.45, 0, 0.55, 1);

const HEADING = ["Staying", "curious"];

// The middle four letters are white so they read out of the portrait clip
// sitting behind them; "S" and the year stay navy on the white background.
const SINCE = "SINCE 1959";
const WHITE_FROM = 1;
const WHITE_TO = 4;

/* ------------------------------------------------------------------ *
 * Motion system
 * ------------------------------------------------------------------ */

/**
 * Lenis already smooths the wheel with a 0.75s easeOutExpo, so this spring is
 * not the thing making the scroll smooth — it only takes the residual step out
 * of an already-smoothed signal. Tuned up from 120/16 now the travel is a
 * fraction of what it was: at 130/18 the damping ratio is
 * 18 / (2·√(130·0.4)) = 1.25, so it still cannot overshoot, but it settles
 * sooner and the composition sits closer to the scroll instead of trailing it.
 * Two lagging smoothers stacked on each other is what reads as floaty.
 *
 * restDelta is not cosmetic — the default 0.01 is a full 1% of a 0 → 1 progress
 * range, so the spring stops short of its target and snaps the last step.
 */
const SPRING = {
  stiffness: 130,
  damping: 18,
  mass: 0.4,
  restDelta: 0.0001,
} as const;

type Range = readonly [number, number];

/**
 * The section is 190svh tall and the stage pins for the middle of it. With the
 * timeline anchored `["start 0.5", "end end"]`, the whole 0 → 1 spans
 * 1.9 - 1 + 0.5 = 1.4 viewports; the pin engages at 0.5 / 1.4 = 0.357 and
 * releases at 1.0 — sticky lets go the instant the section's bottom meets the
 * viewport's, so progress 1 *is* the release. Everything below is placed
 * against those two fixed points.
 *
 * That leaves 90svh of pinned travel. The heading still resolves before the pin
 * takes hold, so it has established focus before anything else moves.
 */
const STAYING: Range = [0.04, 0.19];
const CURIOUS: Range = [0.09, 0.23];
// 0.23 → 0.34 is the held beat: the heading is readable and the two clips have
// gathered at its centre, but nothing has started separating yet.
const LANDSCAPE: Range = [0.34, 0.58];
const PORTRAIT: Range = [0.4, 0.66];
// The tagline waits: its middle letters sit on top of the portrait clip, so it
// can only resolve once that clip is essentially home — at 0.65 the portrait is
// 96% of the way there.
const TAGLINE: Range = [0.65, 0.84];
// 0.84 → 1.00 is deliberately empty. The completed composition holds, then
// scrolls away with the page when sticky releases — nothing fades or scales
// out, which is what keeps the hand-off to SectionFour from feeling abrupt.

/**
 * Where each clip starts, measured from its own final home.
 *
 * These are not eyeballed. At the 390px reference the column is 342px wide, and
 * measuring the laid-out composition gives centres of (253.5, 105.2) for the
 * landscape, (79.5, 425.4) for the portrait, and (171, 220.5) for the heading
 * box that both are gathering onto. The offsets below are exactly the vectors
 * from each clip's centre to the heading's, so the pair genuinely coincides
 * rather than approximately.
 *
 * `x` is a share of the clip's *own* width, not the viewport. That is the whole
 * point: the old entrance travelled ±78vw against a composition capped at
 * 342px, so the same gesture covered 1.6 clip-widths on a phone and 5.9 on a
 * desktop — the reason it read as abrupt on a wide screen. Tied to the element,
 * the split is the same move at every width.
 *
 * `y` is a constant plus a share of the clip's own height, which makes it exact
 * at every width rather than only at the reference one. A clip's resting centre
 * is `top + height/2`, and `top` is a fixed px in the design while `height`
 * scales with the column — so the vector onto the heading's centre is
 * `(220.5 - top) - height/2`, i.e. a constant and a flat -50% of its own
 * height. A single fixed px value drifted 11px (landscape) and 20px (portrait)
 * by the time the column reached 320px; this does not drift at all, and it
 * still costs nothing but a percentage.
 *
 * `fade` is deliberately its own window rather than a fraction of the travel.
 * The cluster has to be *visible* during the held beat before it separates, so
 * each clip resolves from transparent starting inside that hold and reaches
 * full opacity around 42% of its own travel.
 */
type Split = {
  /** Horizontal start, as a percentage of the clip's own width. */
  x: number;
  /** Vertical start: this many px… */
  yPx: number;
  /** …plus this share of the clip's own height. */
  yPct: number;
  scale: number;
  fade: Range;
};

// 220.5 - 52 = 168.5, against the landscape's `top-[52px]`.
const LANDSCAPE_SPLIT: Split = {
  x: -43.65,
  yPx: 168.5,
  yPct: -50,
  scale: 0.92,
  fade: [0.25, 0.44],
};
// 220.5 - 326 = -105.5, against the portrait's `top-[326px]`.
const PORTRAIT_SPLIT: Split = {
  x: 57.55,
  yPx: -105.5,
  yPct: -50,
  scale: 0.92,
  fade: [0.3, 0.51],
};

/**
 * Layout used when the pin is inapplicable: reduced motion, and viewports too
 * short to centre the 473px composition without trapping it under a sticky
 * stage taller than the screen. Both restore the original document flow.
 *
 * Written out literally rather than composed, because Tailwind scans source
 * text and never sees class names built at runtime.
 */
const NO_PIN_STAGE =
  "motion-reduce:static motion-reduce:block motion-reduce:min-h-0 motion-reduce:pt-7 motion-reduce:pb-[158px] " +
  "[@media(max-height:600px)]:static [@media(max-height:600px)]:block [@media(max-height:600px)]:min-h-0 [@media(max-height:600px)]:pt-7 [@media(max-height:600px)]:pb-[158px]";
const NO_PIN_SECTION = "motion-reduce:h-auto [@media(max-height:600px)]:h-auto";

/**
 * Rises and resolves out of a light blur. Holds once revealed.
 *
 * A caller asking for no blur gets no `filter` at all, rather than an animated
 * `blur(0px)`. The zero-radius filter is invisible but not free: it still puts
 * the element on its own filter layer and re-runs that filter every frame it is
 * scrubbed, which on the tagline was a per-frame cost buying nothing.
 */
function useReveal(
  progress: MotionValue<number>,
  [from, to]: Range,
  distance: number,
  blur: number,
): MotionStyle {
  const opacity = useTransform(progress, [from, to], [0, 1], { ease: EASE });
  const y = useTransform(progress, [from, to], [distance, 0], { ease: EASE });
  const blurPx = useTransform(progress, [from, to], [blur, 0], { ease: EASE });
  const filter = useMotionTemplate`blur(${blurPx}px)`;
  // The hooks above always run; only what is handed to the element varies.
  return blur > 0 ? { opacity, y, filter } : { opacity, y };
}

/**
 * A clip peeling away from the centred cluster to its final position.
 *
 * Every value resolves to its rest state at the end of the range — x to 0%, y
 * to 0, scale to 1 — so the finished composition is the absolute
 * left/right/top the design specifies, untouched. The transform is the only
 * thing that moves.
 *
 * The x template always emits a percentage, including at rest, so there is no
 * unit change for the compositor to resolve as the value lands on zero.
 */
function useCenterSplit(
  progress: MotionValue<number>,
  [from, to]: Range,
  split: Split,
): MotionStyle {
  const xPct = useTransform(progress, [from, to], [split.x, 0], { ease: EASE });
  const x = useMotionTemplate`${xPct}%`;
  // The two halves of the vertical vector are interpolated separately and
  // composed as a calc, because one is px and the other is a share of the
  // clip's own height — there is no single unit that expresses both.
  const yPx = useTransform(progress, [from, to], [split.yPx, 0], {
    ease: EASE,
  });
  const yPct = useTransform(progress, [from, to], [split.yPct, 0], {
    ease: EASE,
  });
  const y = useMotionTemplate`calc(${yPx}px + ${yPct}%)`;
  const scale = useTransform(progress, [from, to], [split.scale, 1], {
    ease: EASE,
  });
  // Spread rather than passed through: `Range` is readonly and useTransform
  // takes a mutable input range. Eased so the fade neither starts nor ends on a
  // velocity step, which is where a linear ramp shows.
  const opacity = useTransform(progress, [...split.fade], [0, 1], {
    ease: EASE_FADE,
  });
  return { x, y, scale, opacity };
}

/**
 * A muted, looping clip that only plays while it is on screen — the same
 * treatment the rest of the page gives its video, and it keeps offscreen clips
 * from burning decode time. The poster holds the frame until the video is
 * ready, so the composition never renders as an empty box.
 *
 * The ref sits on the element that carries the slide, so intersection is judged
 * on where the clip actually is: parked off-stage it stays paused, and it only
 * starts once it has genuinely arrived.
 */
function Clip({
  src,
  poster,
  label,
  className,
  style,
}: {
  src: string;
  poster: string;
  label: string;
  /** Absolute placement + aspect ratio for this clip's slot. */
  className: string;
  style: MotionStyle;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(wrapRef, { amount: 0.4 });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      const p = v.play();
      if (p) p.catch(() => {});
    } else {
      v.pause();
    }
  }, [inView]);

  return (
    <motion.div
      ref={wrapRef}
      style={style}
      className={`absolute overflow-hidden ${className}`}
    >
      <video
        ref={videoRef}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        className="h-full w-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
    </motion.div>
  );
}

/** One headline line. Both share a curve; only the start is offset. */
function HeadingLine({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: Range;
}) {
  const style = useReveal(progress, range, 42, 8);
  return (
    <motion.span style={style} className="block">
      {word}
    </motion.span>
  );
}

export default function SectionThree() {
  const sectionRef = useRef<HTMLElement>(null);

  // One timeline for the whole section. `start 0.5` opens it as the stage's
  // centre reaches the fold; `end end` closes it exactly as sticky releases.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.5", "end end"],
  });
  const smoothed = useSpring(scrollYProgress, SPRING);

  // Reduced motion pins the timeline at its end rather than branching the
  // render, so every transform below resolves to its finished value — heading
  // in place, both clips home, tagline set — through the identical code path.
  // The extended scroll distance is removed in CSS, not here.
  const settled = useMotionValue(1);
  const reduce = useReducedMotion();
  const progress = reduce ? settled : smoothed;

  const landscape = useCenterSplit(progress, LANDSCAPE, LANDSCAPE_SPLIT);
  const portrait = useCenterSplit(progress, PORTRAIT, PORTRAIT_SPLIT);
  // Grouped, not per-character: at this tracking a character flick reads as
  // noise against the clip behind it. The white/navy split is untouched.
  const tagline = useReveal(progress, TAGLINE, 14, 0);

  return (
    // `overflow-x: clip` rather than hidden — clip does not create a scroll
    // container, so it can guard the column's right-hand bleed without
    // stealing the scrollport that `position: sticky` below resolves against.
    <section
      ref={sectionRef}
      className={`relative h-[190svh] overflow-x-clip bg-white px-6 ${NO_PIN_SECTION}`}
    >
      <div
        className={`sticky top-0 flex min-h-[100svh] items-center ${NO_PIN_STAGE}`}
      >
        <motion.div
          // 342px is the design's content column (390 frame less its 24px
          // gutters); capping there keeps the composition true to the design
          // rather than stretching the 86px headline on wider screens.
          className="relative mx-auto w-full max-w-[342px] py-[118px]"
        >
          {/* Clips are placed with percentage edges so they hold their share of
              the column — and, with aspect-ratio, their proportions — as it
              narrows. Both come before the copy in the DOM and the copy is
              `relative`, so the type paints over them exactly as it does in the
              design, without reaching for z-index. */}

          {/* Landscape clip — upper right, bleeding 6px past the column edge. */}
          <Clip
            src="/images/section-2-1.mp4"
            poster="/images/section-2.2.png"
            label="Friends together on a train crossing Europe"
            className="left-[46.49%] right-[-1.76%] top-[52px] aspect-[1280/720]"
            style={landscape}
          />

          {/* Portrait clip — lower left, sitting behind the tagline. */}
          <Clip
            src="/images/section-2-2.mp4"
            poster="/images/section-2.1.png"
            label="A traveller with a bike at golden hour"
            className="left-0 right-[53.51%] top-[326px] aspect-[720/900]"
            style={portrait}
          />

          {/* Headline. The fixed 205px box with centred lines is the design's own
              frame — it holds the 12.5px of slack above and below the two 90px
              lines that sets the gap down to the tagline. */}
          <h2 className="relative flex h-[205px] flex-col justify-center text-center font-sans text-[86px] font-semibold leading-[90px] tracking-[-3px] text-brand-yellow">
            {HEADING.map((word, i) => (
              <HeadingLine
                key={word}
                word={word}
                progress={progress}
                range={i === 0 ? STAYING : CURIOUS}
              />
            ))}
          </h2>

          {/* SINCE 1959 — the left padding cancels the trailing letter-spacing CSS
              adds after the final glyph, which would otherwise pull the centred
              run 11.2px off-centre against the design. */}
          <motion.p
            style={tagline}
            className="relative mt-6 pl-[22.4px] text-center font-departure text-base leading-[33.45px] tracking-[21px] text-navy-1"
          >
            {SINCE.split("").map((char, i) => (
              <span
                key={i}
                className={
                  i >= WHITE_FROM && i <= WHITE_TO ? "text-white" : undefined
                }
              >
                {/* nbsp: keeps the gap between "SINCE" and the year from
                    collapsing or wrapping under the wide tracking. */}
                {char === " " ? "\u00a0" : char}
              </span>
            ))}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
