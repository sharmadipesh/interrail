"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { LuBookmark } from "react-icons/lu";

// Premium ease-out — smooth, no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;

// Directions (degrees) for the little particle burst fired on save.
const BURST = [30, 90, 150, 210, 270, 330];

/**
 * Circular save toggle. On save the icon fills yellow with a springy pop, a
 * ring ripples outward, and a burst of dots scatters — a small, satisfying
 * flourish. Toggling off just empties the icon. Holds its own state so each
 * card in the list saves independently.
 */
function SaveButton() {
  const [saved, setSaved] = useState(false);

  return (
    <motion.button
      type="button"
      aria-label={saved ? "Remove saved route" : "Save route"}
      aria-pressed={saved}
      onClick={() => setSaved((s) => !s)}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-white backdrop-blur-sm transition-colors hover:bg-white/15"
    >
      {/* Ripple ring + particle burst — mounted only while saved */}
      <AnimatePresence>
        {saved && (
          <motion.span
            key="fx"
            aria-hidden
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0"
          >
            {/* Expanding ring */}
            <motion.span
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute inset-0 rounded-full border border-brand-yellow-1"
            />
            {/* Dots scatter outward, then vanish */}
            {BURST.map((deg) => (
              <motion.span
                key={deg}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{
                  x: Math.cos((deg * Math.PI) / 180) * 17,
                  y: Math.sin((deg * Math.PI) / 180) * 17,
                  scale: 0,
                  opacity: 0,
                }}
                transition={{ duration: 0.45, ease: EASE }}
                className="absolute left-1/2 top-1/2 -ml-0.5 -mt-0.5 h-1 w-1 rounded-full bg-brand-yellow-1"
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Icon: pops and fills on save */}
      <motion.span
        animate={{ scale: saved ? [1, 1.35, 1] : 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="relative grid place-items-center"
      >
        <LuBookmark
          size={18}
          strokeWidth={1.75}
          className={
            saved ? "fill-brand-yellow-1 text-brand-yellow-1" : "fill-none"
          }
        />
      </motion.span>
    </motion.button>
  );
}

const HEADING = ["Where next?", "destinations", "your europe."];
const SUBTEXT = [
  "At vero eos et accusamus et",
  "iusto iusto odio dignissimos",
  "ducimus qui blanditiis.",
];

const DATA = [
  {
    src: "section-3.1.png",
    routes: ["Berlin", "Prague", "Vienna"],
    heading:
      "Berlin to Budapest along the old central line. Big stations, dinners in alleys, a different language every couple of days.",
  },
  {
    src: "section-3.3.png",
    routes: ["Milan", "Venice", "Florence"],
    heading:
      "Milan down to Rome with Venice and Florence on the way. Design, renaissance, canals and history. Italy at its most iconic.",
  },
  {
    src: "section-3.2.png",
    routes: ["Paris", "Strasbourg", "Lyon"],
    heading:
      "Get lost in France the french way. The one everybody means when they say interrail.",
  },
];

// Parent that staggers its children into view.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// Line rises out of an overflow-hidden mask.
const rise: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.9, ease: EASE } },
};

// Soft blur-fade up.
const blurUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

// Card lifts + fades in, then staggers its own content.
const card: Variants = {
  hidden: { opacity: 0, y: 60 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: EASE,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const contentUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

type Destination = (typeof DATA)[number];

/**
 * A destination card whose photo drifts vertically as the card scrolls through
 * the viewport — a scroll-linked parallax, the vertical analogue of the drag
 * parallax in SectionFour. The image layer is oversized (120% tall, offset
 * -10%) so the ±44px drift always stays inside the overflow-hidden frame and
 * never exposes an edge. Honours prefers-reduced-motion by holding still.
 */
function DestinationCard({ d, idx }: { d: Destination; idx: number }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-44, 44]);

  return (
    <motion.article
      ref={ref}
      variants={card}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className="group relative h-[580px] overflow-hidden"
    >
      {/* Photo — vertical scroll parallax inside the mask; subtle zoom on hover.
          Parallax lives on this child, not the article, so the card's own
          whileInView reveal (which also writes transform) isn't disturbed. */}
      <motion.div
        style={{ y: reduce ? 0 : y }}
        className="absolute inset-x-0 -top-[10%] h-[120%]"
      >
        <Image
          src={"/images/" + d.src}
          alt={d.heading}
          fill
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
        />
      </motion.div>

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between px-6 pt-8 pb-9">
        {/* Route chips */}
        <motion.div
          variants={contentUp}
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-departure text-[11px] uppercase tracking-[0.14em] ${idx === 2 ? "text-[#E2DAC8]" : "text-[#3D2F1E]"}`}
        >
          {d.routes.map((r, i) => (
            <span key={r} className="flex items-center gap-2">
              {i > 0 && <span className="text-brand-yellow-1">&middot;</span>}
              {r}
            </span>
          ))}
        </motion.div>

        {/* Heading + actions */}
        <motion.div variants={contentUp}>
          <h3 className="max-w-[92%] font-molitor text-lg font-bold leading-[118%] text-white">
            {d.heading}
          </h3>

          <div className="mt-10 flex items-center gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex-1 whitespace-nowrap font-molitor font-molitor-caps rounded-[3px] bg-brand-yellow-1 border-brand-yellow px-5 py-3 text-sm font-semibold uppercase tracking-[10%] text-navy-deep"
            >
              Explore this route
            </motion.button>
            <SaveButton />
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

export default function SectionThree() {
  return (
    <div className="bg-white px-6 pt-[100px] pb-20">
      {/* Heading — each line rises out of its own mask */}
      <motion.h2
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="text-center font-molitor text-hero font-bold leading-[48px] tracking-85px text-navy-deep"
      >
        {HEADING.map((line) => (
          <span key={line} className="block overflow-hidden">
            <motion.span variants={rise} className="block">
              {line}
            </motion.span>
          </span>
        ))}
      </motion.h2>

      {/* Subtext — blur-fade up, staggered per line */}
      <motion.p
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.6 }}
        className="mt-5 text-center font-neuehaas text-lg font-medium leading-[110%] tracking-3% text-navy-deep"
      >
        {SUBTEXT.map((line) => (
          <motion.span key={line} variants={blurUp} className="block">
            {line}
          </motion.span>
        ))}
      </motion.p>

      {/* Destination cards */}
      <div className="mx-auto mt-20 flex max-w-md flex-col gap-6">
        {DATA.map((d, idx) => (
          <DestinationCard key={d.src} d={d} idx={idx} />
        ))}
      </div>
    </div>
  );
}
