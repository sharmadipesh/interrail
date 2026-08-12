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

// The tagline waits: its middle letters sit on top of the portrait clip, so it
// resolves once that clip is home.
const TAGLINE: Range = [0.62, 0.78];
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

export default function SectionThreeV2() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // One timeline for the whole section. `start 0.5` opens it as the stage's
  // centre reaches the fold; `end end` closes it exactly as sticky releases.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.5", "end end"],
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
    // `overflow-x: clip` rather than hidden — clip does not create a scroll
    // container, so it can guard the column's right-hand bleed without
    // stealing the scrollport that `position: sticky` below resolves against.
    <section
      ref={sectionRef}
      className={`relative h-[150svh] overflow-x-clip bg-white px-6 ${NO_PIN_SECTION}`}
    >
      <div
        ref={stageRef}
        className={`sticky top-0 flex min-h-[100svh] items-center ${NO_PIN_STAGE}`}
      >
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
