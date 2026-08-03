"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  animate,
  cubicBezier,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type Variants,
} from "framer-motion";

/** Frames running down the filmstrip on the left of the hero, top to bottom. */
const STRIP_FRAMES: { src: string; alt: string }[] = [
  { src: "/img/section-8.1.png", alt: "Tower Bridge at golden hour, London" },
  {
    src: "/img/section-8.2.png",
    alt: "A train bound for Innsbruck and Vienna Airport",
  },
  {
    src: "/img/section-8.3.png",
    alt: "Canal houses and bicycles in Amsterdam",
  },
  {
    src: "/img/section-8.4.png",
    alt: "Café terraces on the Grand-Place, Brussels",
  },
  { src: "/img/section-8.5.png", alt: "Rooftop drinks above Antwerp" },
];

// Frame pitch down the strip, from the design.
const FRAME_PITCH = 154.458;

/**
 * The strip is printed twice and scrolled by exactly one sequence.
 *
 * Every frame keeps the design's `-9.21 + i * FRAME_PITCH` placement, so frame
 * 5 lands precisely one sequence below frame 0. Travelling the track up by
 * SEQUENCE_H therefore leaves the second copy sitting exactly where the first
 * started: the pixels at the end of a cycle are identical to the pixels at the
 * beginning, and the repeat has nothing to give itself away.
 *
 * Two sequences is the exact requirement, not a guess. At the moment the loop
 * wraps, the lowest point the 692.5px window can expose is covered by frame 9,
 * which spans 609.6 → 756.9.
 */
const SEQUENCE_H = STRIP_FRAMES.length * FRAME_PITCH; // 772.29
const LOOP_FRAMES = [...STRIP_FRAMES, ...STRIP_FRAMES];

/** Seconds for one five-frame cycle — ~39px/s, a projector idling. */
const LOOP_DURATION = 20;

/** The heading's own line breaks, each masked separately. */
const HEADING_LINES = ["Stories", "from the", "tracks"];

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);

/**
 * Drift only. At ±14px across the whole crossing this is meant to sit below
 * conscious notice — the filmstrip is the animation, this is just parallax
 * keeping the photograph from feeling glued to the page.
 */
const PARALLAX_SPRING = { stiffness: 120, damping: 28, mass: 0.45 } as const;
const DRIFT = 14;

/** Shell exists only to propagate state; the order is set by explicit delays. */
const shell: Variants = { hidden: {}, show: {} };

const heroIn: Variants = {
  hidden: { opacity: 0.85, scale: 1.06 },
  show: { opacity: 1, scale: 1, transition: { duration: 1, ease: EASE } },
};

const stripIn: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE, delay: 0.18 },
  },
};

const kickerIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE, delay: 0.42 },
  },
};

// Each line rises out of its own mask. Nothing in "Stories from the tracks"
// descends below the baseline, so a mask at the design's 49.099px line box
// clips nothing — the capitals start ~8px inside it.
const headingLine: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: { duration: 0.85, ease: EASE, delay: 0.52 + i * 0.1 },
  }),
};

const carriageIn: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE, delay: 0.86 },
  },
};

export default function SectionEight() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = !!useReducedMotion();

  // Two reads of the same element: the entrance fires once, a third of the way
  // in; playback follows visibility both ways so the strip idles offscreen.
  const entered = useInView(sectionRef, { once: true, amount: 0.3 });
  const visible = useInView(sectionRef);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const smoothed = useSpring(scrollYProgress, PARALLAX_SPRING);
  const drift = useTransform(smoothed, [0, 1], [-DRIFT, DRIFT]);

  const stripY = useMotionValue(0);
  const loop = useRef<AnimationPlaybackControls | null>(null);

  // Built once and never rebuilt. Recreating it mid-cycle would restart the
  // repeat from wherever the track happened to be, which quietly shortens every
  // subsequent cycle and breaks the seam.
  useEffect(() => {
    if (reduce) return;
    const controls = animate(stripY, -SEQUENCE_H, {
      duration: LOOP_DURATION,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
      delay: 0.5,
    });
    controls.pause();
    loop.current = controls;
    return () => {
      controls.stop();
      loop.current = null;
    };
  }, [reduce, stripY]);

  // pause()/play() rather than stop()/recreate: the animation keeps its own
  // clock, so leaving and re-entering resumes at the same phase and the same
  // velocity instead of jumping.
  useEffect(() => {
    const controls = loop.current;
    if (!controls) return;
    if (visible) controls.play();
    else controls.pause();
  }, [visible]);

  return (
    <motion.section
      ref={sectionRef}
      variants={shell}
      initial={reduce ? "show" : "hidden"}
      animate={entered || reduce ? "show" : "hidden"}
      className="relative h-[694px] w-full overflow-hidden bg-white"
    >
      {/* Hero photo. object-position reproduces the design's framing, which
          sits the crop left of centre. The entrance and the drift are on
          separate layers so neither has to share a transform with the other,
          and the inner layer is 20px taller top and bottom so ±14px of drift
          can never pull an edge into view. */}
      <motion.div variants={heroIn} className="absolute inset-0">
        <motion.div
          style={{ y: reduce ? 0 : drift }}
          className="absolute inset-x-0 -inset-y-5"
        >
          <Image
            fill
            sizes="100vw"
            src="/images/effect-hero.jpg"
            alt="A train crossing open countryside"
            className="object-cover object-[41%_50%]"
          />
        </motion.div>
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-black/10" />

      {/* Filmstrip */}
      <div className="absolute left-8 top-px h-[692.5px] w-[137.07px] overflow-hidden bg-navy-1">
        {/* The film base is flat #140A33 — sampling the design's gutters and
            margins returns that colour throughout, so the dust-and-scratch
            texture that sits over it there reads as nothing on screen. */}
        <motion.div variants={stripIn} className="absolute inset-0">
          <motion.div style={{ y: stripY }} className="absolute inset-0">
            {LOOP_FRAMES.map((frame, i) => {
              // The trailing sequence is the same five photographs again, so it
              // carries no alt text and is hidden from assistive tech.
              const duplicate = i >= STRIP_FRAMES.length;
              return (
                <div
                  key={i}
                  aria-hidden={duplicate || undefined}
                  style={{ top: `${-9.21 + i * FRAME_PITCH}px` }}
                  className="absolute left-[9.21px] h-[147.3px] w-[116.61px] overflow-hidden bg-navy-1"
                >
                  <Image
                    fill
                    sizes="117px"
                    src={frame.src}
                    alt={duplicate ? "" : frame.alt}
                    className="object-cover"
                  />
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>

      {/* Copy */}
      <div className="absolute left-[112px] right-[14px] top-[74px] flex flex-col gap-1">
        <motion.p
          variants={kickerIn}
          className="font-departure text-xs uppercase leading-[18px] tracking-[0.72px] text-brand-yellow"
        >
          traveller routes
        </motion.p>
        <h2 className="font-sans text-5xl font-semibold leading-[49.099px] tracking-[-1.0229px] text-white">
          {HEADING_LINES.map((line, i) => (
            <span key={line} className="block overflow-hidden">
              <motion.span
                custom={i}
                variants={headingLine}
                className="block"
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h2>
      </div>

      {/* Carriage number, tucked against the left edge */}
      <motion.span
        variants={carriageIn}
        className="absolute left-[2px] top-[203.5px] font-departure text-[14.321px] uppercase leading-[18px] tracking-[0.8592px] text-[#0F141C]"
      >
        24
      </motion.span>
    </motion.section>
  );
}
