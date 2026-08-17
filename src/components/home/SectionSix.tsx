"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import ArrowCta from "@/components/generic/ArrowCta";

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
  link?: string;
};

const PASSES: Pass[] = [
  {
    marker: "dot",
    kicker: "GLOBAL PASS . MOST CHOSEN",
    title: "7 travel days",
    badge: "MOST CHOSEN",
    desc: "Seven days, six to eight cities, one month to see them. Our most popular Pass.",
    price: "€286",
  },
  {
    marker: "ring",
    kicker: "GLOBAL PASS",
    title: "5 travel days",
    desc: "Five travel days, anywhere in the month. Good for four to six cities. A classic first-time pick.",
    price: "€239",
  },
  {
    marker: "ring",
    kicker: "ONE COUNTRY PASS",
    title: "One country in one month",
    desc: "Go all in on one country. Come back feeling like a local. ",
    link: "See One Country Prices",
  },
];

/**
 * The shell only propagates state. It used to carry `staggerChildren: 0.1`,
 * which put the pagination at 0.3s and the footer at 0.4s — both landing while
 * the card cascade was still running past 1.2s. The order below is stated in
 * absolute delays instead of falling out of child order.
 */
const shell: Variants = { hidden: {}, show: {} };

// Heading resolves out of a blur as it rises. No overflow-hidden mask: Poppins
// needs 1.4em of box and the design's line-height is 48px on 48px type, so a
// mask would shear the descender off "Your".
const rise: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

// Follows the heading closely enough to read as one intro, not a second cue.
const blurUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE, delay: 0.1 },
  },
};

// The track deals the cards in one after another, once the intro has landed.
const trackStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.18 } },
};

const cardIn: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: EASE,
      delayChildren: 0.1,
      staggerChildren: 0.05,
    },
  },
};

// Each line of a card: marker, kicker, title, description, price or link.
const contentUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// Ring markers bloom from their own centre.
const markerIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: EASE },
  },
};

// The filled "most chosen" stop gets a single, small overshoot on arrival —
// one pulse, never a loop, and capped so it stays a nudge rather than a bounce.
const markerPulse: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: {
    opacity: 1,
    scale: [0.6, 1.06, 1],
    transition: {
      duration: 0.45,
      ease: EASE,
      scale: { duration: 0.6, ease: EASE, times: [0, 0.62, 1] },
    },
  },
};

/**
 * The badge settles the last few degrees into its resting tilt.
 *
 * This rides an outer wrapper: the flag's 2.43° comes from Tailwind's
 * `rotate-[2.43deg]`, and Framer writing `transform` on that same element would
 * drop the rotation entirely. Nested, the two compose — so this animates
 * -4° → 0° and the design's angle survives underneath.
 */
const badgeIn: Variants = {
  hidden: { opacity: 0, scale: 0.85, rotate: -4 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    // Lands just after the title it sits beside.
    transition: { duration: 0.5, ease: EASE, delay: 0.12 },
  },
};

// A single ripple out of the marker as it lands — the stop registering on the
// line. One shot, never a loop; it is absolutely positioned so it cannot
// disturb the 14px slot the text column is measured against.
const markerPing: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: {
    opacity: [0, 0.45, 0],
    scale: [0.9, 2.3],
    transition: { duration: 0.9, ease: "easeOut", delay: 0.1 },
  },
};

/**
 * The badge's sheen sweeps on a loop rather than once, so the flag keeps
 * drawing the eye. The long pause between passes is what keeps it from reading
 * as a nag: 1.2s of travel, then 2.8s of stillness.
 *
 * It is driven off `useInView` rather than left running, so the loop stops
 * whenever the badge is scrolled or dragged out of sight instead of animating
 * against an offscreen element for the life of the page.
 */
const SHEEN_LOOP = {
  duration: 1.2,
  ease: "easeInOut",
  repeat: Infinity,
  repeatDelay: 2.8,
  delay: 0.5,
} as const;

// The highlighter is struck through the price left to right. scaleX, never
// width — width would be a layout animation. No transition baked in: the
// element supplies one so reduced motion can collapse it to zero.
const highlightIn: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1 },
};

/* Tail of the sequence. Absolute delays so the order holds whatever the cards
   are doing — pagination, then the CTA, then the small print. */
const paginationIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: 0.75 },
  },
};

const ctaIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE, delay: 0.87 },
  },
};

const footerIn: Variants = {
  hidden: { opacity: 0, y: 9 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: EASE,
      delay: 0.98,
      delayChildren: 0.18,
      staggerChildren: 0.06,
    },
  },
};

// The two yellow separators catch up a beat after the line they punctuate.
const sepIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
};

/**
 * Holds the purely decorative overlays — the marker ripple and the badge sheen
 * — inert under reduced motion.
 *
 * They stay in the tree rather than being conditionally rendered: dropping the
 * nodes would make the server markup and the first client render disagree on
 * structure for anyone with the preference set, which is a hydration mismatch.
 */
const inert: Variants = { hidden: { opacity: 0 }, show: { opacity: 0 } };

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * The little route stop beside each pass. Both variants are just a 2px #FFD400
 * circle in the design — the same marker the route lines use elsewhere — so
 * they're drawn in CSS rather than shipped as three image requests for a
 * circle. The fixed 14px slot keeps every card's text column on the same left
 * edge, and the 2px nudge optically centres the marker on the kicker's line.
 */
function Marker({
  variant,
  reduce,
}: {
  variant: Pass["marker"];
  reduce: boolean;
}) {
  return (
    <motion.span
      aria-hidden
      // The pulse is the only keyframed value in the section, so it is the one
      // thing that has to be swapped out rather than just held at its end.
      variants={variant === "dot" && !reduce ? markerPulse : markerIn}
      className="relative mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center"
    >
      {/* Ripple — sits outside the flow entirely so the 14px slot is untouched */}
      <motion.span
        variants={reduce ? inert : markerPing}
        className="pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-brand-yellow"
      />
      <span
        className={
          variant === "dot"
            ? "block h-3.5 w-3.5 rounded-full bg-brand-yellow"
            : "block h-[11px] w-[11px] rounded-full border-2 border-brand-yellow"
        }
      />
    </motion.span>
  );
}

function PassCard({ pass, reduce }: { pass: Pass; reduce: boolean }) {
  // The badge loop only runs while the flag is actually on screen.
  const badgeRef = useRef<HTMLSpanElement>(null);
  const badgeInView = useInView(badgeRef, { amount: 0.5 });

  /**
   * The yellow mark waits for its own row to be visible.
   *
   * Previously it rode the card's entrance variants, which fire when the
   * *section* scrolls in — so the marks on cards two and three finished drawing
   * while they were still parked off to the right, and were already complete by
   * the time you dragged to them. IntersectionObserver reads the horizontal
   * clip of the carousel viewport, so this fires on the drag instead.
   */
  // Two refs because a card renders either a price row or a link, never both;
  // the hooks stay unconditional and the unused one simply never intersects.
  const priceRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLSpanElement>(null);
  const priceInView = useInView(priceRef, { once: true, amount: 0.6 });
  const linkInView = useInView(linkRef, { once: true, amount: 0.6 });
  const markState = priceInView || linkInView ? "show" : "hidden";
  const markTransition = reduce
    ? { duration: 0 }
    : { duration: 0.52, ease: EASE };

  return (
    <motion.article
      variants={cardIn}
      className="flex w-[310px] shrink-0 items-start gap-[15px]"
      // className="flex w-[320px] shrink-0 items-start gap-[15px]"
    >
      <Marker variant={pass.marker} reduce={reduce} />

      <div className="w-[290px] shrink-0 text-navy-1">
        <motion.p
          variants={contentUp}
          className="font-departure text-xs uppercase leading-[18px] tracking-[0.72px]"
        >
          {pass.kicker}
        </motion.p>

        {/* The title row is the badge's positioning context — the design tilts
            the flag slightly and lets it ride alongside the title. */}
        <motion.div variants={contentUp} className="relative mt-1">
          <h3 className="font-sans text-2xl font-semibold leading-6">
            {pass.title}
          </h3>
          {pass.badge && (
            // Outer wrapper carries the Framer transform; the inner keeps
            // Tailwind's 2.43° so the two compose instead of overwriting.
            <motion.span
              ref={badgeRef}
              variants={badgeIn}
              className="absolute left-[175px] top-[3px]"
            >
              <span className="relative grid h-[18px] w-24 overflow-hidden rotate-[2.43deg] place-items-center rounded-[2px] bg-brand-yellow">
                <span className="whitespace-nowrap font-departure text-[10px] leading-[14px] tracking-[0.6px] text-navy-1">
                  {pass.badge}
                </span>
                {/* Looping sheen. overflow-hidden on the flag clips it to the
                    badge; the label is 79px inside a 96px box so it is never
                    itself clipped. Its own initial/animate keeps it out of the
                    card's variant tree, which would otherwise stop it dead
                    after the entrance. */}
                <motion.span
                  aria-hidden
                  initial={{ x: "-180%" }}
                  animate={
                    reduce || !badgeInView
                      ? { x: "-180%" }
                      : { x: ["-180%", "260%"] }
                  }
                  transition={
                    reduce || !badgeInView ? { duration: 0 } : SHEEN_LOOP
                  }
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)",
                  }}
                />
              </span>
            </motion.span>
          )}
        </motion.div>

        {/* Every card reserves three lines so the bottom rows stay level across
            the strip — that's what the design's blank line is doing. The link
            card needs it too, or its CTA floats 18px above the price rows. */}
        <motion.p
          variants={contentUp}
          className="mt-2.5 min-h-[60px] font-sans text-base font-normal leading-[126%] tracking-16"
        >
          {pass.desc}
        </motion.p>

        {pass.price && (
          <div
            ref={priceRef}
            className="relative mt-3.5 flex h-[34px] items-center gap-1"
          >
            {/* Highlighter bar, struck through the lower half of the price.
                Wipes when this row itself reaches the viewport, so each card's
                mark draws as you arrive at it rather than offscreen. */}
            <motion.span
              aria-hidden
              variants={highlightIn}
              initial="hidden"
              animate={markState}
              transition={markTransition}
              className="absolute left-[38px] top-[20.5px] h-[13px] w-[92px] origin-left bg-brand-yellow"
            />
            <motion.span
              variants={contentUp}
              className="relative flex items-center gap-1"
            >
              <span className="w-10 font-sans text-base font-normal leading-[126%] tracking-16">
                from
              </span>
              <span className="whitespace-nowrap font-sans text-[30px] font-semibold leading-[34px]">
                {pass.price}
              </span>
            </motion.span>
          </div>
        )}

        {pass.link && (
          // mt-3.5 + h-[34px] mirrors the price row exactly, so the label
          // optically centres on the same line the prices sit on rather than
          // riding 18px above them.
          <motion.button
            variants={contentUp}
            type="button"
            whileHover={reduce ? undefined : { y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="group mt-3.5 inline-flex h-[34px] items-center font-sans text-base font-semibold leading-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-4"
          >
            {/* The underline hugs the label, not the 34px alignment box, and
                draws on the same viewport cue as the price marks. */}
            <span ref={linkRef} className="relative">
              {pass.link}
              <motion.span
                aria-hidden
                variants={highlightIn}
                initial="hidden"
                animate={markState}
                transition={markTransition}
                className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left bg-brand-yellow"
              />
            </span>
          </motion.button>
        )}
      </div>
    </motion.article>
  );
}

export default function SectionSix() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();

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

  // Keep the current card aligned if the viewport resizes under us.
  useEffect(() => {
    x.set(snaps[clamp(index, 0, snaps.length - 1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snaps]);

  const goTo = useCallback(
    (i: number) => {
      const target = snaps[clamp(i, 0, snaps.length - 1)];
      // Reduced motion jumps rather than glides. Dragging is left alone — it is
      // direct manipulation, not an animation the user didn't ask for.
      if (reduce) {
        x.set(target);
        return;
      }
      // `animate` on a MotionValue stops whatever is already running on it, so
      // rapid clicks retarget rather than stacking competing animations.
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
    <section className="bg-white pt-8 pb-[96px]">
      <motion.div
        variants={shell}
        initial={reduce ? "show" : "hidden"}
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="mx-auto max-w-md"
      >
        {/* Heading */}
        <motion.h2
          variants={rise}
          className="px-6 text-center font-sans text-5xl font-semibold leading-[48px] tracking-1px text-navy-1"
        >
          Your Pass.
          <br />
          Your call.
        </motion.h2>

        <motion.p
          variants={blurUp}
          className="mt-6 px-6 text-center font-sans text-base font-normal leading-[126%] tracking-16 text-navy-1"
        >
          Pick a Pass type and how many days you
          <br />
          want to travel. Everything else is yours to
          <br />
          decide.
        </motion.p>

        {/* Pass strip — drag to scrub, snaps to the nearest card on release */}
        <div className="mt-8">
          {/* The padding lives inside the clipper, not outside it. `overflow`
              clips at the padding box, so these 20px are what give the marker
              ripple room to expand — flush against the track it lost 7px off
              its top. Total height is unchanged; the padding just moved in a
              level, and being vertical it leaves clientWidth (and so maxDrag)
              exactly as it was. */}
          <div ref={viewportRef} className="overflow-hidden py-5">
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
              className={`flex min-h-[176px] select-none items-start gap-5 px-6 ${
                canDrag ? "cursor-grab active:cursor-grabbing" : ""
              }`}
            >
              {PASSES.map((pass) => (
                <PassCard key={pass.title} pass={pass} reduce={reduce} />
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
          variants={paginationIn}
          className="mt-5 flex justify-center gap-[3.5px]"
        >
          {PASSES.map((pass, i) => {
            const active = i === index;
            return (
              <motion.button
                key={pass.title}
                type="button"
                onClick={() => goTo(i)}
                whileTap={reduce ? undefined : { scale: 0.88 }}
                transition={{ duration: 0.18, ease: EASE }}
                aria-current={active}
                aria-label={`Go to pass ${i + 1}`}
                className="relative grid h-3 w-3 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2"
              >
                <motion.span
                  animate={{ opacity: active ? 0 : 1 }}
                  transition={{ duration: reduce ? 0.12 : 0.3, ease: EASE }}
                  className="block h-[6.5px] w-[6.5px] rounded-full bg-[#E5E5E5]"
                />
                {/* Opacity resolves faster than the rise and scale: crossfading
                    both marks on one curve leaves a dip at the midpoint where
                    neither is fully opaque, which reads as a flash. */}
                <motion.span
                  animate={{
                    opacity: active ? 1 : 0,
                    scale: reduce ? 1 : active ? 1 : 0.65,
                    y: reduce ? 0 : active ? 0 : 3,
                  }}
                  transition={
                    reduce
                      ? { duration: 0.12, ease: EASE }
                      : {
                          duration: 0.3,
                          ease: EASE,
                          opacity: { duration: 0.2, ease: EASE },
                        }
                  }
                  className="absolute h-[6.5px] w-[6.5px] rounded-full border-2 border-brand-yellow"
                />
              </motion.button>
            );
          })}
        </motion.div>

        {/* Footer */}
        <div className="mt-8 px-6 text-center">
          <motion.div variants={ctaIn} className="flex justify-center mt-6">
            <ArrowCta label="Compare all Passes" />
          </motion.div>

          <motion.p
            variants={footerIn}
            className="mt-8 font-departure text-xs uppercase leading-[18px] tracking-[0.72px] text-[#AFAFAF]"
          >
            REFUNDABLE 7 DAYS{" "}
            <motion.span
              variants={sepIn}
              className="inline-block text-brand-yellow"
            >
              ·
            </motion.span>
            <br />
            33 COUNTRIES{" "}
            <motion.span
              variants={sepIn}
              className="inline-block text-brand-yellow"
            >
              ·
            </motion.span>{" "}
            FLEXIBLE
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
