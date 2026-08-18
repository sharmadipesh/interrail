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
 *
 * Both pairs are listed in route order, so the lower one now reads right-hand
 * stop first: its path is drawn back to front (see LowerRoute) and a fraction is
 * measured from whichever end the draw starts at. Reversing a polyline leaves
 * its length alone — still 503.7 units — and only flips which end a point is
 * measured from, so these are exactly the old fractions taken from 1:
 * 0.686 → 0.314 and 0.369 → 0.631.
 */
const UPPER_STOPS = [0.148, 0.482] as const;
const LOWER_STOPS = [0.314, 0.631] as const;

/** How long a station takes to bloom once the signal arrives. */
const DWELL = 0.09;

/**
 * The pulse a station keeps up once it has arrived: its white centre fills with
 * brand yellow and drains back out.
 *
 * One property, and fill rather than opacity. The dot's white centre is what
 * masks the route passing underneath it, so anything that fades the marker lets
 * the line show through and reads as the route briefly healing over the stop.
 * Fill never costs that — the disc stays fully opaque throughout and only
 * changes colour, so the stop always sits *on* the line rather than dissolving
 * into it.
 *
 * The lit colour is the route's own #FFD400 (brand.yellow), not a new accent, so
 * the stop reads as the signal arriving in it. Only the centre moves: the ring
 * keeps its #FEBC22 → #FFD400 gradient stroke, which is what stops the dot
 * disappearing into the line at the top of the pulse — at full fill it is a
 * yellow disc still outlined against yellow.
 *
 * ── Why there is a hold in the middle ───────────────────────────────────────
 *
 * As a plain three-keyframe sweep the fill only *passed through* #FFD400, for a
 * single frame out of ninety-odd, and spent the rest of the cycle in the cream
 * midtones between it and white. The dot never actually looked like the line —
 * it looked like a washed-out version of it.
 *
 * Repeating the lit colour is what fixes that. Framer spaces keyframes evenly
 * when it is not told otherwise, so [white, lit, lit, white] puts the fill at
 * the line's exact yellow across the whole middle third of the cycle — 0.73s of
 * actually being that colour, rather than an instant of crossing it.
 *
 * The hold is spelled as a repeated keyframe rather than with a `times` array
 * simply because it needs no second mechanism: even spacing already puts the
 * hold where a `times` of [0, 0.33, 0.67, 1] would.
 *
 * Either side of the hold is 0.73s of easeInOut, so the fill arrives at and
 * leaves the line's colour at zero velocity and the loop has no corner in it
 * anywhere. 2.2s total, up from 1.6s — the same travel over more time is the
 * whole of what makes it gentler. Still far outside the 3Hz threshold that makes
 * flashing an accessibility problem.
 */
const STATION_FILL = "#FFFFFF";
const STATION_FILL_LIT = "#FFD400";
const PULSE_SECONDS = 2.2;

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
 *
 * Two groups, not one: the outer carries the scroll-driven bloom as MotionValues
 * on `style`, the inner carries the time-driven fill pulse. Keeping the pulse off
 * the `<circle>` is the point of the split — a motion component on the circle
 * lets Framer write a CSS transform, and CSS transform beats the presentation
 * attribute, so the rotate() above would be silently dropped and every station's
 * gradient would swing round with it. The circle stays inert; the group animates.
 *
 * The circle inherits its fill rather than declaring one, which is what lets the
 * group drive it. The group carries a static `fill` too, so the marker is white
 * in the server-rendered HTML and under reduced motion instead of falling back
 * to SVG's default black.
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

  // A marker that never stops moving is the thing a reader who asked for less
  // motion asked to be rid of, so under reduced motion the dot simply rests
  // white. The bloom is already neutralised upstream — useViewportProgress pins
  // progress at 1 — so dropping the loop here is all that is left to do.
  const reduce = useReducedMotion();

  return (
    <motion.g style={{ opacity, scale }}>
      <motion.g
        // `initial` is not decoration. Once `fill` appears in `animate` Framer
        // owns the attribute and renders it from its own state, so a plain
        // `fill=` prop here is swallowed rather than used as the base — it
        // writes the string "undefined", which is not a colour, and the circle
        // falls back to the `fill="none"` it inherits from the <svg>. The dot
        // goes hollow and the route runs straight through it. Naming the start
        // colour here is what gives Framer something to interpolate from, and
        // it is what lands in the prerendered HTML.
        initial={{ fill: STATION_FILL }}
        // A plain `animate`, deliberately, and not `whileInView`. Gating the
        // loop on visibility would be the tidier-sounding thing, but it puts an
        // IntersectionObserver on an SVG <g> — an element with no CSS box — and
        // that is exactly the sort of dependency that fails on one engine and
        // leaves the stations mysteriously dead. Framer parks the loop itself
        // when the page stops painting, off screen or in a background tab.
        animate={
          reduce
            ? { fill: STATION_FILL }
            : {
                // Four keyframes, not three, and the repeat is the point: the
                // middle pair is the hold at the line's colour. Evenly spaced —
                // see the note on `times` above.
                fill: [
                  STATION_FILL,
                  STATION_FILL_LIT,
                  STATION_FILL_LIT,
                  STATION_FILL,
                ],
              }
        }
        transition={{
          duration: PULSE_SECONDS,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          transform={`rotate(${rotate} ${cx} ${cy})`}
          stroke={`url(#${gradient})`}
          strokeWidth="2"
        />
      </motion.g>
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
 * Lower route — enters at the top right and runs back down to the bottom-left.
 * Here grey and yellow share identical path data, so the lead comes purely from
 * the timeline.
 *
 * It draws against the reading direction on purpose, and the only thing that
 * makes it do so is the order the vertices are listed in: `pathLength` always
 * fills from a path's `M`, so putting `M` on what Figma exported as the final
 * point is the whole mechanism. Nothing is mirrored, rotated or moved.
 */
function LowerRoute({ progress }: { progress: MotionValue<number> }) {
  const uid = useId().replace(/:/g, "");
  const a = `${uid}-a`;
  const b = `${uid}-b`;

  const grey = useDraw(progress, GREY);
  const yellow = useDraw(progress, YELLOW);

  // The Figma export's twenty vertices, listed back to front: the same points,
  // the same segments between them, and therefore the same line on screen —
  // only walked from (392.828, 39.3483) to (-6.90919, 283.029) instead of the
  // other way round. A polyline is direction-agnostic as geometry, so this is a
  // reversal of the traversal, not of the shape.
  const D =
    "M392.828 39.3483L381.622 38.3894L341.732 65.7606L330.836 65.2539L307.668 97.7812L267.777 125.152L235.954 138.34L186.582 185.521L160.586 203.359L136.451 206.615L111.074 199.414L93.9718 189.862L79.629 199.703L71.8024 201.747L42.4278 233.877L41.9109 238.888L35.9117 241.674L24.4306 250.882L4.53728 271.849L-6.90919 283.029";

  return (
    // 283 tall rather than 253, and the element is allowed to hang the extra 30
    // below its box.
    //
    // The path's far end is (-6.90919, 283.029) — off the left edge and below
    // the bottom one. A 253-unit frame cut that last stretch off, so the line
    // met the bottom edge about 22 units in rather than reaching the left side.
    // Taking the frame down to the path's real extent puts the descent back on
    // screen — and now that the draw ends there rather than starting there, it
    // is the stretch the line finishes on.
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

      {/* In route order — drawing right-to-left, the signal now reaches
          268,125 first and 136,205 second. */}
      <Station
        cx={268.319}
        cy={124.841}
        r={4.52491}
        rotate={-46.2817}
        gradient={b}
        progress={progress}
        range={stopWindow(YELLOW, LOWER_STOPS[0])}
      />
      <Station
        cx={136.47}
        cy={205.164}
        r={4.52491}
        rotate={-46.2817}
        gradient={a}
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
    // pb-[30px]
    <div className="relative z-0 bg-white px-6">
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

      {/* Lower line — sweeps in from the right, just under the last copy block,
          and runs down to the bottom-left. Kept in flow so it reserves the
          210px the Figma leaves below the copy for it to sweep through, and so
          its bottom edge stays pinned to the section's, which is how the asset
          is cropped.
          -43px is the overlap its frame has with that block in the design. */}
      {/* overflow-x-clip contains the rotation below. Turning a 375x253 box 12
          degrees swings its corners about 28px past each side of the viewport,
          which is page-level horizontal overflow — the whole document gains a
          sideways scroll. This box is already exactly viewport-wide (-mx-6
          cancels the section's px-6), so clipping to it cuts only what was off
          screen anyway.

          `clip`, not `hidden`, and only on the x axis: `hidden` would force the
          other axis to `auto` and start clipping vertically too, and the route
          is *meant* to hang past this box — the SVG is 283px tall in a 253px
          frame so its descent off the bottom-left stays on screen. `clip` pairs
          with `visible`, so the vertical bleed survives untouched. */}
      <div
        ref={lowerRef}
        aria-hidden
        className="pointer-events-none relative -z-10 -mx-6 -mt-[43px] h-[253px] overflow-x-clip"
      >
        <div className="relative mx-auto h-full w-full max-w-md rotate-12">
          <LowerRoute progress={lowerProgress} />
        </div>
      </div>
    </div>
  );
}
