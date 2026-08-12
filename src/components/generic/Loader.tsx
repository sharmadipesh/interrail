"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { cubicBezier, motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * The brand line, set as one continuous run.
 *
 * The 41 spaces are the design's own: they push "Effect" to the far end of the
 * 496px line and leave the hollow in the middle that "SINCE 1959" sits in.
 * Written as an explicit repeat rather than typed out, so no formatter can
 * quietly collapse the run and slide "Effect" back down the column.
 */
const HEADLINE = `The Interrail${" ".repeat(41)}Effect`;

const SINCE = "SINCE 1959";

/**
 * Departure Mono's tracking is applied after the final glyph too, so a centred
 * run sits half a letter-space left of where it belongs. Cancelling it with an
 * equal left padding is the same fix SectionThree uses on this exact string.
 */
const SINCE_TRACKING = "14.1375px";

/* ------------------------------------------------------------------ *
 * Geometry — every figure is column-relative
 *
 * The column is the design's own 25.527 × 496px group. Working inside it rather
 * than against the 844px artboard is what keeps the composition centred on any
 * viewport, and it means the marker's stop and the plate's centre are the same
 * number rather than two numbers that have to be kept in agreement.
 * ------------------------------------------------------------------ */

/** "SINCE 1959" sits 118.07px down the column and runs 192px. */
const SINCE_TOP = 118.07;
const SINCE_H = 192;
/** Dead centre of that band — where the signal comes to rest. */
const SINCE_MID = SINCE_TOP + SINCE_H / 2;

/** The marker is 10px, so its box stops half a marker above the band's centre. */
const MARKER = 10;
const MARKER_STOP = SINCE_MID - MARKER / 2;

/**
 * Where the two words' glyphs actually start and finish in the column.
 *
 * Measured with a Range over each run in the rendered wordmark, not estimated.
 * The earlier figures — 111 and 355 — were both out by about 18px, and it is
 * worth being precise here because the line has to meet these edges exactly.
 */
const EFFECT_END = 93.11;
const INTERRAIL_TOP = 336.93;

/**
 * The shared centre line, taken from the year's glyphs rather than any box.
 *
 * Three different centres are in play: the 22px band's box centre is 14.52, the
 * wordmark's ink sits on 12.59, and "SINCE 1959" — being all caps and figures,
 * which ride above the em centre — inks on 14.36. The marker comes to rest
 * inside the band, so that is where a misalignment is actually seen: at 12 it
 * sat 2.36px left of the year and read as off-centre against the plate.
 *
 * The line has to share the axis or the marker would step off its own path on
 * the way down. Referred to the wordmark that leaves the line 1.77px off, but
 * the line meets those words end-on across a 21px mass of ink, where it does
 * not show — the dot on a 22px plate does.
 */
const AXIS = 14.36;
const TRACE_W = 2;

/**
 * The route line — two segments, one either side of the year.
 *
 * The hollow between the two words is 93 → 337, and the SINCE band takes
 * 118.07 → 310.07 of it, so only about 25px at each end is free.
 *
 * A single line spanning the hollow lays 96px of yellow rule straight across the
 * year, and because the year is set rotated, a vertical rule reads as a
 * horizontal strike through "1959". Painting it behind the type does not help:
 * the glyphs stop being sliced, but the line is still plainly crossing them for
 * the third of a second before the plate opens.
 *
 * So the line stops at the band and picks up again underneath it. The marker
 * covers the gap alone and comes to rest on the year — the route runs into the
 * station, the station lights up, the route leaves. Nothing crosses the type,
 * and the two segments come out within a pixel of the same length.
 */
const TRACE_A_TOP = EFFECT_END - 1;
const TRACE_A_H = SINCE_TOP - TRACE_A_TOP;

/** Both ends stop flush against the words — a pixel inside, so they read as
 *  growing out of the type rather than floating in the gap beneath it. */
const TRACE_B_TOP = SINCE_TOP + SINCE_H;
const TRACE_B_H = INTERRAIL_TOP - TRACE_B_TOP;

/** Pacing waypoint, not a boundary: where the marker hands over from its
 *  accelerating fall to the eased run-in. */
const MARKER_RUNIN = 111;

/**
 * Far enough above the column to clear the top of any viewport up to ~1980px
 * tall. The marker is transparent until it is well inside the frame, so on a
 * taller screen than that it still only appears once it has arrived.
 */
const MARKER_START = -620;

/* ------------------------------------------------------------------ *
 * Motion system
 * ------------------------------------------------------------------ */

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);
/** Symmetric in-out, for the curtain — it has to leave as evenly as it arrives. */
const EASE_CURTAIN = cubicBezier(0.76, 0, 0.24, 1);

/** Marker travel: 0.10s → 1.12s, arriving at the stop around 0.90s. */
const MARKER_DELAY = 0.1;
const MARKER_DUR = 1.02;

/** The signal reaching the year: 0.88s → 1.28s. */
const ACTIVATE_DELAY = 0.88;
const ACTIVATE_DUR = 0.4;

/** Curtain, in seconds and in ms for the orchestrator's fallback. */
export const LOADER_EXIT_MS = 650;
/** Hold, then hand off. The homepage starts moving at this mark, not after it. */
export const LOADER_REVEAL_MS = 1300;
/** Reduced motion gets a single static frame and an immediate handoff. */
const REDUCED_REVEAL_MS = 150;

const curtain: Variants = {
  rest: { y: 0 },
  play: { y: 0 },
  exit: {
    y: "-100%",
    transition: { duration: LOADER_EXIT_MS / 1000, ease: EASE_CURTAIN },
  },
};

/** Reduced motion never moves the curtain — it just stops covering the page. */
const curtainReduced: Variants = {
  rest: { opacity: 1 },
  play: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "linear" } },
};

/**
 * The wordmark is uncovered top to bottom — the same direction the signal
 * travels — so the column reads as being written by the marker's descent rather
 * than as a caption that happens to fade in.
 */
const wordmark: Variants = {
  rest: { opacity: 0, y: 18, clipPath: "inset(0% 0% 100% 0%)" },
  play: {
    opacity: 1,
    y: 0,
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 0.68, delay: 0.1, ease: EASE },
  },
};

/**
 * Travel. Keyframed rather than sprung: the marker covers 700px before it
 * covers the last 120, and a single spring over that distance either overshoots
 * the station or crawls the approach. Three segments — accelerate in from
 * offscreen, ease down into the stop, hold.
 */
const markerTravel: Variants = {
  rest: { y: MARKER_START, opacity: 0 },
  play: {
    y: [MARKER_START, MARKER_RUNIN, MARKER_STOP, MARKER_STOP],
    opacity: 1,
    transition: {
      y: {
        duration: MARKER_DUR,
        delay: MARKER_DELAY,
        times: [0, 0.45, 0.78, 1],
        ease: ["easeIn", EASE, "linear"],
      },
      opacity: { duration: 0.3, delay: 0.3, ease: "linear" },
    },
  },
  /** Carries on the way it was going while the curtain lifts. */
  exit: {
    y: MARKER_STOP + 130,
    opacity: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

/**
 * Scale rides its own layer so the entrance and the arrival pulse never fight
 * the travel for the transform. One pulse, at the stop, and it settles at 1.
 */
const markerScale: Variants = {
  rest: { scale: 0.7 },
  play: {
    scale: [0.7, 1, 1, 1.08, 1],
    transition: {
      duration: MARKER_DUR,
      delay: MARKER_DELAY,
      times: [0, 0.24, 0.78, 0.88, 1],
      ease: EASE,
    },
  },
};

/**
 * Both segments draw downward, in the marker's direction of travel.
 *
 * The approach lands at 0.90s — the moment the marker reaches its stop — so the
 * signal still appears to be drawing the line ahead of itself. It covers 26px in
 * 0.40s where the old single draw covered 122 in 0.34, about 65px/s against 360,
 * and that alone is most of the extra smoothness.
 *
 * The departure leaves as the plate opens, so the line emerges from under a band
 * that is already lighting up, and is home at 1.26 — a beat before the 1.30
 * handoff rather than racing it.
 */
const TRACE_A_DELAY = 0.5;
const TRACE_A_DUR = 0.4;
const TRACE_B_DELAY = 0.9;
const TRACE_B_DUR = 0.36;

const traceIn: Variants = {
  rest: { scaleY: 0 },
  play: {
    scaleY: 1,
    transition: { duration: TRACE_A_DUR, delay: TRACE_A_DELAY, ease: EASE },
  },
};

const traceOut: Variants = {
  rest: { scaleY: 0 },
  play: {
    scaleY: 1,
    transition: { duration: TRACE_B_DUR, delay: TRACE_B_DELAY, ease: EASE },
  },
};

/**
 * The plate opens from its own centre — which is the marker's resting point —
 * so the year lights up outward from the signal rather than being wiped past.
 */
const plate: Variants = {
  rest: { scaleY: 0 },
  play: {
    scaleY: 1,
    transition: { duration: ACTIVATE_DUR, delay: ACTIVATE_DELAY, ease: EASE },
  },
};

/** The white copy opens on the same centre, on the same curve, in the same box. */
const whiteSince: Variants = {
  rest: { clipPath: "inset(50% 0% 50% 0%)" },
  play: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: ACTIVATE_DUR, delay: ACTIVATE_DELAY, ease: EASE },
  },
};

/**
 * The Interrail intro.
 *
 * A branded title card, not a progress indicator: it waits for nothing, reports
 * nothing, and is gone inside two seconds. It calls `onReveal` as the curtain
 * starts to lift rather than after it has gone, so the homepage underneath
 * animates into the handoff instead of finishing invisibly behind it.
 *
 * Everything hangs off one centred 25.527 × 496px column — the group the design
 * is built around — rather than off the artboard's own 844px height, so the
 * composition stays centred on any viewport. Below ~640px of height the whole
 * column scales down as a unit; nothing is ever distorted.
 */
export default function Loader({ onReveal }: { onReveal?: () => void }) {
  const reduce = !!useReducedMotion();

  /**
   * Fires exactly once. The ref, not the timer, is the guard: Strict Mode
   * mounts twice, and a fallback higher up may beat this timer to it.
   */
  const revealed = useRef(false);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    const wait = reduce ? REDUCED_REVEAL_MS : LOADER_REVEAL_MS;
    const timer = window.setTimeout(() => {
      if (revealed.current) return;
      revealed.current = true;
      onRevealRef.current?.();
    }, wait);

    return () => window.clearTimeout(timer);
  }, [reduce]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      variants={reduce ? curtainReduced : curtain}
      initial={reduce ? "play" : "rest"}
      animate="play"
      exit="exit"
      // h-[100dvh] rather than the inset-derived height: on iOS the dynamic
      // viewport is the one that matches what the user actually sees.
      className="fixed inset-0 z-[60] h-[100dvh] w-full overflow-hidden bg-white"
      data-node-id="1522:14559"
    >
      <span className="sr-only">Loading Interrail.</span>

      {/* The column. 0.24px off centre is the design's own nudge.
          The scale steps are mutually exclusive ranges, so their order in the
          generated stylesheet cannot decide which one wins. The underscores are
          load-bearing: Tailwind turns them into the spaces CSS requires around
          `and`, and without them the whole at-rule is invalid and dropped. */}
      <div
        aria-hidden
        className="absolute left-[calc(50%-0.24px)] top-1/2 h-[496px] w-[25.527px] -translate-x-1/2 -translate-y-1/2 [@media(max-height:380px)]:scale-[0.54] [@media(max-height:480px)_and_(min-height:381px)]:scale-[0.64] [@media(max-height:579px)_and_(min-height:481px)]:scale-[0.82]"
      >
        {/* Wordmark — reads bottom to top out of its own 496px line. The
            wrapper holds the rotated box's footprint; the line inside keeps
            its unrotated 496 × 24.354px so the rotation lands on the column. */}
        <motion.div
          variants={wordmark}
          className="absolute left-0 top-0 flex h-[496px] w-[24.354px] items-center justify-center"
        >
          <p className="h-[24.354px] w-[496px] flex-none -rotate-90 whitespace-pre font-sans text-[27.387px] font-semibold leading-[27.387px] tracking-[-0.5706px] text-brand-yellow">
            {HEADLINE}
          </p>
        </motion.div>

        {/* Route trace — 2px, on the marker's own axis. Two segments that stop
            either side of the year rather than one rule crossing it; see the
            geometry note above for why the middle has to stay clear. */}
        <motion.span
          variants={traceIn}
          style={{
            top: TRACE_A_TOP,
            height: TRACE_A_H,
            left: AXIS - TRACE_W / 2,
            width: TRACE_W,
          }}
          className="absolute block origin-top bg-brand-yellow"
        />
        <motion.span
          variants={traceOut}
          style={{
            top: TRACE_B_TOP,
            height: TRACE_B_H,
            left: AXIS - TRACE_W / 2,
            width: TRACE_W,
          }}
          className="absolute block origin-top bg-brand-yellow"
        />

        {/* Navy "SINCE 1959" — the resting state, and the bottom of the three
            stacked layers. It is never animated or faded: the plate above it
            covers it, which is why the two copies can never drift apart. */}
        <div className="absolute left-[3.53px] top-[118.07px] flex h-[192px] w-[22px] items-center justify-center">
          <p
            style={{ letterSpacing: SINCE_TRACKING, paddingLeft: SINCE_TRACKING }}
            className="flex-none -rotate-90 whitespace-nowrap text-center font-departure text-[10.098px] leading-[21.111px] text-navy-1"
          >
            {SINCE}
          </p>
        </div>

        {/* The plate, opening from the marker's resting point outward. */}
        <motion.span
          variants={plate}
          className="absolute left-[3.53px] top-[118.07px] block h-[192px] w-[22px] bg-brand-yellow"
        />

        {/* White "SINCE 1959" — same box, same centre, same curve as the plate,
            so the year changes colour without ever crossfading through a blur. */}
        <motion.div
          variants={whiteSince}
          className="absolute left-[3.53px] top-[118.07px] flex h-[192px] w-[22px] items-center justify-center"
        >
          <p
            style={{ letterSpacing: SINCE_TRACKING, paddingLeft: SINCE_TRACKING }}
            className="flex-none -rotate-90 whitespace-nowrap text-center font-departure text-[10.098px] leading-[21.111px] text-white"
          >
            {SINCE}
          </p>
        </motion.div>

        {/* The signal. Travel and scale are separate layers — one transform
            each — so the arrival pulse cannot disturb the descent. */}
        <motion.span
          variants={markerTravel}
          style={{ left: AXIS - MARKER / 2 }}
          className="absolute top-0 block size-[10px]"
        >
          <motion.span variants={markerScale} className="block size-full">
            <Image
              src="/images/loader-stop.svg"
              alt=""
              width={10}
              height={10}
              unoptimized
              priority
              className="block size-full"
            />
          </motion.span>
        </motion.span>
      </div>
    </motion.div>
  );
}
