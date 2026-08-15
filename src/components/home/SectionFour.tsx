"use client";
import { clsx } from "clsx";
import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";

// Premium ease-out — smooth, no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;

const HEADING = ["Trip ideas"];
const SUBTEXT = [
  "Not sure where to start? Check out a few",
  "suggested routes. You can make them as",
  "long or short as you like.",
];

const DATA = [
  {
    src: "section-3.1.png",
    routes: ["MILAN", "VERONA", "VENICE", "BOLOGNA", "FLORENCE"],
    heading:
      "Start with risotto, end with Roman ruins. Six stops in Italy. Always with a long lunch somewhere on the way.",
  },
  {
    src: "section-3.3.png",
    routes: [
      "LONDON",
      "BRUSSELS",
      "GHENT",
      "ANTWERP",
      "ROTTERDAM",
      "AMSTERDAM",
    ],
    heading:
      "Get lost in the energy of London and Brussels. Find your way back as you take it easy in Ghent and Amsterdam.",
  },
  {
    src: "section-3.2.png",
    routes: ["BERLIN", "HAMBURG", "COPENHAGEN", "MALMO", "GOTHENBURG"],
    heading:
      "Berlin to Copenhagen to Gothenburg. Big stations, street-view dinners and a different language every few days.",
  },
];

/* ------------------------------------------------------------------ *
 * Motion system
 * ------------------------------------------------------------------ */

/**
 * One container owns the whole intro.
 *
 * The heading and the paragraph used to be two `whileInView` observers with
 * different thresholds on elements of different heights, so the beat between
 * them was never authored — it fell out of scroll speed and geometry and landed
 * differently every pass. As one parent with a stagger, the relationship is
 * fixed: the mask rises, the paragraph follows 140ms later, every time.
 */
const intro: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.04, staggerChildren: 0.14 } },
};

// Heading line rises out of its own overflow-hidden mask.
const riseLine: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.85, ease: EASE } },
};

// The paragraph resolves as one block. Per-line staggering three lines of a
// single sentence read as noise, and 8px of blur was heavy enough to look like
// a focus pull rather than a settle.
const introCopy: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

/**
 * Card entrance. Lighter than it was — 36px instead of 60px, with a whisper of
 * scale — so it settles rather than heaves into place.
 *
 * `custom` carries the card's index and nudges its inner delay by 20ms a card.
 * It is far too small to read as a stagger; it just stops three identical cards
 * from feeling like the same clip replayed.
 */
const cardIn: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.985 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: EASE,
      delayChildren: 0.1 + i * 0.02,
      staggerChildren: 0.08,
    },
  }),
};

// Route chips and the bottom block follow the card, not after it.
const cardCopy: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

// The photo settles out of a slight over-scale as the card lands.
const photoSettle: Variants = {
  hidden: { scale: 1.05 },
  show: { scale: 1, transition: { duration: 0.9, ease: EASE } },
};

/**
 * The intro waits until it is clear of the fold. SectionThree's sticky stage
 * releases exactly as this section's top reaches the viewport bottom, so the
 * negative bottom margin buys a beat between that release and this entrance
 * instead of the two movements running into each other.
 */
const INTRO_VIEWPORT = { once: true, amount: 0.5, margin: "0px 0px -12% 0px" };

/** Shared by all three cards, so they speak one motion language. */
const CARD_VIEWPORT = { once: true, amount: 0.2 };

/**
 * Smoothing for the photo drift. Raw scroll progress left this as the only
 * motion on the page not running through a spring, which is exactly why it read
 * as sharper than everything around it.
 *
 * Damping is 16 rather than a heavier value: at 130/0.4 critical damping is
 * ~14.4, so this sits at a ratio of 1.11 — no overshoot, but a ~88ms settle
 * that tracks Lenis instead of trailing it.
 */
const PARALLAX_SPRING = {
  stiffness: 130,
  damping: 16,
  mass: 0.4,
  restDelta: 0.001,
} as const;

/** Drift, in px either side of centre. The layer has 58px of headroom. */
const PARALLAX = 28;

type Destination = (typeof DATA)[number];

/**
 * A destination card whose photo drifts vertically as the card scrolls through
 * the viewport — the vertical analogue of the drag parallax in SectionFive.
 *
 * The photo is three nested layers, each owning exactly one transform: settle
 * (scale) wraps parallax (y) wraps the hover zoom (scale). Collapsing any two
 * onto one element would have them overwrite each other's transform; nesting
 * lets all three run at once. The inner layer is oversized (120% tall, offset
 * -10%) so the ±28px drift always stays inside the mask and never exposes an
 * edge. Honours prefers-reduced-motion by holding still.
 */
function DestinationCard({ d, idx }: { d: Destination; idx: number }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smoothed = useSpring(scrollYProgress, PARALLAX_SPRING);
  const y = useTransform(smoothed, [0, 1], [-PARALLAX, PARALLAX]);

  return (
    <motion.article
      ref={ref}
      custom={idx}
      variants={cardIn}
      // Reduced motion resolves the card to its finished state on the first
      // render rather than branching the markup, so the layout is identical.
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={CARD_VIEWPORT}
      className="group relative h-[580px] overflow-hidden"
    >
      {/* Layer 1 — scale settle */}
      <motion.div variants={photoSettle} className="absolute inset-0">
        {/* Layer 2 — scroll parallax */}
        <motion.div
          style={{ y: reduce ? 0 : y }}
          className="absolute inset-x-0 -top-[10%] h-[120%]"
        >
          {/* Layer 3 — hover zoom, gated to devices that actually hover so it
              cannot stick on a touch screen after a tap. */}
          <Image
            fill
            alt={d.heading}
            src={"/images/" + d.src}
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover transition-transform duration-[900ms] ease-out [@media(hover:hover)]:group-hover:scale-[1.06]"
          />
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between px-6 p-9">
        {/* Route chips */}
        <motion.div
          variants={cardCopy}
          className={clsx(
            `flex flex-wrap items-center gap-x-1.5 gap-y-1 font-departure font-normal text-xs uppercase tracking-[0.72px]`,
            idx === 2 || idx === 1 ? "text-white" : "text-navy-1",
          )}
        >
          {d.routes.map((r, i) => (
            <span key={r} className="flex items-center gap-2">
              {i > 0 && <span className="text-brand-yellow-1">&middot;</span>}
              {r}
            </span>
          ))}
        </motion.div>

        {/* Heading + actions */}
        <motion.div variants={cardCopy}>
          <h3 className="max-w-[92%] text-lg font-semibold leading-5 tracking-[-0.18px] font-sans text-white">
            {d.heading}
          </h3>

          <div className="mt-7 flex items-center justify-between">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02, y: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className=" whitespace-nowrap text-left text-brand-yellow text-sm font-semibold leading-[130%] tracking-14"
            >
              View This Itinerary
            </motion.button>
            <div className="flex items-center text-base font-normal leading-[130%] font-sans text-brand-yellow gap-1">
              <span className="text-normal text-white tracking-16">from</span>
              <span className="font-semibold text-sm tracking-14">$389</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

export default function SectionFour() {
  const reduce = useReducedMotion();

  return (
    <div className="bg-white px-6 pt-10 pb-[88px]">
      {/* Intro — heading and paragraph on one timeline */}
      <motion.div
        variants={intro}
        whileInView="show"
        viewport={INTRO_VIEWPORT}
        initial={reduce ? "show" : "hidden"}
      >
        {/* motion.h2 carries no variants of its own; it exists so the variant
            state reaches the masked line inside it. */}
        <motion.h2 className="text-center text-hero font-sans font-semibold leading-[48px] tracking-1px text-navy-1">
          {HEADING.map((line) => (
            <span key={line} className="block overflow-hidden">
              <motion.span variants={riseLine} className="block">
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h2>

        {/* Subtext — one block, not three staggered lines */}
        <motion.p
          variants={introCopy}
          className="mt-6 text-center text-base font-sans font-normal leading-[125%] tracking-16 text-navy-1"
        >
          {SUBTEXT.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </motion.p>
      </motion.div>

      {/* Destination cards */}
      <div className="mx-auto mt-9 flex max-w-md flex-col gap-9">
        {DATA.map((d, idx) => (
          <DestinationCard key={d.src} d={d} idx={idx} />
        ))}
      </div>
    </div>
  );
}
