"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { LuBookmark } from "react-icons/lu";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

// Gap between cards, in px. Must mirror the `gap-5` on the track.
const GAP = 20;

// Directions (degrees) for the little particle burst fired on save.
const BURST = [30, 90, 150, 210, 270, 330];

const HEADING = ["At vero eos", "Accusamus Iusto", "Odio Dignissimos"];

const DATA = [
  {
    src: "section-4.1.png",
    dest: ["PARIS", "STRASBOURG", "LYON"],
    desc: "Recline aboard a luxury barge, admiring the rolling vineyards of Champagne.",
  },
  {
    src: "section-4.2.png",
    dest: ["PARIS", "STRASBOURG", "LYON"],
    desc: "Recline aboard a luxury barge, admiring the rolling vineyards of Champagne.",
  },
  {
    src: "section-4.3.png",
    dest: ["PARIS", "STRASBOURG", "LYON"],
    desc: "Recline aboard a luxury barge, admiring the rolling vineyards of Champagne.",
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

// The track deals the cards in one after another.
const trackStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

// Card lifts + fades in, then staggers its own content.
const cardIn: Variants = {
  hidden: { opacity: 0, y: 64, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.9,
      ease: EASE,
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const contentUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// Slow zoom-out on reveal, cropped by the card's overflow-hidden frame.
const kenBurns: Variants = {
  hidden: { scale: 1.22 },
  show: { scale: 1, transition: { duration: 1.3, ease: EASE } },
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

type Item = (typeof DATA)[number];

/**
 * A single route card. The photo drifts against the drag, so the strip reads as
 * layered depth rather than a flat row sliding past.
 */
function Card({
  item,
  index,
  x,
  step,
  isDragging,
}: {
  item: Item;
  index: number;
  x: MotionValue<number>;
  step: number;
  isDragging: React.RefObject<boolean>;
}) {
  const [saved, setSaved] = useState(false);

  // `offset` is 0 when this card sits at its own snap point and grows as the
  // track moves away from it. The photo shifts by a fraction of that, capped so
  // it never exposes the edge of the 120%-wide parallax layer.
  const imgX = useTransform(x, (v) => {
    if (!step) return 0;
    const offset = v + index * step;
    return clamp(-offset * 0.12, -28, 28);
  });

  return (
    <motion.article
      variants={cardIn}
      className="w-[78%] max-w-[313px] shrink-0"
    >
      {/* Photo — masked frame, ken-burns reveal, drag parallax */}
      <div className="relative aspect-[313/198] overflow-hidden bg-neutral-200">
        <motion.div variants={kenBurns} className="absolute inset-0">
          <motion.div
            style={{ x: imgX }}
            className="absolute inset-y-0 -left-[10%] w-[120%]"
          >
            <Image
              src={"/images/" + item.src}
              alt={item.desc}
              fill
              draggable={false}
              sizes="(max-width: 448px) 78vw, 313px"
              className="select-none object-cover"
            />
          </motion.div>
        </motion.div>

        {/* Save — fills yellow when toggled */}
        <motion.button
          type="button"
          aria-label={saved ? "Remove saved route" : "Save route"}
          aria-pressed={saved}
          onClick={() => {
            // A drag that ends over the button still fires a click; ignore it.
            if (isDragging.current) return;
            setSaved((s) => !s);
          }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="absolute bottom-3 right-4 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
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
                      x: Math.cos((deg * Math.PI) / 180) * 16,
                      y: Math.sin((deg * Math.PI) / 180) * 16,
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

          <motion.span
            animate={{ scale: saved ? [1, 1.35, 1] : 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative grid place-items-center"
          >
            <LuBookmark
              size={17}
              strokeWidth={1.75}
              className={
                saved ? "fill-brand-yellow-1 text-brand-yellow-1" : "fill-none"
              }
            />
          </motion.span>
        </motion.button>
      </div>

      {/* Route chips */}
      <motion.div
        variants={contentUp}
        className="mt-6 flex flex-wrap items-center gap-x-2 font-departure font-normal text-xs uppercase tracking-[6%] text-navy-deep"
      >
        {item.dest.map((d) => (
          <span key={d} className="flex items-center gap-2">
            {d}
            <span className="text-brand-yellow-1">&middot;</span>
          </span>
        ))}
      </motion.div>

      <motion.h3
        variants={contentUp}
        className="mt-9 font-molitor text-lg font-bold leading-[115%] text-navy-deep"
      >
        {item.desc}
      </motion.h3>

      {/* Explore — underline wipes in from the left on hover */}
      <motion.div variants={contentUp} className="mt-5">
        <button
          type="button"
          className="group relative inline-block font-molitor text-sm font-semibold uppercase tracking-[0.1em] text-brand-yellow-1"
        >
          Explore this route
          <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand-yellow-1 transition-transform duration-500 ease-out group-hover:scale-x-100" />
        </button>
      </motion.div>
    </motion.article>
  );
}

export default function SectionFour() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const x = useMotionValue(0);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [maxDrag, setMaxDrag] = useState(0);

  // Measure card pitch and scrollable distance; re-measure on resize.
  useEffect(() => {
    const measure = () => {
      const vp = viewportRef.current;
      const track = trackRef.current;
      const card = track?.firstElementChild as HTMLElement | null;
      if (!vp || !track || !card) return;

      // Derive the track width from layout rather than reading `scrollWidth`:
      // the cards are still scaled down by their reveal variant on first
      // measure, and Chrome folds transforms into scrollWidth (which would
      // under-measure and leave the last card clipped). offsetWidth and
      // computed padding both ignore transforms.
      const styles = getComputedStyle(track);
      const padX =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const cardW = card.offsetWidth;
      const contentW = DATA.length * cardW + (DATA.length - 1) * GAP + padX;

      setStep(cardW + GAP);
      setMaxDrag(Math.max(0, contentW - vp.clientWidth));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, []);

  // Where each card comes to rest. The last ones clamp to the end of the track
  // rather than overscrolling past it.
  const snaps = useMemo(
    () => DATA.map((_, i) => Math.max(-maxDrag, -i * step)),
    [step, maxDrag],
  );

  // Nearest snap to an x position. Strict `<` keeps index 0 when every snap
  // collapses to 0 (viewport wide enough that nothing scrolls).
  const nearest = useCallback(
    (v: number) =>
      snaps.reduce(
        (best, s, i) =>
          Math.abs(s - v) < Math.abs(snaps[best] - v) ? i : best,
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

  // Keep the current card aligned if the viewport resizes under us. Runs on
  // layout changes only — not when `index` moves during a drag.
  useEffect(() => {
    if (!step) return;
    x.set(snaps[clamp(index, 0, snaps.length - 1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snaps, step]);

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
    <section className="bg-white pb-8">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="mx-auto max-w-md"
      >
        {/* Heading — each line rises out of its own mask */}
        <motion.h2
          variants={stagger}
          className="px-6 font-molitor text-[32px] font-bold leading-[34px] tracking-[-0.27px] text-navy-deep"
        >
          {HEADING.map((line) => (
            <span key={line} className="block overflow-hidden">
              <motion.span variants={rise} className="block">
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h2>

        {/* Carousel — drag to scrub, snaps to the nearest card on release */}
        <div ref={viewportRef} className="mt-10 overflow-hidden">
          <motion.div
            ref={trackRef}
            variants={trackStagger}
            style={{ x }}
            drag={canDrag ? "x" : false}
            dragConstraints={{ left: -maxDrag, right: 0 }}
            dragElastic={0.12}
            dragMomentum={false}
            onDragStart={() => {
              isDragging.current = true;
            }}
            onDragEnd={(_, info) => {
              // Project where the flick would land, then snap there.
              goTo(nearest(x.get() + info.velocity.x * 0.2));
              // Let the click that ends the drag pass through first.
              requestAnimationFrame(() => {
                isDragging.current = false;
              });
            }}
            className={`flex select-none gap-5 px-6 ${
              canDrag ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            {DATA.map((item, i) => (
              <Card
                key={i}
                item={item}
                index={i}
                x={x}
                step={step}
                isDragging={isDragging}
              />
            ))}
          </motion.div>
        </div>

        {/* Pagination — the active dot fades up in yellow */}
        <motion.div
          variants={contentUp}
          className="mt-12 flex justify-center gap-3"
        >
          {DATA.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to route ${i + 1}`}
              aria-current={i === index}
              className="relative grid h-3 w-3 place-items-center"
            >
              <span className="block h-2.5 w-2.5 rounded-full bg-[#D1D1CC]" />
              <motion.span
                animate={{
                  opacity: i === index ? 1 : 0,
                  scale: i === index ? 1 : 0.5,
                }}
                transition={{ duration: 0.35, ease: EASE }}
                className="absolute h-2.5 w-2.5 rounded-full bg-brand-yellow-1"
              />
            </button>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
