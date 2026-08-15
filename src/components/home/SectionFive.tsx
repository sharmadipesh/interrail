"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import ArrowCta from "@/components/generic/ArrowCta";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

// Gap between cards, in px. Must mirror the `gap-5` on the track.
const GAP = 20;

const DATA = [
  {
    src: "section-4.1.png",
    dest: ["STRASBOURG", "BASEL", "LUCERNE", "ZURICH", "INNSBRUCK"],
    desc: "Start with risotto, end with Roman ruins. Six stops in Italy. Always with a long lunch somewhere on the way.",
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

/**
 * The section shell only propagates state. It used to carry
 * `staggerChildren: 0.1`, which put the pagination at 0.1s and the CTA at 0.2s
 * — both landing while the cards were still arriving, since the track's own
 * cascade runs past a second. Ordering is now stated explicitly below instead
 * of falling out of child order.
 */
const shell: Variants = { hidden: {}, show: {} };

// The track deals the cards in one after another.
const trackStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.12 } },
};

/**
 * Card lifts + fades in, then resolves its own content.
 *
 * Trimmed from y:64/scale:0.96 to bring it into line with the rest of the page
 * — SectionFour now enters at 36px — so the two read as one motion language
 * rather than the strip heaving in harder than the section above it.
 */
const cardIn: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.85,
      ease: EASE,
      staggerChildren: 0.08,
      delayChildren: 0.14,
    },
  },
};

const contentUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// The overlay row sits on the photo, so it rises a shorter distance than the
// copy below the frame — it reads as settling onto the image rather than
// arriving. Shared by the itinerary link and the price; because they are two
// separate variant children, the card's own 0.08 stagger deals them in left to
// right without either needing a delay of its own.
const overlayIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

// Slow zoom-out on reveal, cropped by the card's overflow-hidden frame. 1.22
// was a stronger push than anything else on the page; 1.14 still reads as a
// settle without the photo visibly rushing backwards.
const kenBurns: Variants = {
  hidden: { scale: 1.14 },
  show: { scale: 1, transition: { duration: 1.3, ease: EASE } },
};

// Pagination and CTA land after the strip. The delays are absolute rather than
// stagger-derived so the order holds regardless of how long the cards take.
const paginationIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE, delay: 0.55 },
  },
};

const ctaIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE, delay: 0.72 },
  },
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

type Item = (typeof DATA)[number];

/**
 * One pagination mark.
 *
 * Activeness is derived from the track position rather than the committed
 * index, so the mark tracks the drag continuously instead of flipping the
 * instant you cross the midpoint between two snaps. On release it rides the
 * same snap spring the cards do, so indicator and strip settle together.
 *
 * The normalisation is by the gap to whichever neighbour the track is heading
 * toward, not by the card pitch. That distinction matters at the end of the
 * strip: the last snap is clamped short of a full pitch, so dividing by `step`
 * would leave the second-to-last mark showing ~22% yellow while the last one
 * is fully lit.
 */
function Dot({
  i,
  x,
  snaps,
  step,
  isCurrent,
  reduce,
  onSelect,
}: {
  i: number;
  x: MotionValue<number>;
  snaps: number[];
  step: number;
  isCurrent: boolean;
  reduce: boolean;
  onSelect: () => void;
}) {
  // A snap that duplicates an earlier one is unreachable: the track clamps at
  // the end, so several marks can share a resting position and would otherwise
  // all light at once. `nearest()` breaks those ties by returning the first
  // index, so this mirrors it — without the guard, a viewport wide enough that
  // nothing scrolls collapses every snap to 0 and lights all three.
  const reachable = snaps.indexOf(snaps[i]) === i;

  const proximity = useTransform(x, (v) => {
    if (!step || !snaps.length) return i === 0 ? 1 : 0;
    if (!reachable) return 0;
    const d = v - snaps[i];
    if (d === 0) return 1;
    const neighbour = d > 0 ? snaps[i - 1] : snaps[i + 1];
    const gap =
      neighbour === undefined ? step : Math.abs(neighbour - snaps[i]) || step;
    return clamp(1 - Math.abs(d) / gap, 0, 1);
  });

  // Reduced motion keeps the mark legible but drops the travel — it reads as a
  // plain swap rather than a rise.
  const dotOpacity = useTransform(proximity, (p) =>
    reduce ? (p > 0.5 ? 0 : 1) : 1 - p,
  );
  const ringOpacity = useTransform(proximity, (p) =>
    reduce ? (p > 0.5 ? 1 : 0) : p,
  );
  const ringScale = useTransform(proximity, (p) =>
    reduce ? 1 : 0.65 + 0.35 * p,
  );
  const ringY = useTransform(proximity, (p) => (reduce ? 0 : 4 * (1 - p)));

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={reduce ? undefined : { scale: 0.88 }}
      transition={{ duration: 0.18, ease: EASE }}
      // aria-current stays on the committed index so assistive tech always
      // reports exactly one current item, whatever the marks are mid-drag.
      aria-current={isCurrent}
      aria-label={`Go to route ${i + 1}`}
      // before: pushes the hit area out to 28px without touching layout, so the
      // 8px dot keeps its spacing but stays tappable.
      className="relative grid h-3 w-3 place-items-center rounded-full before:absolute before:-inset-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2"
    >
      {/* Idle dot — fades out as the ring takes its place, so the ring's centre
          can stay transparent instead of being painted over with the section's
          background colour. */}
      <motion.span
        style={{ opacity: dotOpacity }}
        className="block h-2 w-2 rounded-full bg-[#E5E5E5]"
      />
      {/* Active — a hollow ring, per the design. 2.5px of the 8px leaves a 3px
          centre, matching the design's ~38% hole. */}
      <motion.span
        style={{ opacity: ringOpacity, scale: ringScale, y: ringY }}
        className="absolute h-2 w-2 rounded-full border-[2.5px] border-brand-yellow"
      />
    </motion.button>
  );
}

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
      className="w-[81%] max-w-[313px] shrink-0"
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

        {/* Scrim — these photos run bright in the lower right (sky, glass), so
            the price needs something under it. Sits outside the parallax layer
            so it stays pinned to the frame while the photo drifts. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 from-0% to-transparent to-20%"
        />

        {/* Overlay row — link left, price right, along the foot of the frame.
            The row is what carries the absolute placement now. Previously only
            the price was absolute and the flex wrapper was left in flow, which
            broke it two ways: `justify-between` had a single in-flow item to
            distribute, so it did nothing, and the wrapper was the frame's only
            in-flow child, so it collapsed to the top edge and printed the
            yellow link across the top of the photo. Both controls sit in flow
            here and the row is pinned to the bottom instead.

            13px each side mirrors the price's original inset, and `bottom-3`
            keeps it on the scrim above, which is graded for exactly this. */}
        <div className="absolute inset-x-[13px] bottom-3 flex items-baseline justify-between gap-3">
          <motion.button
            type="button"
            variants={overlayIn}
            // Scale only. The entrance owns opacity and y, and a gesture that
            // animated either would fight it mid-reveal.
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="group relative shrink-0 font-sans text-sm font-semibold leading-[125%] tracking-14 text-brand-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          >
            View this Itinerary
            {/* The page's underline idiom, and CSS rather than a framer value
                so it cannot stick after a tap on a touch screen — the hover
                query simply never matches there. */}
            <span
              aria-hidden
              className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand-yellow transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-x-100 motion-reduce:transition-none"
            />
          </motion.button>

          <motion.div
            variants={overlayIn}
            className="flex shrink-0 items-baseline gap-1 font-sans text-sm leading-[130%]"
          >
            <span className="font-normal text-white tracking-16">from</span>
            <span className="font-semibold text-brand-yellow tracking-14">
              $389
            </span>
          </motion.div>
        </div>
      </div>

      {/* Route chips */}
      <motion.div
        variants={contentUp}
        className="mt-6 flex flex-wrap items-center gap-x-1.5 font-departure font-normal text-xs uppercase tracking-[0.72px] text-navy"
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
  const reduce = useReducedMotion();

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
      const target = snaps[clamp(i, 0, snaps.length - 1)];
      // Reduced motion jumps rather than glides. Dragging stays untouched — it
      // is direct manipulation, not an animation the user didn't ask for.
      if (reduce) {
        x.set(target);
        return;
      }
      // `animate` on a MotionValue stops whatever was already running on it, so
      // rapid clicks retarget instead of stacking competing animations.
      animate(x, target, {
        type: "spring",
        stiffness: 260,
        damping: 34,
        mass: 0.9,
      });
    },
    [x, snaps, reduce],
  );

  const canDrag = maxDrag > 0;

  return (
    <section className="bg-white pb-[68px]">
      <motion.div
        variants={shell}
        whileInView="show"
        className="mx-auto max-w-md"
        initial={reduce ? "show" : "hidden"}
        viewport={{ once: true, amount: 0.25 }}
      >
        {/* Carousel — drag to scrub, snaps to the nearest card on release */}
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
            className={`flex select-none gap-5 px-6 ${
              canDrag ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            {DATA.map((item, i) => (
              <Card key={i} item={item} index={i} x={x} step={step} />
            ))}
          </motion.div>
        </div>

        {/* Pagination — the active dot rises and fades up in yellow */}
        <motion.div
          variants={paginationIn}
          className="mt-6 flex justify-center gap-2.5"
        >
          {DATA.map((_, i) => (
            <Dot
              key={i}
              i={i}
              x={x}
              step={step}
              snaps={snaps}
              reduce={!!reduce}
              isCurrent={i === index}
              onSelect={() => goTo(i)}
            />
          ))}
        </motion.div>

        {/* Explore all Trips — lands last in the sequence */}
        <motion.div variants={ctaIn} className="flex justify-center mt-6">
          <ArrowCta label="Explore all Trips" />
        </motion.div>
      </motion.div>
    </section>
  );
}
