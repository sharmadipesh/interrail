"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, type Variants } from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

type Pass = {
  /** Route marker: the "most chosen" stop is filled, the others are rings. */
  marker: "ring" | "dot";
  kicker: string;
  title: string;
  desc: string;
  badge?: string;
  price?: string;
  /** Highlighter bar struck through the price — the design marks only one. */
  highlight?: boolean;
  link?: string;
};

const PASSES: Pass[] = [
  {
    marker: "ring",
    kicker: "GLOBAL PASS",
    title: "5 travel days",
    desc: "Room for four to six cities in one month. The classic first Interrail.",
    price: "€239",
  },
  {
    marker: "dot",
    kicker: "GLOBAL PASS . MOST CHOSEN",
    title: "7 travel days",
    badge: "MOST CHOSEN",
    desc: "Room for six to eight cities in one month. The one most people wish they had bought.",
    price: "€286",
    highlight: true,
  },
  {
    marker: "ring",
    kicker: "ONE COUNTRY PASS",
    title: "One country, in depth",
    desc: "Italy, France, Spain and thirty more. Shorter trips, smaller price.",
    link: "See One Country prices",
  },
];

// Parent that staggers its children into view.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// Heading resolves out of a blur as it rises. No overflow-hidden mask: Poppins
// needs 1.4em of box and the design's line-height is 48px on 48px type, so a
// mask would shear the descender off "Your".
const rise: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

const blurUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

// The track deals the cards in one after another.
const trackStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const cardIn: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const contentUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * The little route stop beside each pass. Both variants are just a 2px #FFD400
 * circle in the design — the same marker the route lines use elsewhere — so
 * they're drawn in CSS rather than shipped as three image requests for a
 * circle. The fixed 14px slot keeps every card's text column on the same left
 * edge, and the 2px nudge optically centres the marker on the kicker's line.
 */
function Marker({ variant }: { variant: Pass["marker"] }) {
  return (
    <span
      aria-hidden
      className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center"
    >
      <span
        className={
          variant === "dot"
            ? "block h-3.5 w-3.5 rounded-full bg-brand-yellow"
            : "block h-[11px] w-[11px] rounded-full border-2 border-brand-yellow"
        }
      />
    </span>
  );
}

function PassCard({ pass }: { pass: Pass }) {
  return (
    <motion.article
      variants={cardIn}
      className="flex w-[319px] shrink-0 items-start gap-[15px]"
    >
      <Marker variant={pass.marker} />

      <div className="w-[290px] shrink-0 text-navy-1">
        <p className="font-departure text-xs uppercase leading-[18px] tracking-[0.72px]">
          {pass.kicker}
        </p>

        {/* The title row is the badge's positioning context — the design tilts
            the flag slightly and lets it ride alongside the title. */}
        <div className="relative mt-1">
          <h3 className="font-sans text-2xl font-semibold leading-6">
            {pass.title}
          </h3>
          {pass.badge && (
            <span className="absolute left-[175px] top-[3px] grid h-[18px] w-24 rotate-[2.43deg] place-items-center rounded-[2px] bg-brand-yellow">
              <span className="whitespace-nowrap font-departure text-[10px] leading-[14px] tracking-[0.6px] text-navy-1">
                {pass.badge}
              </span>
            </span>
          )}
        </div>

        {/* Priced cards reserve three lines so their price rows stay level
            across the strip — that's what the design's blank line is doing. */}
        <p
          className={`mt-2.5 font-sans text-base font-normal leading-[126%] tracking-16 ${
            pass.price ? "min-h-[60px]" : ""
          }`}
        >
          {pass.desc}
        </p>

        {pass.price && (
          <div className="relative mt-3.5 flex items-center gap-1">
            {/* Highlighter bar, struck through the lower half of the price */}
            {pass.highlight && (
              <span
                aria-hidden
                className="absolute left-[38px] top-[20.5px] h-[13px] w-[92px] bg-brand-yellow"
              />
            )}
            <span className="relative w-10 font-sans text-base font-normal leading-[126%] tracking-16">
              from
            </span>
            <span className="relative whitespace-nowrap font-sans text-[30px] font-semibold leading-[34px]">
              {pass.price}
            </span>
          </div>
        )}

        {pass.link && (
          <button
            type="button"
            className="group relative mt-4 inline-block font-sans text-base font-semibold leading-[22px]"
          >
            {pass.link}
            <span className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand-yellow transition-transform duration-500 ease-out group-hover:scale-x-100" />
          </button>
        )}
      </div>
    </motion.article>
  );
}

export default function SectionSix() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const [index, setIndex] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([0]);
  const [maxDrag, setMaxDrag] = useState(0);

  // Measure each card's resting offset rather than assuming a uniform pitch.
  // Offsets are taken as deltas from the first card so they don't depend on
  // what `offsetLeft` is measured against, and offsetWidth ignores the reveal
  // transform still sitting on the cards at first measure.
  useEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      const track = trackRef.current;
      if (!vp || !track) return;
      const cards = Array.from(track.children) as HTMLElement[];
      if (!cards.length) return;

      const styles = getComputedStyle(track);
      const padX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const base = cards[0].offsetLeft;
      const last = cards[cards.length - 1];
      const contentW = last.offsetLeft - base + last.offsetWidth + padX;
      const max = Math.max(0, contentW - vp.clientWidth);

      setMaxDrag(max);
      setSnaps(cards.map((c) => Math.max(-max, -(c.offsetLeft - base))));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, []);

  // Nearest snap to an x position. Strict `<` keeps index 0 when every snap
  // collapses to 0 (viewport wide enough that nothing scrolls).
  const nearest = useCallback(
    (v: number) =>
      snaps.reduce(
        (best, s, i) => (Math.abs(s - v) < Math.abs(snaps[best] - v) ? i : best),
        0,
      ),
    [snaps],
  );

  // Single source of truth for the active dot — driven by x, so it stays in
  // sync whether the user dragged or tapped a dot.
  useEffect(() => {
    const unsubscribe = x.on("change", (v) => {
      const i = nearest(v);
      setIndex((prev) => (prev === i ? prev : i));
    });
    return unsubscribe;
  }, [x, nearest]);

  // Keep the current card aligned if the viewport resizes under us.
  useEffect(() => {
    x.set(snaps[clamp(index, 0, snaps.length - 1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snaps]);

  const goTo = useCallback(
    (i: number) => {
      animate(x, snaps[clamp(i, 0, snaps.length - 1)], {
        type: "spring",
        stiffness: 260,
        damping: 34,
        mass: 0.9,
      });
    },
    [x, snaps],
  );

  const canDrag = maxDrag > 0;

  return (
    <section className="bg-white pb-24">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="mx-auto max-w-md"
      >
        {/* Heading */}
        <motion.h2
          variants={rise}
          className="px-6 text-center font-sans text-5xl font-semibold leading-[48px] tracking-1px text-navy-1"
        >
          Your Pass. Your call.
        </motion.h2>

        <motion.p
          variants={blurUp}
          className="mt-[19px] px-6 text-center font-sans text-base font-normal leading-[126%] tracking-16 text-navy-1"
        >
          Pick a Pass type and how many days you want to travel. Everything else
          is yours to decide.
        </motion.p>

        {/* Pass strip — drag to scrub, snaps to the nearest card on release */}
        <div className="mt-11 py-5">
          <div ref={viewportRef} className="overflow-hidden">
            <motion.div
              ref={trackRef}
              variants={trackStagger}
              style={{ x }}
              drag={canDrag ? "x" : false}
              dragConstraints={{ left: -maxDrag, right: 0 }}
              dragElastic={0.12}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                // Project where the flick would land, then snap there.
                goTo(nearest(x.get() + info.velocity.x * 0.2));
              }}
              // min-h holds the design's row height, which is a touch taller
              // than the tallest card's content and sets the gap to the dots.
              className={`flex min-h-[173px] select-none items-start gap-5 px-6 ${
                canDrag ? "cursor-grab active:cursor-grabbing" : ""
              }`}
            >
              {PASSES.map((pass) => (
                <PassCard key={pass.title} pass={pass} />
              ))}
            </motion.div>
          </div>
        </div>

        {/* Pagination — the active dot is a hollow ring. The design's spacing
            (21 above, 30 below, 9 between) is measured to the 6.5px dot, but
            the buttons are 12px so they stay a usable tap target. Each margin
            and the gap absorb that 5.5px difference, so the dots and the
            footer land where the design puts them. */}
        <motion.div
          variants={contentUp}
          className="mt-[18px] flex justify-center gap-[3.5px]"
        >
          {PASSES.map((pass, i) => (
            <button
              key={pass.title}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === index}
              aria-label={`Go to pass ${i + 1}`}
              className="relative grid h-3 w-3 place-items-center"
            >
              <motion.span
                animate={{ opacity: i === index ? 0 : 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="block h-[6.5px] w-[6.5px] rounded-full bg-[#E5E5E5]"
              />
              <motion.span
                animate={{
                  opacity: i === index ? 1 : 0,
                  scale: i === index ? 1 : 0.5,
                }}
                transition={{ duration: 0.35, ease: EASE }}
                className="absolute h-[6.5px] w-[6.5px] rounded-full border-2 border-brand-yellow"
              />
            </button>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div variants={contentUp} className="mt-[27px] px-6 text-center">
          <button
            type="button"
            className="group relative font-sans text-base font-semibold leading-[1.4] text-navy-1"
          >
            Compare all Passes
            <span className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand-yellow transition-transform duration-500 ease-out group-hover:scale-x-100" />
          </button>

          <p className="mt-[17px] font-departure text-xs uppercase leading-[18px] tracking-[0.72px] text-[#AFAFAF]">
            REFUNDABLE 7 DAYS <span className="text-brand-yellow">·</span>
            <br />
            33 COUNTRIES <span className="text-brand-yellow">·</span> FLEXIBLE
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
