"use client";

import { useEffect, useRef } from "react";
import {
  cubicBezier,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type MotionStyle,
} from "framer-motion";

/**
 * One curve for everything scrubbed in this section — scale, rise and opacity
 * alike. This is the "smooth like butter" one.
 *
 * The page's usual `cubicBezier(0.22, 1, 0.36, 1)` is a hard ease-out, and it
 * is the wrong tool for scroll-driven motion: as a cubic bezier its slope at
 * t=0 is y1/x1 = 1 / 0.22 = 4.55, so it dumps most of its travel into the first
 * few pixels of scroll and then crawls the rest. Pinned to a wheel that reads
 * as a lurch followed by a drag, not as an ease — the same objection the drawn
 * routes elsewhere on the page raise about easing a scrubbed value at all.
 *
 * This starts and ends at exactly zero velocity and peaks at 1.83 against that
 * curve's 4.08. Nothing jumps when you first touch the wheel and nothing stops
 * dead when it lands; the motion only ever accelerates and decelerates.
 *
 * It replaces a separate fade curve too. That one was `(0.45, 0, 0.55, 1)`,
 * picked for exactly the same reason — gentle at both ends so opacity never
 * front-loads — and it turns out to be this curve to three decimal places: an
 * identical 1.831 peak. Two names for one shape is just something else to keep
 * in agreement, so there is now one.
 */
const EASE_SILK = cubicBezier(0.42, 0, 0.58, 1);

const HEADING = ["Staying", "curious"];

// The middle four letters are white so they read out of the portrait clip
// sitting behind them; "S" and the year stay navy on the white background.
const SINCE = "SINCE 1959";
const WHITE_FROM = 1;
const WHITE_TO = 4;

/* ------------------------------------------------------------------ *
 * Motion system — "Pop in place"
 *
 * Each clip simply appears: it scales up from 0.84 out of its own centre and
 * resolves. That is the whole gesture.
 *
 * Nothing here is derived from where a clip sits. A scale about the centre has
 * no direction in it at all — the clip does not come from the right because it
 * happens to be on the right, or from the left because it is on the left. Both
 * pop the same way; only their timing differs, and that is what makes the pair
 * read as one beat rather than as two edges of the layout taking turns.
 *
 * No mask, no wipe, no drift, no travel. The frame is at its final coordinates
 * from the first frame to the last, and every value rests at exactly scale 1.
 * ------------------------------------------------------------------ */

/**
 * Lenis already smooths the wheel with a 0.75s easeOutExpo, so this spring is
 * not the thing making the scroll smooth — it only takes the residual step out
 * of an already-smoothed signal.
 *
 * Natural frequency √(150/0.4) = 19.4 rad/s and damping ratio
 * 21 / (2·√(150 · 0.4)) = 1.36 — over-damped, so it physically cannot
 * overshoot. That last part is what keeps a pop from turning into a bounce:
 * the scale arrives at 1 and stays there.
 *
 * Softened about 16% from 180/22/0.35 as part of making this glide. The spring
 * is what takes the micro-jitter out of the wheel, so a little more of it reads
 * as smoother — but only a little. An earlier 120/20/0.45 was slack enough that
 * the composition visibly trailed the scroll, and lag reads as lag, not as
 * smoothness. This sits well clear of that.
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
 * The section is 150svh and the stage pins for the middle of it. With the
 * timeline anchored `["start 0.5", "end end"]` the whole 0 → 1 spans
 * 1.5 - 1 + 0.5 = 1.0 viewport; the pin engages at 0.5 / 1.0 = 0.50 and
 * releases at 1.0 — sticky lets go the instant the section's bottom meets the
 * viewport's, so progress 1 *is* the release.
 *
 * The clips pop from 0.26, before the pin engages, so they land as the section
 * is settling rather than after it has stopped. The reader is never held in
 * front of a composition that is doing nothing.
 */
const STAYING: Range = [0.05, 0.2];
const CURIOUS: Range = [0.1, 0.25];

/**
 * The two pops, each now spread over 0.26 of the timeline — about 219px of
 * scroll, up from 152px.
 *
 * Widening the window is half of what makes this glide. The same travel over
 * more scroll is simply slower, and velocity is what the eye reads as
 * roughness: the peak rate of change drops from 5.4 to 1.3 thousandths of scale
 * per pixel, a little over 4× gentler, without the pop losing its shape.
 *
 * The portrait follows 0.08 behind — under a third of a window, so the two
 * still read as one beat with a little syncopation rather than as two events.
 */
const LANDSCAPE: Range = [0.26, 0.52];
const PORTRAIT: Range = [0.34, 0.6];

/**
 * How small each clip starts.
 *
 * 0.84 rather than 0.80. Trimming the travel is the other half of the glide —
 * peak velocity scales directly with it — but only a little, because the size
 * of this pop is the part that was working. 0.16 of scale is still four times
 * the 0.04 that read as too polite earlier; it is now simply delivered over
 * half again as much scroll, on a curve that never spikes.
 *
 * A centre-anchored scale cannot move the clip: the centre is a fixed point of
 * the transform and the value rests at exactly 1, so the finished composition
 * is the absolute left/right/top the design specifies, to the pixel.
 */
const POP_FROM = 0.84;

/**
 * Opacity resolves over the first 65% of the pop rather than all of it, so the
 * clip is solid slightly before it finishes growing. A scale that is still
 * fading while it lands reads as a dissolve; a scale that is already opaque
 * while it lands reads as an object arriving.
 */
const LANDSCAPE_FADE: Range = [0.26, 0.429];
const PORTRAIT_FADE: Range = [0.34, 0.509];

/**
 * The tagline waits on the portrait clip, but far less than it used to.
 *
 * Four of its ten characters — the "INCE" of SINCE — are white, and they are
 * only legible because the portrait sits behind them. Their ink runs from 57 to
 * about 161px across the column and the clip rests at 0 to 159, so they are
 * backed at rest.
 *
 * What makes this variation different from the sliding one is that its clips
 * never travel: the portrait is at its final x from the first frame and only
 * grows into place. The right edge is therefore never further left than
 * `159 - (1-scale)·159/2` — 146px at the pop's smallest, so at worst the last
 * 15px of the white run is unbacked, not the whole of it. What gates the
 * tagline here is the clip being *opaque*, and PORTRAIT_FADE has that done by
 * 0.509.
 *
 * 0.62 was well clear of that and read as an afterthought: the pop had finished
 * and settled before the line began. 0.48 lets it climb alongside the portrait
 * instead, and modelling the fade against the clip's real scale and opacity
 * puts the worst perceived gap at 2.2px — identical to what 0.62 produced,
 * because 2.2px is simply the permanent overhang of the final "E" past the
 * clip's edge, present at rest in every variant.
 *
 * The window is also 0.18 rather than 0.16, which spends the extra room the
 * earlier start buys: 158px of scroll instead of 140, so the fade resolves
 * about 12% more gently rather than merely sooner.
 */
const TAGLINE: Range = [0.48, 0.66];
// 0.78 → 1.00 is deliberately empty. The completed composition holds, then
// scrolls away with the page when sticky releases — nothing fades or scales
// out, which is what keeps the hand-off to SectionFour from feeling abrupt.

/**
 * Headline entrance. Two words, one phrase: `curious` opens at 0.10, a third of
 * the way into `Staying`'s window, and that overlap is what binds them.
 *
 * No blur. A filter on 86px type is both the most expensive thing this section
 * could animate per frame and the one most likely to leave the type looking
 * soft on the frames either side of the transition.
 */
const HEADING_Y = 28;
const HEADING_SCALE = 0.97;

/**
 * The stage's padding, in normal document flow.
 *
 * The pinned original carried these same two values in its `NO_PIN_STAGE`
 * fallback — the branch it switched to under reduced motion and on viewports
 * too short to pin. This component is that layout unconditionally, so the media
 * queries that selected it are gone and the spacing is simply always on.
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
 * clips resting at 80 and 354, section 684.45px. If either padding changes,
 * this changes with it or the animation starts in the wrong place.
 */
const HEADING_TOP = 28 + 118;

/**
 * Where the heading sits, as a share of the viewport, when the timeline opens.
 *
 * 0.9 is 90% from the top — 10% above the fold — so the timeline opens as the
 * heading's first line crosses into view. This is the one number to move if the
 * entrance should start earlier or later; everything below is expressed against
 * it and follows automatically.
 *
 * Opening this late costs nothing and gains twice. The heading is 205px tall,
 * so at 90% its lower half is still under the fold when "Staying" starts — but
 * it is fully on screen by 14% into the timeline at an 844px viewport, and its
 * own reveal does not finish until 25%, so the part a reader actually watches
 * happens in full view. Meanwhile the later trigger lengthens the runway, which
 * is what makes the pop calmer rather than more hurried.
 */
const HEADING_AT = 0.9;

/**
 * How the timeline is anchored with nothing pinned.
 *
 * The pinned original's `["start 0.5", "end end"]` was calibrated against its
 * pin: at 150svh the whole 0 → 1 spans exactly one viewport. Unpinned the
 * section collapses to its content — a fixed 684px — and that same offset would
 * span `684 - 0.5·vh`: 262px at 844 tall, and negative past 1368px, where the
 * timeline would have no length at all.
 *
 * The opening anchor is a point *inside* the section, not its top edge, and
 * that distinction is the whole of it.
 *
 * `start 0.9` would put the section's top at 90% of the viewport — but the
 * heading is not at the section's top. It sits 146px down it, behind the
 * stage's `pt-7` and the composition's `py-[118px]`, so `start 0.9` would open
 * the timeline with the heading at 90% *plus* 146px, and by a different amount
 * at every viewport height because the 146 is fixed while the 90% is not. The
 * anchor it replaces was worse still: it opened with the heading around 132%
 * down, so the pop was already a third spent before the heading was on screen.
 *
 * framer resolves an edge given in px against the target rather than the
 * viewport (`resolveEdge` handles "px" | "%" | "vw" | "vh"), so `"146px 0.9"`
 * reads as: progress 0 when the point 146px into the section meets 90% of the
 * viewport. That is the heading's own top, at 90%, exactly — 600px tall or
 * 1400px tall, the same.
 *
 * `end 0.5` closes the timeline as the section's bottom reaches mid-viewport.
 * Span works out at `0.4·vh + 538`: 778px at 600 tall to 1098px at 1400, and
 * that is what keeps this smooth. Pinned, this variation ran over exactly one
 * viewport — 844px on a phone — and the pop's ranges were spaced for that.
 * 876px here is within 4% of it, so the motion keeps the rate it was tuned at:
 * peak scale change is 1.29 thousandths per pixel of scroll against the pin's
 * 1.34, and on a 600px-tall screen it is a third gentler than the pin was.
 *
 * The later the trigger, the longer this span becomes — the runway is whatever
 * lies between the heading arriving and the section clearing the top, so a
 * heading that starts lower has further to travel. Moving from 80% to 90% added
 * 84px of it at 844, which is why the pop eased rather than tightened.
 */
const FLOW_OFFSET = [`${HEADING_TOP}px ${HEADING_AT}`, "end 0.5"] as const;

/**
 * A clip popping into place: scale out of its own centre, and an opacity that
 * lands a little ahead of it.
 *
 * Scale and opacity both ride curves that are flat at either end, so the clip
 * neither jumps when the pop begins nor stops dead when it lands. There is
 * nothing else — no translation on either axis, which is the point: the moment
 * a transform carries an x or a y, the clip acquires a direction, and a
 * direction on an absolutely-positioned element inevitably reads as "it came
 * from the side it sits on".
 */
function usePop(
  progress: MotionValue<number>,
  [from, to]: Range,
  fade: Range,
): MotionStyle {
  const scale = useTransform(progress, [from, to], [POP_FROM, 1], {
    ease: EASE_SILK,
  });
  // Spread rather than passed through: `Range` is readonly and useTransform
  // takes a mutable input range.
  const opacity = useTransform(progress, [...fade], [0, 1], {
    ease: EASE_SILK,
  });
  return { scale, opacity };
}

/**
 * Copy settling into place: opacity and a short rise, with a whisper of scale
 * for the headline. Holds once revealed.
 *
 * On the same silk curve as the clips, deliberately. The headline used to rise
 * on EASE, which front-loads its travel into the first pixels of scroll — next
 * to clips that now glide, that difference is exactly the sort of thing that
 * reads as one element being less finished than another.
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
    ease: EASE_SILK,
  });
  const y = useTransform(progress, [from, to], [distance, 0], {
    ease: EASE_SILK,
  });
  const scale = useTransform(progress, [from, to], [scaleFrom, 1], {
    ease: EASE_SILK,
  });
  return scaleFrom === 1 ? { opacity, y } : { opacity, y, scale };
}

/**
 * A muted, looping clip that pops into place.
 *
 * One element and one transform, because that is all this needs now — the
 * video fills the frame exactly, so there is no overscan to hide and nothing
 * moving inside the box.
 *
 * Playback is driven by the section's single observer rather than one of its
 * own: both clips are inside the same pinned stage and are therefore on screen
 * together, so a second observer would only ever agree with the first. Starting
 * before the pops is the point — by the time a clip appears the video is
 * already running, so it never shows a poster handing over to a first frame.
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
  /** The pop. Scale and opacity only — never a translation. */
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
      // will-change is carried only while the section is on screen — framer
      // does not manage it for values passed through `style`, so leaving it off
      // would mean no hint at all, and hard-coding it would leave promoted
      // layers alive for the whole page.
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

export default function SectionThree() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // One timeline for the whole section, anchored to its own crossing of the
  // viewport rather than to a pin's engage and release — see FLOW_OFFSET.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: [...FLOW_OFFSET],
  });
  const smoothed = useSpring(scrollYProgress, SPRING);

  // Reduced motion pins the timeline at its end rather than branching the
  // render, so every transform below resolves to its finished value — heading
  // in place, both clips at scale 1, tagline set — through the identical code
  // path. No pop, nothing to reverse. The extended scroll distance is removed
  // in CSS, not here.
  const settled = useMotionValue(1);
  const reduce = useReducedMotion();
  const progress = reduce ? settled : smoothed;

  /**
   * The section's only observer. It gates video playback and the will-change
   * hints, and it changes state twice per pass — on entry and on exit — rather
   * than per frame, so nothing here puts React on the scroll path.
   */
  const active = useInView(stageRef, { amount: 0.25 });

  const landscape = usePop(progress, LANDSCAPE, LANDSCAPE_FADE);
  const portrait = usePop(progress, PORTRAIT, PORTRAIT_FADE);

  // Grouped, not per-character: at this tracking a character flick reads as
  // noise against the clip behind it. The white/navy split is untouched.
  const tagline = useSettle(progress, TAGLINE, 14, 1);

  return (
    // Three things made the pin and all three are gone: the section's
    // `h-[150svh]`, the stage's `sticky top-0` with `min-h-[100svh]`, and the
    // offset anchored to the pin's engage and release. The section is now its
    // content's height and scrolls past like any other.
    //
    // `overflow-x: clip` stays — it still guards the column's right-hand bleed,
    // and clip, unlike hidden, does not create a scroll container.
    //
    // stageRef stays on the stage too. It drives the section's single observer
    // for video playback and the will-change hints, which has nothing to do
    // with pinning and would silently stop both if it were dropped.
    <section
      ref={sectionRef}
      className="relative overflow-x-clip bg-white px-6"
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

          {/* Landscape clip — upper right, bleeding 6px past the column edge. */}
          <Clip
            src="/images/section-2-1.mp4"
            poster="/images/section-2.2.png"
            label="Friends together on a train crossing Europe"
            className="left-[46.49%] right-[-1.76%] top-[52px] aspect-[1280/720]"
            style={landscape}
            active={active}
          />

          {/* Portrait clip — lower left, sitting behind the tagline. */}
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
