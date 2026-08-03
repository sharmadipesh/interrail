"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { RiArrowRightLine } from "react-icons/ri";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

// Gap between cards, in px. Must mirror the `gap-5` on the track.
const GAP = 20;

const DATA = [
  {
    src: "section-4.1.png",
    dest: ["STRASBOURG", "BASEL", "LUCERNE", "ZURICH", "INNSBRUCK"],
    desc: "From half-timbered Strasbourg to half-pipes in Innsbruck. Serious mountains. Serious charm.",
  },
  {
    src: "section-4.2.png",
    dest: ["PRAGUE", "VEINNA", "BRATISLAVA", "BUDAPEST", "GREZ", "LJUBLJANA"],
    desc: "Prague's spires, Vienna's coffeehouses, Budapest's ruin bars. Five countries in one direction.",
  },
  {
    src: "section-4.3.png",
    dest: ["BARCELONA", "GIRONA", "MONTPELLIER", "AVIGNON", "LYON", "PARIS"],
    desc: "Start on the beach in Barcelona, end at the Eiffel Tower. See Avignon's old city.",
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
}: {
  item: Item;
  index: number;
  x: MotionValue<number>;
  step: number;
}) {
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
              fill
              alt={item.desc}
              draggable={false}
              src={"/images/" + item.src}
              sizes="(max-width: 448px) 78vw, 313px"
              className="select-none object-cover"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Route chips */}
      <motion.div
        variants={contentUp}
        className="mt-5 flex flex-wrap items-center gap-x-1.5 font-departure font-normal text-xs uppercase tracking-[0.72px] text-navy"
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
        className="mt-3 text-lg font-semibold font-sans leading-5 text-navy"
      >
        {item.desc}
      </motion.h3>
    </motion.article>
  );
}

export default function SectionFive() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

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
    <section className="bg-white pb-[68px]">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="mx-auto max-w-md"
      >
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
            onDragEnd={(_, info) => {
              // Project where the flick would land, then snap there.
              goTo(nearest(x.get() + info.velocity.x * 0.2));
            }}
            className={`flex select-none gap-5 px-6 ${
              canDrag ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            {DATA.map((item, i) => (
              <Card key={i} item={item} index={i} x={x} step={step} />
            ))}
          </motion.div>
        </div>

        {/* Pagination — the active dot fades up in yellow */}
        <motion.div
          variants={contentUp}
          className="mt-4 flex justify-center gap-2.5"
        >
          {DATA.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === index}
              aria-label={`Go to route ${i + 1}`}
              className="relative grid h-3 w-3 place-items-center"
            >
              {/* Idle dot — fades out as the ring takes its place, so the
                  ring's centre can stay transparent instead of being painted
                  over with the section's background colour. */}
              <motion.span
                animate={{ opacity: i === index ? 0 : 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="block h-2 w-2 rounded-full bg-[#E5E5E5]"
              />
              {/* Active — a hollow ring, per the design. 2.5px of the 8px
                  leaves a 3px centre, matching the design's ~38% hole. */}
              <motion.span
                animate={{
                  opacity: i === index ? 1 : 0,
                  scale: i === index ? 1 : 0.5,
                }}
                transition={{ duration: 0.35, ease: EASE }}
                className="absolute h-2 w-2 rounded-full border-[2.5px] border-brand-yellow"
              />
            </button>
          ))}
        </motion.div>
        <div className="flex justify-center mt-6">
          <button className="flex items-center gap-1 text-navy font-sans text-base font-semibold leading-[160%]">
            <span>Explore all Trips</span>{" "}
            <RiArrowRightLine className="h-6 text-navy" />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
