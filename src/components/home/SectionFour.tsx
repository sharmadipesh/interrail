"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
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
          fill
          alt={d.heading}
          src={"/images/" + d.src}
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
        />
      </motion.div>

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between px-6 p-10">
        {/* Route chips */}
        <motion.div
          variants={contentUp}
          className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 font-departure font-normal text-xs uppercase tracking-[0.72px] ${idx === 2 ? "text-[#E2DAC8]" : "text-navy-1"}`}
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
          <h3 className="max-w-[92%] text-lg font-semibold leading-5 font-sans text-white">
            {d.heading}
          </h3>

          <div className="mt-7 flex items-center justify-between">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02, y: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className=" whitespace-nowrap text-left text-brand-yellow text-base font-semibold uppercase leading-[130%]"
            >
              View This Itinerary
            </motion.button>
            <div className="flex items-center text-base font-normal leading-[130%] font-sans text-brand-yellow gap-1">
              <span>from</span>
              <span className="font-semibold">$389</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

export default function SectionFour() {
  return (
    <div className="bg-white px-6 pt-10 pb-[88px]">
      {/* Heading — each line rises out of its own mask */}
      <motion.h2
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="text-center text-hero font-sans font-semibold leading-[48px] tracking-1px text-navy-1"
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
        className="mt-6 text-center text-base font-sans font-normal leading-[125%] tracking-16 text-navy-1"
      >
        {SUBTEXT.map((line) => (
          <motion.span key={line} variants={blurUp} className="block">
            {line}
          </motion.span>
        ))}
      </motion.p>

      {/* Destination cards */}
      <div className="mx-auto mt-9 flex max-w-md flex-col gap-9">
        {DATA.map((d, idx) => (
          <DestinationCard key={d.src} d={d} idx={idx} />
        ))}
      </div>
    </div>
  );
}
