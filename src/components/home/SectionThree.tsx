"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

const HEADING = ["Staying", "curious"];

// The middle four letters are white so they read out of the portrait clip
// sitting behind them; "S" and the year stay navy on the white background.
const SINCE = "SINCE 1959";
const WHITE_FROM = 1;
const WHITE_TO = 4;

// Parent that staggers its children into view.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

// Heading lines resolve out of a blur as they rise. No overflow-hidden mask
// here: Poppins needs 1.4em of box and the design's line-height is 90px on
// 86px type, so a mask would shear the descenders off "Staying".
const line: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE },
  },
};

// Character flick-in for the monospace tagline.
const flick: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const clipIn: Variants = {
  hidden: { opacity: 0, scale: 1.06 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, ease: EASE },
  },
};

/**
 * A muted, looping clip that only plays while it is on screen — the same
 * treatment the rest of the page gives its video, and it keeps offscreen clips
 * from burning decode time. The poster holds the frame until the video is
 * ready, so the composition never renders as an empty box.
 */
function Clip({
  src,
  poster,
  label,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  /** Absolute placement + aspect ratio for this clip's slot. */
  className: string;
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
      variants={clipIn}
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

export default function SectionThree() {
  return (
    // pb matches the run-out the Figma frame leaves below the copy block, which
    // is where the portrait clip overhangs to.
    <section className="bg-white px-6 pb-[159px]">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        // 342px is the design's content column (390 frame less its 24px
        // gutters); capping there keeps the composition true to the design
        // rather than stretching the 86px headline on wider screens.
        className="relative mx-auto max-w-[342px] py-[118px]"
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
        />

        {/* Portrait clip — lower left, sitting behind the tagline. */}
        <Clip
          src="/images/section-2-2.mp4"
          poster="/images/section-2.1.png"
          label="A traveller with a bike at golden hour"
          className="left-0 right-[53.51%] top-[326px] aspect-[720/900]"
        />

        {/* Headline. The fixed 205px box with centred lines is the design's own
            frame — it holds the 12.5px of slack above and below the two 90px
            lines that sets the gap down to the tagline. */}
        <motion.h2 className="relative flex h-[205px] flex-col justify-center text-center font-sans text-[86px] font-semibold leading-[90px] tracking-[-3px] text-brand-yellow">
          {HEADING.map((word) => (
            <motion.span key={word} variants={line} className="block">
              {word}
            </motion.span>
          ))}
        </motion.h2>

        {/* SINCE 1959 — the left padding cancels the trailing letter-spacing CSS
            adds after the final glyph, which would otherwise pull the centred
            run 11.2px off-centre against the design. */}
        <motion.p
          variants={stagger}
          className="relative mt-6 pl-[22.4px] text-center font-departure text-base leading-[33.45px] tracking-[22.4px] text-navy-1"
        >
          {SINCE.split("").map((char, i) => (
            <motion.span
              key={i}
              variants={flick}
              className={
                i >= WHITE_FROM && i <= WHITE_TO ? "text-white" : undefined
              }
            >
              {/* nbsp: keeps the gap between "SINCE" and the year from
                  collapsing or wrapping under the wide tracking. */}
              {char === " " ? "\u00a0" : char}
            </motion.span>
          ))}
        </motion.p>
      </motion.div>
    </section>
  );
}
