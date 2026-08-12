"use client";

import React, { useId, useRef } from "react";
import {
  cubicBezier,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

const STACK = [
  "See the landmarks and<br />the places guidebooks skip.",
  "Plan your trip in advance<br />or make it up as you go.",
  "Skip the travel chaos and<br />enjoy the view from the train. ",
];

/* ------------------------------------------------------------------ *
 * Motion system
 * ------------------------------------------------------------------ */

// The page's two premium ease-outs. EASE_TEXT is Banner's curve, so the copy
// here reads as a continuation of the hero's momentum rather than a new idea.
const EASE = cubicBezier(0.22, 1, 0.36, 1);
const EASE_TEXT = cubicBezier(0.16, 1, 0.3, 1);

/**
 * How far the outer statements reach back toward their own edge before
 * settling. 22px against the section's 24px gutter, so a statement never
 * travels further out than the margin it is aligned to.
 */
const SETTLE_X = 22;

/**
 * Light touch on purpose. Lenis already smooths the wheel, so a heavy spring
 * here just smooths a smooth signal and the result reads as lag. This settles
 * in ~100ms and still can't overshoot (damping ratio 1.15).
 *
 * restDelta matters more than it looks: the default 0.01 is a full 1% of a
 * 0 → 1 progress range, so the spring gives up short of its target and snaps
 * the last step. At 0.0001 it lands cleanly.
 */
const SPRING = {
  stiffness: 120,
  damping: 16,
  mass: 0.4,
  restDelta: 0.0001,
} as const;

type Range = readonly [number, number];

/**
 * Every element is timed against its own pass through the viewport rather than
 * a single section-wide progress. A shared timeline sounds tidier, but this
 * section is taller than the screen — anything low in it reached its cue while
 * still below the fold, so the copy and the lower route were already finished
 * by the time they appeared. These offsets are the fix.
 */
type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>["offset"];

// Copy reveals as its top travels from just under the fold to comfortably read.
const TEXT_OFFSET: ScrollOffset = ["start 0.88", "start 0.52"];
// A route starts as it noses in and completes with its tail above centre, so
// the whole draw is on screen. The two frames sit 35px apart, so the lower
// route opens while the upper is still finishing — they read as one line.
const ROUTE_OFFSET: ScrollOffset = ["start 0.92", "end 0.55"];

/**
 * A route's internal timeline, in that route's own 0 → 1.
 *
 * Grey leads, yellow chases, and the tail is left quiet so the line settles
 * before the next thing asks for attention.
 */
const GREY: Range = [0.0, 0.72];
const YELLOW: Range = [0.13, 0.95];

/**
 * Where each station sits along its own yellow path, as a fraction of that
 * path's length. Measured from the SVG geometry (every circle lies within 1.4
 * user units of its route), so a stop lights up when the signal actually
 * reaches it rather than on a hand-picked number.
 *
 * The upper pair reads lower than it once did because the fraction is of a
 * longer path, not because the stops moved: yellow now runs grey's full 486.8
 * units instead of the truncated 394.5, so the same two points — 72.3 and
 * 234.7 units along — sit earlier in the draw. Re-measure against `D` if a
 * route is ever re-exported; a stale fraction here shows as a station blooming
 * off the signal.
 */
const UPPER_STOPS = [0.148, 0.482] as const;
const LOWER_STOPS = [0.369, 0.686] as const;

/** How long a station takes to bloom once the signal arrives. */
const DWELL = 0.09;

/** Maps a station's position along a path onto that path's draw window. */
function stopWindow([from, to]: Range, at: number): Range {
  const start = from + at * (to - from);
  return [start, Math.min(1, start + DWELL)];
}

/**
 * Progress of one element through the viewport, smoothed.
 *
 * Reduced motion pins the value at 1 rather than branching the render, so every
 * transform downstream resolves to its finished state through the same path.
 */
function useViewportProgress(
  ref: React.RefObject<HTMLElement | null>,
  offset: ScrollOffset,
) {
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const smoothed = useSpring(scrollYProgress, SPRING);
  const settled = useMotionValue(1);
  const reduce = useReducedMotion();
  return reduce ? settled : smoothed;
}

/**
 * Draws a stroke on as progress moves through `range`.
 *
 * Deliberately linear: an ease-out here would make the line lurch away and then
 * crawl, which reads as uneven when it is pinned to the wheel. Linear tracks
 * the scroll 1:1 and lets the spring do the smoothing.
 *
 * The opacity ramp is the subtle part — these paths use round linecaps, so a
 * zero-length dash still paints a visible dot. Holding the stroke transparent
 * until the draw actually begins keeps that dot off the screen.
 */
function useDraw(progress: MotionValue<number>, [from, to]: Range) {
  const pathLength = useTransform(progress, [from, to], [0, 1]);
  const opacity = useTransform(progress, [from, from + 0.01], [0, 1]);
  return { pathLength, opacity };
}

/**
 * Copy that rises and resolves out of a light blur as it comes into view.
 *
 * The ref sits on an outer wrapper and the transform on an inner one. Measuring
 * the same element we translate would feed a 20px shift back into its own
 * scroll offset; splitting them keeps the reveal from chasing its own tail.
 */
function Reveal({
  className,
  html,
  blur = 6,
  from,
  children,
}: {
  className: string;
  html?: string;
  blur?: number;
  /**
   * Which side the copy settles in from, for the statements that sit along the
   * route. Each one reaches back toward the edge it is aligned to and closes
   * the gap as it arrives, so the motion carries the same left-to-right
   * direction the route itself is drawing in.
   *
   * Omit it — as the headings do — for a straight rise out of a blur.
   */
  from?: "left" | "center" | "right";
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useViewportProgress(ref, TEXT_OFFSET);

  const opacity = useTransform(progress, [0, 1], [0, 1], { ease: EASE_TEXT });
  const y = useTransform(progress, [0, 1], [20, 0], { ease: EASE_TEXT });
  const blurPx = useTransform(progress, [0, 1], [blur, 0], { ease: EASE_TEXT });
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  // The centre statement has nowhere to reach back to, so it rises straight —
  // which is what its own alignment is already saying.
  const offset = from === "left" ? -SETTLE_X : from === "right" ? SETTLE_X : 0;
  const x = useTransform(progress, [0, 1], [offset, 0], { ease: EASE_TEXT });

  // Two transforms and an opacity, or two transforms and a filter — never
  // both. A blur holds a compositing layer for the whole of its run, so it is
  // only paid for where it is actually used.
  const style = from ? { opacity, y, x } : { opacity, y, filter };

  return (
    <div ref={ref} className={className}>
      {html ? (
        <motion.div style={style} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <motion.div style={style}>{children}</motion.div>
      )}
    </div>
  );
}

/**
 * A station marker on the route.
 *
 * The `<circle>` keeps its own rotate() attribute untouched — that rotation
 * orients its userSpaceOnUse gradient, so a CSS transform here would quietly
 * restyle it. Scaling lives on the wrapping group instead, which Framer renders
 * with transform-box: fill-box and a 50% origin, i.e. the circle's own centre.
 */
function Station({
  cx,
  cy,
  r,
  rotate,
  gradient,
  progress,
  range,
}: {
  cx: number;
  cy: number;
  r: number;
  rotate: number;
  gradient: string;
  progress: MotionValue<number>;
  range: Range;
}) {
  const [from, to] = range;
  const opacity = useTransform(progress, [from, to], [0, 1], { ease: EASE });
  const scale = useTransform(progress, [from, to], [0.5, 1], { ease: EASE });

  return (
    <motion.g style={{ opacity, scale }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        transform={`rotate(${rotate} ${cx} ${cy})`}
        fill="white"
        stroke={`url(#${gradient})`}
        strokeWidth="2"
      />
    </motion.g>
  );
}

/** The gradient every station is stroked with, top #FEBC22 → bottom #FFD400. */
function StationGradient({
  id,
  cx,
  cy,
  r,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
}) {
  return (
    <linearGradient
      id={id}
      x1={cx}
      y1={cy - r - 1}
      x2={cx}
      y2={cy + r + 1}
      gradientUnits="userSpaceOnUse"
    >
      <stop stopColor="#FEBC22" />
      <stop offset="1" stopColor="#FFD400" />
    </linearGradient>
  );
}

/*
 * Both routes were exported at the 390px design width and are drawn at their
 * natural size, cropped by the section's edges. `xMidYMid slice` is the SVG
 * spelling of the `object-cover` the <Image> used to do, so the framing — and
 * the stations' circularity — is unchanged on any screen.
 */
const SVG_CLASS = "absolute inset-0 h-full w-full";
const SVG_FIT = "xMidYMid slice";

/**
 * The unlit part of the route — the track the signal has yet to reach.
 *
 * Walked up from the design's #AFAFAF (2.19:1 against white) through #C4C4C4
 * and #D4D4D4 to here. #E5E5E5 is Tailwind's neutral-200 and the grey the
 * inactive pagination dots elsewhere on the page are already drawn in, so the
 * faintest thing on screen is at least one consistent value rather than two
 * near-misses.
 *
 * Named because both routes draw it: as two literals the pair drifted apart
 * once already — the upper route's grey tail was left without an explicit
 * stroke width and rendered at half the weight of everything around it.
 *
 * At 1.26:1 this is deliberately at the edge of visible, and that is a choice
 * with a cost worth stating: the unlit track is what the yellow reads *against*,
 * so on a dim or glare-lit screen the draw now lands closer to a line appearing
 * out of nothing than to one filling in. It is defensible only because both
 * SVGs are `aria-hidden` and carry nothing the copy does not — no information
 * is lost if a reader never resolves the grey at all. Do not reuse this value
 * for anything load-bearing, which would need 3:1.
 */
const ROUTE_GREY = "#E5E5E5";

/**
 * Upper route — enters at the subheading and sweeps down to the right.
 *
 * Grey and yellow share one path, as the lower route does, so the signal runs
 * the whole line and the route finishes fully lit. Figma exported the yellow
 * truncated at 331,258 — 394.5 of grey's 486.8 units, 81% — which left the last
 * five segments grey no matter how far you scrolled: not a route still being
 * drawn but one that stopped short. The lead now comes purely from the
 * timeline, which is where it was already coming from for most of the draw.
 */
function UpperRoute({ progress }: { progress: MotionValue<number> }) {
  const uid = useId().replace(/:/g, "");
  const a = `${uid}-a`;
  const b = `${uid}-b`;

  const grey = useDraw(progress, GREY);
  const yellow = useDraw(progress, YELLOW);

  const D =
    "M-2.99825 121.684L7.65755 129.585L9.89719 127.666L35.5405 114.981L76.0936 125.134L154.454 180.312L224.941 208.17L231.846 205.349L272.092 208.798L274.014 205.602L278.68 204.7L281.806 207.441L292.788 211.192L325.734 259.608L331.23 258.769L348.062 278.411L354.258 279.295L357.319 282.866L384.816 304.982L404.487 309.804";

  return (
    <svg
      viewBox="0 0 390 432"
      fill="none"
      preserveAspectRatio={SVG_FIT}
      aria-hidden="true"
      focusable="false"
      className={SVG_CLASS}
    >
      <motion.path
        d={D}
        stroke={ROUTE_GREY}
        // Explicit, like every other route stroke on the page. Left off, this
        // one fell back to SVG's default width of 1 and drew half as heavy as
        // the yellow it continues from — and as both of the lower route's
        // strokes — so the grey tail read as a different, lighter line rather
        // than the same route carrying on.
        strokeWidth="2"
        strokeLinecap="round"
        style={grey}
      />
      <motion.path
        d={D}
        stroke="#FFD400"
        strokeWidth="2"
        strokeLinecap="round"
        style={yellow}
      />

      {/* In route order — the signal reaches 62,122 well before 203,199. */}
      <Station
        cx={62.0521}
        cy={122.05}
        r={4}
        rotate={-130.595}
        gradient={b}
        progress={progress}
        range={stopWindow(YELLOW, UPPER_STOPS[0])}
      />
      <Station
        cx={203.079}
        cy={199.257}
        r={4}
        rotate={-130.595}
        gradient={a}
        progress={progress}
        range={stopWindow(YELLOW, UPPER_STOPS[1])}
      />

      <defs>
        <StationGradient id={a} cx={203.079} cy={199.257} r={4} />
        <StationGradient id={b} cx={62.0521} cy={122.05} r={4} />
      </defs>
    </svg>
  );
}

/**
 * Lower route — rises from the bottom-left and exits right. Here grey and
 * yellow share identical path data, so the lead comes purely from the timeline.
 */
function LowerRoute({ progress }: { progress: MotionValue<number> }) {
  const uid = useId().replace(/:/g, "");
  const a = `${uid}-a`;
  const b = `${uid}-b`;

  const grey = useDraw(progress, GREY);
  const yellow = useDraw(progress, YELLOW);

  const D =
    "M-6.90919 283.029L4.53728 271.849L24.4306 250.882L35.9117 241.674L41.9109 238.888L42.4278 233.877L71.8024 201.747L79.629 199.703L93.9718 189.862L111.074 199.414L136.451 206.615L160.586 203.359L186.582 185.521L235.954 138.34L267.777 125.152L307.668 97.7812L330.836 65.2539L341.732 65.7606L381.622 38.3894L392.828 39.3483";

  return (
    // 283 tall rather than 253, and the element is allowed to hang the extra 30
    // below its box.
    //
    // The path's own start is (-6.90919, 283.029) — off the left edge and below
    // the bottom one. A 253-unit frame cut that last stretch off, so the line
    // had to enter through the bottom edge about 22 units in rather than
    // reaching the left side. Taking the frame down to the path's real extent
    // puts the descent back on screen.
    //
    // Deliberately *not* a pan of the existing window: the route sits ~8 units
    // under the copy above it by design, so shifting it up to make room drives
    // it straight through "…the view from the train."
    //
    // Nothing about the route moves. viewBox width and the y origin are
    // unchanged, and at the 390 design width the box and the viewBox still
    // match 1:1, so the scale, the stations' radii and every coordinate land
    // exactly where they did. The 30 extra units fall into the padding added at
    // the foot of the section, and the positioning box this route's scroll
    // timeline measures keeps its 253px — so the draw is untouched.
    <svg
      viewBox="0 0 390 283"
      fill="none"
      preserveAspectRatio={SVG_FIT}
      aria-hidden="true"
      focusable="false"
      className="absolute inset-x-0 top-0 h-[283px] w-full"
    >
      <motion.path
        d={D}
        stroke={ROUTE_GREY}
        strokeWidth="2"
        strokeLinecap="round"
        style={grey}
      />
      <motion.path
        d={D}
        stroke="#FFD400"
        strokeWidth="2"
        strokeLinecap="round"
        style={yellow}
      />

      <Station
        cx={136.47}
        cy={205.164}
        r={4.52491}
        rotate={-46.2817}
        gradient={a}
        progress={progress}
        range={stopWindow(YELLOW, LOWER_STOPS[0])}
      />
      <Station
        cx={268.319}
        cy={124.841}
        r={4.52491}
        rotate={-46.2817}
        gradient={b}
        progress={progress}
        range={stopWindow(YELLOW, LOWER_STOPS[1])}
      />

      <defs>
        <StationGradient id={a} cx={136.47} cy={205.164} r={4.52491} />
        <StationGradient id={b} cx={268.319} cy={124.841} r={4.52491} />
      </defs>
    </svg>
  );
}

export default function SectionTwo() {
  // Each route is timed off its own frame, so the draw always plays while the
  // line is on screen. The refs go on the positioning boxes, which never carry
  // a transform — only the paths inside them animate — so measuring them stays
  // stable while the route draws.
  const upperRef = useRef<HTMLDivElement>(null);
  const lowerRef = useRef<HTMLDivElement>(null);
  const upperProgress = useViewportProgress(upperRef, ROUTE_OFFSET);
  const lowerProgress = useViewportProgress(lowerRef, ROUTE_OFFSET);

  return (
    // `relative z-0` opens a stacking context here so the lines' negative
    // z-index resolves inside the section: they paint above its white
    // background but behind all of the copy. (`isolate` alone is not enough —
    // the background still wins.)
    // pb-[30px]: the lower route hangs 30px past its positioning box so its
    // descent off the bottom-left stays on screen. Without this the overflow
    // would land on the next section, whose own white background paints after
    // this one and would cover it.
    <div className="relative z-0 bg-white px-6 pb-[30px]">
      {/* pt-[120px] */}
      <Reveal className="pt-20 text-navy-1 text-center font-sans text-5xl font-semibold tracking-1px leading-[105%]">
        One continent.
        <br />
        All yours to
        <br />
        figure out.
      </Reveal>
      <Reveal
        blur={5}
        className="text-center text-navy-1 font-sans mt-2.5 text-base leading-[126%] tracking-[0.16px]"
      >
        Get to know Europe on a deeper
        <br />
        level when you travel by rail.
      </Reveal>
      {/* gap-[60px] */}
      <div className="relative mt-[100px] grid grid-cols-1 gap-20">
        {/* Upper line — enters at the subheading and sweeps down to the right,
            passing above the first two copy blocks. Anchored to the copy stack
            (not the section top) so it holds if the headline rewraps; -230px is
            the Figma gap between the line's frame and the first block. */}
        <div
          ref={upperRef}
          aria-hidden
          className="pointer-events-none absolute -left-6 -right-6 -top-[213px] -z-10 h-[432px]"
        >
          <div className="relative mx-auto h-full w-full max-w-md">
            <UpperRoute progress={upperProgress} />
          </div>
        </div>

        {/* The statements sit along the route, so timing each to its own
            entrance reproduces the route order without hard-coding it. */}
        {STACK.map((item, index) => {
          // Each statement settles in from the edge it is aligned to, so the
          // reveal reads off the layout rather than being applied on top of it.
          let align = "justify-self-start";
          let from: "left" | "center" | "right" = "left";
          if (index === 1) {
            align = "justify-self-center";
            from = "center";
          }
          if (index === 2) {
            align = "justify-self-end";
            from = "right";
          }
          return (
            <Reveal
              key={index}
              html={item}
              from={from}
              className={`text-navy-1 font-sans text-base font-normal tracking-16 leading-[125%] ${align}`}
            />
          );
        })}
      </div>

      {/* Lower line — rises from the bottom-left to just under the last copy
          block and exits right. Kept in flow so it reserves the 210px the Figma
          leaves below the copy for it to sweep through, and so its bottom edge
          stays pinned to the section's, which is how the asset is cropped.
          -43px is the overlap its frame has with that block in the design. */}
      <div
        ref={lowerRef}
        aria-hidden
        className="pointer-events-none relative -z-10 -mx-6 -mt-[43px] h-[253px]"
      >
        <div className="relative mx-auto h-full w-full max-w-md">
          <LowerRoute progress={lowerProgress} />
        </div>
      </div>
    </div>
  );
}
