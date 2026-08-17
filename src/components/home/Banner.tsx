"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const HEADLINE = ["Next stop:", "Somewhere", "in Europe"];

/* ------------------------------------------------------------------ *
 * Background video
 *
 * The poster is a separate overlay rather than the <video poster> attribute,
 * and that is deliberate twice over. It is what lets the image stay up until a
 * real frame has been presented — the attribute hands control of that moment to
 * the browser — and it keeps the hero on the one optimised image next/image
 * already serves. Pointing `poster` at /images/banner.png would fetch the raw
 * 751KB PNG a second time, on top of the copy the page has already loaded.
 * ------------------------------------------------------------------ */

const VIDEO_SRC = "/videos/output.mp4";

/**
 * Legibility scrim, and the reason the copy survives the footage.
 *
 * This is the brand yellow — its hue, at the lightness a scrim can actually be.
 * #FFD400 is HSL(50°, 100%, 50%); #292200 is HSL(50°, 100%, 8%), the same hue
 * and saturation taken down to where it can carry white text. The brand colour
 * itself cannot: its relative luminance is 0.684, so white on it is 1.43:1
 * against the 4.5:1 the subheading needs, and a yellow wash behind a yellow CTA
 * would leave the button nothing to stand out from.
 *
 * Darkened this far it reads as a golden-hour shadow rather than a dimmer —
 * warm where navy was cool, and unmistakably out of the same palette. Over
 * sunset interiors it deepens the ambers already in the footage instead of
 * fighting them.
 *
 * The stops are measured, not judged by eye, and they are aimed at where the
 * copy actually sits rather than spread evenly down the frame. Against the real
 * layout the headline occupies 33–49% of the hero and the subheading 54–62%;
 * above and below that there is nothing to protect, because the navbar carries
 * its own opaque pill and the CTA is an opaque yellow block.
 *
 * That is what lets this be as light as it is. Sampling 40 frames across the
 * clip — cropped to what `object-cover` actually shows on a phone — the least
 * scrim that holds 3:1 under the headline is 0.38 and 4.5:1 under the
 * subheading is 0.56, at the 95th percentile of brightness. The stops sit just
 * over both and fall away everywhere else, so the picture is only dimmed where
 * a sentence is standing on it: 3.5:1 at the headline, 4.5:1 at the subheading.
 *
 * An earlier pass ran 0.40 → 0.80 top to bottom and was simply too heavy — it
 * was carrying the bottom of the frame at 0.80 to protect a button that is
 * opaque, and the top at 0.40 to protect nothing at all.
 *
 * Gold is not as dark as navy at the same opacity — the green channel carries
 * 0.7152 of the luminance weight and this hue is mostly green and red — so
 * these numbers run a little higher than an equivalent navy would.
 */
const SCRIM =
  "linear-gradient(180deg," +
  " rgba(41,34,0,0.22) 0%," +
  " rgba(41,34,0,0.42) 38%," +
  " rgba(41,34,0,0.60) 62%," +
  " rgba(41,34,0,0.64) 100%)";

/**
 * What the scrim drops to when the poster is the thing on screen — which is the
 * whole time before the video is ready, and any time it stalls back.
 *
 * The hero is meant to look the way it did before there was a video at all, and
 * at this strength it very nearly does: 0.15 and 0.20 of gold under the two
 * blocks of copy, over a still whose mean luminance is 0.081. On an image that
 * dark it is barely a tint.
 *
 * Not zero, though, and this is the one place the "exactly as before" reading is
 * knowingly not taken. Bare, the poster puts the headline at 2.32:1 and the
 * subheading at 2.25:1 — the bright window behind the silhouette runs straight
 * under both lines. That is presumably why this component shipped with a pair of
 * legibility gradients written and commented out. A third of the scrim lifts
 * them to about 3.1:1 while staying invisible; set this to 0 for the literal
 * original at that cost.
 */
const POSTER_SCRIM = 0.35;

/**
 * Seconds of buffer ahead of the playhead before playback counts as safe.
 *
 * The clip is 20s at 628kbps, so three seconds is about 235KB of runway —
 * enough that a brief dip in throughput is absorbed rather than becoming a
 * visible stall, without making a healthy connection wait around.
 */
const MIN_BUFFER_SECONDS = 3;

/** How much of the hero must be on screen for it to count as in view. */
const IN_VIEW_AMOUNT = 0.25;

/** The poster → video crossfade. Long enough to read as a settle, not a cut. */
const CROSSFADE_SECONDS = 0.6;

/**
 * Seconds buffered ahead of the playhead.
 *
 * Measured within the range that actually contains the playhead, not from
 * `buffered.end(0)`: after a seek or a loop the ranges are disjoint, and the
 * first one can sit entirely behind where we are playing.
 */
function bufferedAhead(video: HTMLVideoElement) {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i += 1) {
    if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
      return buffered.end(i) - currentTime;
    }
  }
  return 0;
}

/**
 * Whether the video can be expected to play without interrupting — the primary
 * source of truth for everything below.
 *
 * Three ways to qualify, in order of how much they can be trusted:
 *
 *   - `readyState 4` (HAVE_ENOUGH_DATA) is the browser's own estimate that it
 *     can play through without stopping. Chrome reaches it readily.
 *   - Otherwise `readyState 3` (HAVE_FUTURE_DATA) plus a measured cushion.
 *     Safari is markedly more conservative about promoting to 4 and can sit at
 *     3 with the whole clip in hand, so measuring the buffer ourselves is what
 *     carries it there rather than leaving it on the poster forever.
 *   - Or the clip is simply buffered to its end, which a 1.5MB file on any
 *     healthy connection reaches quickly. Without this the last few seconds
 *     would always fail the cushion test, since there is nothing left to buffer.
 */
function canPlaySmoothly(video: HTMLVideoElement) {
  if (video.readyState >= 4) return true;
  if (video.readyState < 3) return false;
  if (bufferedAhead(video) >= MIN_BUFFER_SECONDS) return true;

  const { buffered, duration } = video;
  return (
    buffered.length > 0 &&
    Number.isFinite(duration) &&
    buffered.end(buffered.length - 1) >= duration - 0.25
  );
}

type NetworkInformation = EventTarget & {
  saveData?: boolean;
  effectiveType?: string;
};

/**
 * A hint, never the decision.
 *
 * Its only job is to avoid pulling 1.5MB down a connection whose owner has
 * asked us not to. Safari ships no Network Information API at all, so this
 * returns true there and the readiness checks above are left to do the whole
 * job — which is the arrangement everywhere, since a connection this says is
 * fine still has to buffer before anything is revealed.
 *
 * `saveData` only, and not `effectiveType`. Save-Data is an explicit setting a
 * person turned on; effectiveType is a rolling estimate from recent round-trip
 * times, and it is wrong often enough to matter — it reported "2g" against a
 * localhost dev server during testing here. Blocking on that would take the
 * video away from a phone on perfectly good wifi and leave no trace of why.
 * Slow connections are already handled where they should be: the video loads,
 * fails to buffer, and never gets revealed.
 */
function connectionAllowsVideo() {
  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection;
  return !connection?.saveData;
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
};

const line: Variants = {
  hidden: { opacity: 0, y: 48, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};

export default function Banner({
  /**
   * Held back while the intro covers the page, so the hero's entrance plays
   * into the handoff instead of running out of sight behind the curtain. The
   * image itself still loads throughout — only the motion waits. Defaults to
   * true, so anywhere that doesn't orchestrate an intro behaves as before.
   */
  ready = true,
}: {
  ready?: boolean;
} = {}) {
  const show = ready ? "show" : "hidden";

  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(sectionRef, { amount: IN_VIEW_AMOUNT });

  /** A smoothly-playing frame is on screen. This alone fades the poster out. */
  const [showVideo, setShowVideo] = useState(false);

  /**
   * Visibility, readable from the element's listeners without re-subscribing
   * them every time it changes.
   */
  const inViewRef = useRef(inView);
  useEffect(() => {
    inViewRef.current = inView;
  }, [inView]);
  /**
   * Starts false so a save-data client never begins the download: the element
   * renders without a `src` until the check below clears it, and the server
   * output carries no source either.
   */
  const [allowLoad, setAllowLoad] = useState(false);

  // Read after mount, not during render — `navigator` does not exist on the
  // server, and reading it in render would desync the two passes.
  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection;
    const apply = () => setAllowLoad(connectionAllowsVideo());
    apply();
    connection?.addEventListener("change", apply);
    return () => connection?.removeEventListener("change", apply);
  }, []);

  /**
   * Reveal tracking.
   *
   * Readiness decides what is *shown*, never whether to press play. That split
   * is the whole fix for mobile: on iOS, `preload` is advisory and WebKit will
   * not buffer past metadata until playback is actually requested. Gating
   * play() on a buffer therefore deadlocks — nothing buffers, so readyState
   * sticks at 1, so play() is never called, so nothing buffers. Desktop Chrome
   * honours preload="auto", races to readyState 4 and plays, which is exactly
   * why this looked fine on a laptop and dead on a phone in both iOS browsers.
   *
   * So the element is always playing while the hero is on screen, and the
   * poster simply stays on top of it until it is worth looking at. Nothing is
   * revealed any sooner than before — the same canPlaySmoothly() gate and the
   * same presented-frame check still stand between the video and the viewer.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !allowLoad) {
      // Covers save-data arriving mid-playback: the element is about to lose
      // its source, so the poster has to come back before it does.
      setShowVideo(false);
      return;
    }

    // Set as a property *and* an attribute. React does not reliably reflect
    // `muted`, and WebKit reads it at the moment play() is called to decide
    // whether autoplay is permitted at all.
    video.muted = true;
    video.setAttribute("muted", "");

    let frameHandle: number | undefined;
    let revealed = false;

    const maybeReveal = () => {
      if (revealed || frameHandle !== undefined) return;
      if (video.paused || !canPlaySmoothly(video)) return;
      // Reveal on a presented frame, not on the event: `playing` fires when the
      // clock starts, which can be a frame or two before anything is painted,
      // and that gap is exactly where a black flash comes from. Safari 15.4+
      // and Chrome both provide this; anything older falls back to the event,
      // where the 0.6s crossfade covers the difference anyway.
      if (typeof video.requestVideoFrameCallback === "function") {
        frameHandle = video.requestVideoFrameCallback(() => {
          frameHandle = undefined;
          revealed = true;
          setShowVideo(true);
        });
      } else {
        revealed = true;
        setShowVideo(true);
      }
    };

    /**
     * A stall hides the video, and deliberately does not pause it. Pausing
     * would be the tidier-looking response, but on iOS a paused element with an
     * empty buffer is one that has stopped refilling, so the recovery this is
     * supposed to enable could never arrive. Muted and behind an opaque poster,
     * letting it keep running costs the viewer nothing.
     */
    const onStall = () => {
      revealed = false;
      if (frameHandle !== undefined) {
        video.cancelVideoFrameCallback?.(frameHandle);
        frameHandle = undefined;
      }
      setShowVideo(false);
    };

    /**
     * WebKit can reject the first play() when it is issued before metadata has
     * landed, so every point at which the element gains data is also a chance
     * to try again. Once it is running these are no-ops.
     */
    const onProgressed = () => {
      if (inViewRef.current && video.paused) {
        const played = video.play();
        if (played) played.catch(() => {});
      }
      maybeReveal();
    };

    const readyEvents = [
      "loadedmetadata",
      "loadeddata",
      "canplay",
      "canplaythrough",
      "progress",
      "timeupdate",
      "playing",
    ] as const;
    // `suspend` is deliberately absent — it fires when the browser has decided
    // it has enough and stopped fetching, which is the opposite of a stall.
    const stallEvents = ["waiting", "stalled", "error", "emptied"] as const;

    readyEvents.forEach((e) => video.addEventListener(e, onProgressed));
    stallEvents.forEach((e) => video.addEventListener(e, onStall));
    onProgressed();

    return () => {
      readyEvents.forEach((e) => video.removeEventListener(e, onProgressed));
      stallEvents.forEach((e) => video.removeEventListener(e, onStall));
      if (frameHandle !== undefined) {
        video.cancelVideoFrameCallback?.(frameHandle);
      }
    };
  }, [allowLoad]);

  /**
   * Playback follows visibility alone — see above for why readiness is not part
   * of this decision. Leaving the viewport pauses but deliberately does not
   * restore the poster: the video is off screen, and keeping the reveal means
   * coming back resumes in place instead of crossfading again at someone who
   * never saw it go.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !allowLoad) return;

    if (inView) {
      video.muted = true;
      const played = video.play();
      // A rejected play() is normal and not something the page can act on: an
      // autoplay policy declining, iOS Low Power Mode refusing video outright,
      // or the pause below interrupting it. The poster stays put in every case,
      // because the reveal needs a playing element and never gets one.
      if (played) played.catch(() => {});
    } else {
      video.pause();
    }
  }, [inView, allowLoad]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black"
    >
      {/* Sits under the poster and is uncovered by it, so there is no moment
          where an empty or half-loaded element is the thing on screen. Same
          inset and object-fit as the image above it, and the clip is authored
          to the poster's aspect ratio, so the reveal changes no framing. */}
      <video
        ref={videoRef}
        src={allowLoad ? VIDEO_SRC : undefined}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Background image with a slow, continuous Ken Burns drift — and the
          poster the video hides behind until it can play cleanly. */}
      <motion.div
        initial={{ scale: 1.18 }}
        animate={{ scale: ready ? 1.04 : 1.18, opacity: showVideo ? 0 : 1 }}
        // The drift keeps its 12s; the fade is given its own duration so it
        // does not inherit it. Reduced motion drops the crossfade to a swap.
        transition={{
          duration: 12,
          ease: "easeOut",
          opacity: {
            duration: reduceMotion ? 0 : CROSSFADE_SECONDS,
            ease: "easeOut",
          },
        }}
        className="absolute inset-0"
      >
        <Image
          src="/images/banner.png"
          alt="A traveller watching the sunset from a moving European train"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      {/* Legibility scrim. Full strength only while the video is the thing on
          screen; on the poster it drops to POSTER_SCRIM. It rides the same
          duration as the crossfade, so the two move as one gesture rather than
          the tone stepping when the video lands. See SCRIM. */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: showVideo ? 1 : POSTER_SCRIM }}
        transition={{
          duration: reduceMotion ? 0 : CROSSFADE_SECONDS,
          ease: "easeOut",
        }}
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: SCRIM }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-14 pt-24 sm:px-10 sm:pb-16 lg:px-16">
          {/* Headline + subheading, vertically centered in the remaining space */}
          <div className="flex flex-1 flex-col justify-center mb-10">
            {/* Headline */}
            <motion.h1
              variants={container}
              initial="hidden"
              animate={show}
              className="text-hero leading-hero tracking-1px font-semibold text-white sm:text-7xl sm:leading-hero lg:text-8xl lg:leading-hero"
            >
              {HEADLINE.map((word, i) => (
                <span key={word} className="block overflow-hidden">
                  <motion.span
                    variants={line}
                    className="inline-flex items-center"
                  >
                    {word}
                    {/* Accent — shaded disc with a center dot and a sweeping arc */}
                    {i === HEADLINE.length - 1 && (
                      <motion.span
                        aria-hidden
                        initial={{ scale: 0, opacity: 0 }}
                        animate={
                          ready
                            ? { scale: 1, opacity: 1 }
                            : { scale: 0, opacity: 0 }
                        }
                        transition={{
                          delay: 1.3,
                          duration: 0.6,
                          ease: EASE_OUT,
                        }}
                        className="relative ml-4 inline-block h-6 w-6 shrink-0 align-middle mt-3"
                      >
                        {/* Static disc + center dot */}
                        <svg viewBox="0 0 100 100" className="h-full w-full">
                          <defs>
                            <radialGradient
                              id="discShade"
                              cx="42%"
                              cy="36%"
                              r="72%"
                            >
                              <stop
                                offset="0%"
                                stopColor="#c4c4c4"
                                stopOpacity="0.38"
                              />
                              <stop
                                offset="55%"
                                stopColor="#a3a3a3"
                                stopOpacity="0.32"
                              />
                              <stop
                                offset="100%"
                                stopColor="#7f7f7f"
                                stopOpacity="0.25"
                              />
                            </radialGradient>
                          </defs>
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="url(#discShade)"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="17"
                            className="fill-brand-yellow"
                          />
                        </svg>

                        {/* Sweeping arc, layered on top and rotating */}
                        <motion.svg
                          viewBox="0 0 100 100"
                          className="absolute inset-0 h-full w-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray="118 159"
                            className="stroke-brand-yellow"
                          />
                        </motion.svg>
                      </motion.span>
                    )}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={show}
              transition={{ delay: 1.05, duration: 0.7, ease: EASE_OUT }}
              className="mt-6 max-w-md text-lead font-normal leading-lead tracking-2px text-white"
            >
              Go country to country with
              <br />
              one rail Pass. See everything
              <br />
              in between along the way.
            </motion.p>
          </div>

          {/* Actions — pinned to the bottom. */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={show}
            transition={{ delay: 1.25, duration: 0.7, ease: EASE_OUT }}
            className="flex w-full max-w-lg flex-nowrap gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex-1 whitespace-nowrap rounded-[3px] bg-brand-yellow px-6 py-3.5 text-base font-semibold uppercase text-navy-1 transition-colors hover:bg-brand-yellow-hover"
            >
              Plan your trip
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
