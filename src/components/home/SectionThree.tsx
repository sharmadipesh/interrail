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
 * Same spring the route section uses, for one reason: Lenis already smooths the
 * wheel, so a heavy spring on top of it smooths an already-smooth signal and
 * reads as lag. This settles in ~100ms and cannot overshoot (damping ratio
 * 1.15), which matters here because an elastic tail on a 78vw slide would show.
 *
 * restDelta is not cosmetic — the default 0.01 is a full 1% of a 0 → 1 progress
 * range, so the spring stops short of its target and snaps the last step.
 */
const SPRING = {
  stiffness: 120,
  damping: 16,
  mass: 0.4,
  restDelta: 0.0001,
} as const;

type Range = readonly [number, number];

/**
 * The section is 220svh tall and the stage pins for the middle of it. With the
 * timeline anchored `["start 0.5", "end end"]`, the pin engages at exactly
 * 0.5 / (2.2 - 1 + 0.5) = 0.294 and releases at 1.0 — sticky lets go the
 * instant the section's bottom meets the viewport's, so progress 1 *is* the
 * release. Everything below is placed against those two fixed points.
 *
 * The heading resolves before the pin, while the composition is still rising
 * into place, so it has established focus before anything else moves.
 */
const STAYING: Range = [0.04, 0.2];
const CURIOUS: Range = [0.09, 0.25];
// Both clips move only while pinned. They overlap by design — the portrait
// leaves before the landscape has landed, so the two reads as one gesture.
const LANDSCAPE: Range = [0.32, 0.57];
const PORTRAIT: Range = [0.41, 0.69];
// The tagline waits: its middle letters sit on top of the portrait clip, so it
// can only resolve once that clip is essentially home.
const TAGLINE: Range = [0.67, 0.84];
// 0.84 → 1.00 is deliberately empty. The completed composition holds, then
// scrolls away with the page when sticky releases — nothing fades or scales
// out, which is what keeps the hand-off to SectionFour from feeling abrupt.

/** How far off-stage each clip starts, in viewport widths. */
const ENTRY_VW = 78;

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

/** Rises and resolves out of a light blur. Holds once revealed. */
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
  return { opacity, y, filter };
}

/**
 * A clip sliding in from off-stage to its final position.
 *
 * `x` is expressed in viewport widths so the entrance starts off-screen at any
 * size, and it animates the transform only — the absolute left/right/top that
 * place the clip are never touched, so the final composition is exactly the
 * design's. Opacity resolves over the first third of the travel; fading across
 * the whole slide would leave the clip invisible for most of its journey.
 */
function useSlideIn(
  progress: MotionValue<number>,
  [from, to]: Range,
  fromVw: number,
): MotionStyle {
  const vw = useTransform(progress, [from, to], [fromVw, 0], { ease: EASE });
  const x = useMotionTemplate`${vw}vw`;
  const opacity = useTransform(
    progress,
    [from, from + (to - from) * 0.34],
    [0, 1],
  );
  const scale = useTransform(progress, [from, to], [1.04, 1], { ease: EASE });
  return { x, opacity, scale };
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

  const landscape = useSlideIn(progress, LANDSCAPE, ENTRY_VW);
  const portrait = useSlideIn(progress, PORTRAIT, -ENTRY_VW);
  // Grouped, not per-character: at this tracking a character flick reads as
  // noise against the clip behind it. The white/navy split is untouched.
  const tagline = useReveal(progress, TAGLINE, 14, 0);

  return (
    // `overflow-x: clip` rather than hidden — clip does not create a scroll
    // container, so it swallows the off-stage clips without stealing the
    // scrollport that `position: sticky` below needs to resolve against.
    <section
      ref={sectionRef}
      className={`relative h-[220svh] overflow-x-clip bg-white px-6 ${NO_PIN_SECTION}`}
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
