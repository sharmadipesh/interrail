"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/**
 * The travel curve, and why it is the page's hard ease-out rather than a gentle
 * one.
 *
 * On a scrubbed value a front-loaded curve normally reads as a lurch — that is
 * exactly the objection the drawn routes elsewhere raise, and why the pop in V2
 * uses a symmetric curve instead. Here the opposite is true, because of where
 * the travel happens: opacity reaches 1 at 31% of the x window, and by that
 * point this curve has already covered 84.4% of the distance. All the speed is
 * spent while the clip is still off-screen and transparent. What a reader
 * actually sees is the last 9.4vw, delivered over the remaining 69% of the
 * window — a long, decelerating glide into place.
 *
 * That is the "strong initial responsiveness, progressively softer
 * deceleration" this entrance is after, and it is also what keeps the movement
 * calm on a wide screen: measured, the visible glide runs 0.15 px/px at 390px
 * and 0.54 px/px at 1440px, against 2.36 px/px for the travel as a whole.
 */
const EASE_TRAVEL = cubicBezier(0.22, 1, 0.36, 1);

/**
 * Everything that is *seen* resolving — scale, lift, opacity, and all of the
 * copy — moves on this instead.
 *
 * Gentle at both ends: its slope is zero at t=0 and t=1, peaking at 1.83
 * against EASE_TRAVEL's 4.08. Nothing jumps when a range opens and nothing
 * stops dead when it closes. It is the curve V2 settled on for the same reason,
 * kept here so the two variations speak with one accent.
 */
const EASE_SETTLE = cubicBezier(0.42, 0, 0.58, 1);

const HEADING = ["Staying", "curious"];

// The middle four letters are white so they read out of the portrait clip
// sitting behind them; "S" and the year stay navy on the white background.
const SINCE = "SINCE 1959";
const WHITE_FROM = 1;
const WHITE_TO = 4;

/* ------------------------------------------------------------------ *
 * Motion system — "Opposing tracks"
 *
 * The two clips arrive on parallel lines running in opposite directions: the
 * landscape in from the right, the portrait answering from the left, both
 * scrubbed by one scroll timeline so they are demonstrably the same gesture
 * rather than two animations that happen to be adjacent.
 *
 * Only transforms move. Every clip keeps the design's absolute left/right/top
 * for the whole sequence and every value resolves to exactly x 0 / y 0 /
 * scale 1 / opacity 1, so the finished composition is the design's, to the
 * pixel.
 * ------------------------------------------------------------------ */

/**
 * How far out each clip starts, as a share of the viewport.
 *
 * Driven through a CSS variable rather than baked into the transform, because
 * the right distance is not the same in every layout mode and a custom property
 * is the one lever a media query can pull without putting React on the scroll
 * path.
 *
 * 60vw is the figure. Measured against the real layout, a clip needs to clear
 * 53.1vw (landscape, at 390px) and 49.2vw (portrait, at 1440px) to start fully
 * off-screen; 60vw clears both at every width tested with a few vw to spare.
 * Note this is deliberately *not* reduced on small screens — travel scales with
 * viewport width while the scroll timeline scales with viewport height, so a
 * phone is the calmest case here, not the busiest, and trimming the distance
 * there would only leave the landscape peeking into frame before it sets off.
 *
 * It *is* reduced to zero wherever the pin is inapplicable — see NO_PIN_STAGE.
 * Un-pinned, the whole timeline collapses to about 384px of scroll, which would
 * drive 820px of travel through a 111px window: 7.4px of movement per pixel
 * scrolled. In that mode the clips simply resolve in place.
 *
 * The default is carried by the `var()` fallback rather than declared on the
 * section, and that is load-bearing. Declaring it inline puts it at inline
 * specificity, which no class-based media query can override — the un-pinned
 * rule below then silently loses and the long slide runs anyway. Leaving the
 * property unset until a media query sets it means there is no contest.
 */
const TRAVEL_VAR = "--v3-travel";
const TRAVEL = "60vw";

/**
 * Lenis already smooths the wheel with a 0.75s easeOutExpo, so this spring is
 * not the thing making the scroll smooth — it only takes the residual step out
 * of an already-smoothed signal.
 *
 * Natural frequency √(150/0.4) = 19.4 rad/s, damping ratio
 * 21 / (2·√(150 · 0.4)) = 1.36. Over-damped, so it cannot overshoot: the clips
 * cannot sail past their final position and come back, which on a long
 * horizontal track is the single most obvious way this could look cheap.
 *
 * Deliberately tighter than it might otherwise be, for a reason specific to
 * long travel: the spring smooths *progress*, so a given progress error becomes
 * more visible the further the clip has to move. A softer setting that is
 * imperceptible on a 30px settle turns into tens of pixels of trailing here.
 * A slacker 120/20/0.45 was tried in this section and read as the composition
 * chasing the wheel.
 *
 * restDelta is not cosmetic — the default 0.01 is a full 1% of a 0 → 1 progress
 * range, so the spring stops short of its target and snaps the last step.
 */
const SPRING = {
  stiffness: 150,
  damping: 21,
  mass: 0.4,
  restDelta: 0.0001,
} as const;

type Range = readonly [number, number];

/**
 * The section is 190svh and the stage pins for the middle of it. With the
 * timeline anchored `["start 0.5", "end end"]` the whole 0 → 1 spans
 * 1.9 - 1 + 0.5 = 1.4 viewports; the pin engages at 0.5 / 1.4 = 0.357 and
 * releases at 1.0 — sticky lets go the instant the section's bottom meets the
 * viewport's, so progress 1 *is* the release. That leaves 90svh of pinned
 * travel.
 *
 * 190svh is held rather than tuned, and not only because it is a comfortable
 * length: SectionFour's own entrance is written against it. Its intro carries a
 * -12% bottom margin with the comment that "SectionThree's sticky stage
 * releases exactly as this section's top reaches the viewport bottom", which is
 * a statement about this height and this offset. Changing either would quietly
 * move a beat in the next section.
 *
 * 0.00 → 0.07 is left empty so the section arrives out of SectionTwo's lower
 * route and is simply allowed to be there before anything in it starts.
 */
const STAYING: Range = [0.07, 0.2];
const CURIOUS: Range = [0.12, 0.25];
// 0.25 → 0.31 is the held beat: the headline is set and readable, and it has
// the composition to itself before either clip is on its way.

/**
 * The two tracks.
 *
 * The portrait sets off at 0.39, 28% into the landscape's window, and the two
 * overlap for 0.21 of the timeline — the landscape is still decelerating into
 * place for most of the portrait's run. That overlap is the whole point: it is
 * what makes the second clip read as an answer to the first rather than as its
 * own event. Equal window lengths (0.29 each) keep their momentum matched.
 */
const LANDSCAPE: Range = [0.31, 0.6];
const PORTRAIT: Range = [0.39, 0.68];

/**
 * Opacity finishes well before the travel does — at 31% of each window — so the
 * clip is fully tangible for the whole of its visible glide and is never a
 * ghost sliding into position. It is also what hides the fast part of the
 * travel: see EASE_TRAVEL.
 */
const LANDSCAPE_FADE: Range = [0.31, 0.4];
const PORTRAIT_FADE: Range = [0.39, 0.49];

/**
 * The tagline waits on the portrait clip, and this is how long it actually has
 * to wait.
 *
 * Four of its ten characters — the "INCE" of SINCE — are white, and they are
 * only legible because the portrait clip sits behind them. Measured against the
 * rendered composition, their ink runs from 57 to about 161px across the
 * column, and the clip rests at 0 to 159. So they are backed at rest — but the
 * clip arrives from the *left*, which means its right edge reaches them only
 * near the end of its own travel, and later on a wide screen than a narrow one
 * because the travel is measured in vw:
 *
 *   390px wide   backed from p=0.540
 *   768px        p=0.563
 *   1024px       p=0.571
 *   1440px       p=0.581   <- the constraint
 *
 * Resolve the tagline before that and the failure is not a flash: white type on
 * a white page is simply absent, so the line reads "S···1959" with a hole in it
 * while the navy characters fade up around it.
 *
 * 0.64 was clear of that by a wide margin and read as an afterthought — the
 * clips had finished and settled before it began. 0.54 is the earliest start
 * that is still safe: the fade is only 7.1% resolved at p=0.581, faint enough
 * that the gap cannot be read, and from there it climbs with the portrait
 * rather than after it. Below this it stops being safe — 0.52 would be 24%
 * opaque with the letters still unbacked.
 *
 * The window is 0.22 rather than the 0.18 it started at, and the extra room
 * goes into the fade rather than being banked. The curve needed nothing: this
 * line already resolves on EASE_SETTLE, flat at both ends and peaking at 1.83
 * against a hard ease-out's 4.08, so unlike the centre-split variation's it was
 * never switching on. Length was the only lever left, and it pays three ways at
 * once — the fade runs over 211px of scroll instead of 173, which is 18%
 * gentler; the line is 7.1% opaque when the clip finishes backing the white
 * letters instead of 10.7%, widening the margin on the constraint above; and
 * the dead tail after it shrinks from 28% of the timeline to 24%.
 *
 * Past this it stops paying. The white letters cannot be substantially visible
 * before 0.581 whatever the window, so stretching further would only delay the
 * point where the line reads as present — which is what was wrong with 0.64.
 */
const TAGLINE: Range = [0.54, 0.76];
// 0.76 → 1.00 is deliberately empty. The completed composition holds and then
// simply scrolls on with the page — nothing fades or scales out, which is what
// keeps the hand-off to SectionFour from feeling abrupt.

/**
 * The settle each clip carries alongside its travel: a whisper of scale and a
 * short lift, both resolving over the full window on the gentle curve, so the
 * clip is still coming to rest through the visible part of its glide rather
 * than arriving and stopping.
 *
 * A lift is safe here in a way it was not in V2. Nothing is masked in this
 * variation — the clip is a solid box and the video fills it exactly — so
 * moving the frame moves the whole thing and there is no inside to expose.
 */
const LANDSCAPE_SCALE = 0.97;
const PORTRAIT_SCALE = 0.965;
const LANDSCAPE_LIFT = 8;
const PORTRAIT_LIFT = 10;

/**
 * Headline entrance. Two words, one phrase: `curious` opens at 0.12, 38% into
 * `Staying`'s window, and that overlap is what binds them.
 *
 * No blur. A filter on 86px type is both the most expensive thing this section
 * could animate per frame and the one most likely to leave the type looking
 * soft on the frames either side of the transition.
 */
const HEADING_Y = 24;
const HEADING_SCALE = 0.985;

/**
 * The stage's padding, in normal document flow.
 *
 * SectionThreev3 carries these same two values in its `NO_PIN_STAGE` fallback —
 * the branch it already switches to under reduced motion and on viewports too
 * short to pin. This component is that layout unconditionally.
 */
const STAGE = "pt-7 pb-[158px]";

/**
 * How far the heading's top sits below the section's, in px.
 *
 * Two paddings stand between them and nothing else: the stage's `pt-7` (28px)
 * and the composition column's `py-[118px]`. Both are fixed px in the design,
 * so this does not move with the viewport — which is what lets the trigger
 * below be exact at every height rather than approximately right at one.
 *
 * Measured against the rendered section to confirm: heading top at 146px,
 * clips resting at 80 and 354, section 684.45px.
 */
const HEADING_TOP = 28 + 118;

/**
 * Where the heading sits, as a share of the viewport, when the timeline opens.
 *
 * 0.9 is 90% from the top — 10% above the fold — so the timeline opens as the
 * heading's first line crosses into view. The one number to move if the
 * entrance should start earlier or later.
 */
const HEADING_AT = 0.9;

/**
 * Where the travel is switched off. This is the half of the original's
 * `NO_PIN_SECTION` that has nothing to do with pinning, so it survives intact.
 *
 * The reason it applies at short viewports has changed, though, and the old one
 * no longer holds: it used to be that un-pinning collapsed the timeline to
 * ~384px, which drove 820px of slide through a 111px window. With the offset
 * below the timeline is a healthy 894px even at 600px tall, so the slide would
 * now pace fine there. It stays off because the composition is genuinely
 * cramped on a short screen — 684px of content against 600px of viewport — and
 * a 60vw traverse across it reads as busy rather than as depth.
 *
 * Reduced motion keeps it for the obvious reason.
 */
const TRAVEL_OFF =
  "motion-reduce:[--v3-travel:0px] [@media(max-height:600px)]:[--v3-travel:0px]";

/**
 * How the timeline is anchored with nothing pinned.
 *
 * v3's `["start 0.5", "end end"]` is calibrated against its pin: at 190svh the
 * whole 0 → 1 spans 1.4 viewports. Unpinned the section collapses to its
 * content — a fixed 684px — and that offset would span `684 - 0.5·vh`: 262px at
 * 844 tall, and negative past 1368px, where it would have no length at all.
 *
 * The opening anchor is a point *inside* the section, not its top edge.
 *
 * `start 0.9` would put the section's top at 90% of the viewport — but the
 * heading is not at the section's top. It sits 146px down it, behind the
 * stage's `pt-7` and the composition's `py-[118px]`, so `start 0.9` would open
 * the timeline with the heading at 90% *plus* 146px, and by a different amount
 * at every viewport height because the 146 is fixed while the 90% is not. The
 * anchor it replaces opened with the heading around 132% down — the clips were
 * already setting off before the heading they answer to was on screen.
 *
 * framer resolves an edge given in px against the target rather than the
 * viewport (`resolveEdge` handles "px" | "%" | "vw" | "vh"), so `"146px 0.9"`
 * reads as: progress 0 when the point 146px into the section meets 90% of the
 * viewport. That is the heading's own top, at 90%, exactly, at any height.
 *
 * ── Why this one closes at 0.4 and its two siblings close at 0.5 ────────────
 *
 * Span here is `0.5·vh + 538`: 838px at 600 tall to 1238px at 1400. The other
 * unpinned variants end at 0.5 and take `0.4·vh + 538`, and copying that here
 * would have been the tidy thing to do and the wrong one.
 *
 * This variation is the only one whose travel is measured in vw while its
 * timeline is measured in px, so shortening the span speeds the slide up in a
 * way a scale or a fade would not feel. The number that matters is the visible
 * glide — the last 9.4vw, after the front-loaded curve has spent 84.4% of the
 * distance off-screen behind opacity 0. Measured at 1440x900, the widest case
 * that still slides:
 *
 *   pinned                 0.54 px/px
 *   end 0.5, as siblings   0.75 px/px   <- 39% quicker than pinned
 *   end 0.4, as here       0.68 px/px
 *
 * 0.4 gives back the ~90px of span the later trigger costs, and holds the glide
 * exactly where it already was. Consistency between the three files is worth
 * less than the two of them moving at the same speed.
 */
const FLOW_OFFSET = [`${HEADING_TOP}px ${HEADING_AT}`, "end 0.4"] as const;

/**
 * A clip riding one of the two tracks.
 *
 * `direction` is +1 for a clip that comes in from the right and -1 for one that
 * comes in from the left; it is multiplied into the shared travel distance, so
 * the pair is guaranteed to start equally far out and to move at matched
 * speeds. The x template always emits a `calc()` of the same custom property,
 * including at rest, so there is no unit change for the compositor to resolve
 * as the value lands on zero — and at rest the multiplier is exactly 0, which
 * makes the product exactly 0 whatever the variable holds.
 *
 * Travel is on the front-loaded curve; scale, lift and opacity are on the
 * gentle one. That split is the effect: the distance is eaten early and out of
 * sight, while everything the eye can actually track resolves smoothly.
 */
function useTrack(
  progress: MotionValue<number>,
  [from, to]: Range,
  fade: Range,
  direction: 1 | -1,
  scaleFrom: number,
  lift: number,
): MotionStyle {
  const offset = useTransform(progress, [from, to], [direction, 0], {
    ease: EASE_TRAVEL,
  });
  const x = useMotionTemplate`calc(var(${TRAVEL_VAR}, ${TRAVEL}) * ${offset})`;
  const y = useTransform(progress, [from, to], [lift, 0], {
    ease: EASE_SETTLE,
  });
  const scale = useTransform(progress, [from, to], [scaleFrom, 1], {
    ease: EASE_SETTLE,
  });
  // Spread rather than passed through: `Range` is readonly and useTransform
  // takes a mutable input range.
  const opacity = useTransform(progress, [...fade], [0, 1], {
    ease: EASE_SETTLE,
  });
  return { x, y, scale, opacity };
}

/**
 * Copy settling into place: opacity and a short rise, with a whisper of scale
 * for the headline. Holds once revealed.
 *
 * A caller asking for no scale gets no `scale` at all rather than an animated
 * `1`. The identity transform is invisible but not free — it still writes a
 * transform every frame it is scrubbed, which on the tagline buys nothing.
 */
function useSettle(
  progress: MotionValue<number>,
  [from, to]: Range,
  distance: number,
  scaleFrom: number,
): MotionStyle {
  const opacity = useTransform(progress, [from, to], [0, 1], {
    ease: EASE_SETTLE,
  });
  const y = useTransform(progress, [from, to], [distance, 0], {
    ease: EASE_SETTLE,
  });
  const scale = useTransform(progress, [from, to], [scaleFrom, 1], {
    ease: EASE_SETTLE,
  });
  return scaleFrom === 1 ? { opacity, y } : { opacity, y, scale };
}

/**
 * A muted, looping clip that rides in on one of the tracks.
 *
 * Playback is driven by the section's single observer rather than one of its
 * own. That is not just economy: a per-clip observer would judge intersection
 * on the element *while it is parked 60vw off-stage*, so each video would stay
 * paused until it had almost arrived and would then hand its poster over to a
 * first frame in full view. Gated on the section instead, both are already
 * running before either sets off.
 */
function Clip({
  src,
  poster,
  label,
  className,
  style,
  active,
}: {
  src: string;
  poster: string;
  label: string;
  /** Absolute placement + aspect ratio for this clip's slot. */
  className: string;
  /** The track: x, lift, scale and opacity. Never a layout property. */
  style: MotionStyle;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      // A rejected play() is normal (a tab restored in the background, a
      // policy that declined it) and is not something the page can act on.
      const p = v.play();
      if (p) p.catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);

  return (
    <motion.div
      style={style}
      // will-change is carried only while the section is on screen. Framer does
      // not manage it for values passed through `style` — it is applied for
      // animation targets only, and then only when the global hook is
      // configured — so leaving it off would mean no hint at all, and
      // hard-coding it would leave two promoted layers alive for the whole page.
      className={`absolute overflow-hidden ${
        active ? "will-change-[transform,opacity]" : ""
      } ${className}`}
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

/**
 * Layout, not passive, and only on the client.
 *
 * The swap it drives has to land before the browser paints, or a reader with
 * Reduce Motion enabled sees one frame of the un-started composition — both
 * clips off-stage and transparent — before everything snaps to its finished
 * state. Falls back to useEffect on the server, where neither one runs and
 * React would otherwise warn about the layout variant. The same shape the
 * homepage uses for its intro decision.
 */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const style = useSettle(progress, range, HEADING_Y, HEADING_SCALE);
  return (
    <motion.span style={style} className="block">
      {word}
    </motion.span>
  );
}

export default function SectionThreeV3Unpinned() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // One timeline for the whole section, anchored to its own crossing of the
  // viewport rather than to a pin's engage and release — see FLOW_OFFSET.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: [...FLOW_OFFSET],
  });
  // One spring, on the shared progress rather than on each value. Both clips
  // therefore read the identical smoothed signal and cannot drift out of step
  // with each other or with the copy, which is what separate springs per
  // property would eventually do.
  const smoothed = useSpring(scrollYProgress, SPRING);

  /**
   * Reduced motion pins the timeline at its end rather than branching the
   * render, so every transform below resolves to its finished value — heading
   * in place, both clips home at x 0, tagline set — through the identical code
   * path. The extended scroll distance and the travel distance are both removed
   * in CSS, not here.
   *
   * `hydrated` is what keeps that swap legal. `useReducedMotion` reads the
   * media query *during render* — it is `useState(prefersReducedMotion.current)`
   * over a ref that `initPrefersReducedMotion()` fills on first call, and the
   * module's own comment notes it "Returns `null` server-side". So on a machine
   * with Reduce Motion enabled it returns true on the client's very first
   * render while the server rendered null. Branching straight off it would hand
   * React a different `style` attribute than the server sent — the server
   * emitting `opacity:0; translateX(…*1); scale(0.97)` against a client that
   * wants `opacity:1; translateX(…*0); scale(1)` — and React does not patch
   * attribute mismatches.
   *
   * Gated on mount, the first client render is identical to the server's
   * whatever the media query says, and the swap happens in the commit
   * immediately after — before paint, via the layout effect, so Reduce Motion
   * still gets the instant, un-animated composition it asks for rather than a
   * flash of the un-started one.
   *
   * Worth knowing what this is *not*: it did not cause the hydration error seen
   * during development, which was a stale dev bundle — the server was still
   * rendering the previous variation's `h-[150svh]` and `scale(0.84)` against a
   * client that had this one. That is cured by restarting the dev server, not
   * in code. This guard is for the real, quieter case.
   */
  const settled = useMotionValue(1);
  const reduce = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  useIsoLayoutEffect(() => setHydrated(true), []);
  const progress = hydrated && reduce ? settled : smoothed;

  /**
   * The section's only observer, and it drives playback and the will-change
   * hints — never the timeline. It changes state twice per pass, on entry and
   * on exit, so nothing here puts React on the scroll path.
   */
  const active = useInView(stageRef, { amount: 0.25 });

  const landscape = useTrack(
    progress,
    LANDSCAPE,
    LANDSCAPE_FADE,
    1,
    LANDSCAPE_SCALE,
    LANDSCAPE_LIFT,
  );
  const portrait = useTrack(
    progress,
    PORTRAIT,
    PORTRAIT_FADE,
    -1,
    PORTRAIT_SCALE,
    PORTRAIT_LIFT,
  );
  // Grouped, not per-character: at this tracking a character flick reads as
  // noise against the clip behind it. The white/navy split is untouched.
  const tagline = useSettle(progress, TAGLINE, 14, 1);

  return (
    // Three things made the pin and all three are gone: the section's
    // `h-[190svh]`, the stage's `sticky top-0` with `min-h-[100svh]`, and the
    // offset anchored to the pin's engage and release.
    //
    // `overflow-x: clip` is doing more work here than in the other two: it is
    // what holds both clips while they are parked 60vw off-stage, so without it
    // this variation puts a horizontal scrollbar on the page. Still clip rather
    // than hidden, which would create a scroll container.
    //
    // The travel distance is *only ever* declared by the media queries in
    // TRAVEL_OFF, which zero it. The default lives in the `var()` fallback
    // rather than being set here: an inline style outranks every class rule, so
    // publishing 60vw on this element made that override unreachable.
    //
    // stageRef stays. It drives the section's single observer for video
    // playback and the will-change hints — nothing to do with pinning, and
    // dropping it would silently stop both.
    <section
      ref={sectionRef}
      className={`relative overflow-x-clip bg-white px-6 ${TRAVEL_OFF}`}
    >
      <div ref={stageRef} className={STAGE}>
        <div
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

          {/* Landscape clip — upper right, bleeding 6px past the column edge.
              Comes in from the right. */}
          <Clip
            src="/images/section-2-1.mp4"
            poster="/images/section-2.2.png"
            label="Friends together on a train crossing Europe"
            className="left-[46.49%] right-[-1.76%] top-[52px] aspect-[1280/720]"
            style={landscape}
            active={active}
          />

          {/* Portrait clip — lower left, sitting behind the tagline. Answers
              from the left. */}
          <Clip
            src="/images/section-2-2.mp4"
            poster="/images/section-2.1.png"
            label="A traveller with a bike at golden hour"
            className="left-0 right-[53.51%] top-[326px] aspect-[720/900]"
            style={portrait}
            active={active}
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
        </div>
      </div>
    </section>
  );
}
