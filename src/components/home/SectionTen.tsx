"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  cubicBezier,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";

/**
 * Scrim over each photo so the quote and name stay legible — darkest at the
 * top where the quote sits, clearing to almost nothing by the midpoint.
 */
const SCRIM =
  "linear-gradient(180deg, rgba(15,20,28,0.55) 0%, rgba(15,20,28,0.4) 30.769%, rgba(255,255,255,0.05) 51.923%, rgba(255,255,255,0.05) 100%)";

type Story = {
  src: string;
  /** Per-card framing — the design crops a few of these off-centre. */
  position: string;
  quote: string;
  name: string;
};

const STORIES: Story[] = [
  {
    src: "/images/community-1.jpg",
    position: "object-right",
    quote:
      "“The pleasure of moving slowly, by train and by foot, still lingers.”",
    name: "Maya",
  },
  {
    src: "/images/community-2.jpg",
    position: "object-center",
    quote:
      "“We no longer think of the journey as the thing standing between us and the holiday. The journey has become a ritual.”",
    name: "Seth Amstrong",
  },
  {
    src: "/images/community-3.jpg",
    position: "object-center",
    quote:
      "“The time spent with my friends became even more intense and special”",
    name: "Anna & her Friends",
  },
  {
    src: "/images/community-4.jpg",
    position: "object-bottom",
    quote:
      "“Interrail encourages you to bond together as a family in a way that makes the average package holiday seem rather dull.”",
    name: "Seth Amstrong",
  },
  {
    src: "/images/community-5.jpg",
    position: "object-right",
    quote:
      "“Our family enjoyed exploring new places we’ve never been before and being able to find the right balance.”",
    name: "Seth Amstrong",
  },
  {
    src: "/images/community-6.jpg",
    position: "object-center",
    quote:
      "“Our route took us over thousands of miles. Every part of it was worth it.”",
    name: "Seth Amstrong",
  },
];

/* ------------------------------------------------------------------ *
 * Motion system
 * ------------------------------------------------------------------ */

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);

type Range = readonly [number, number];

/** Same route spring the other drawn line on the page uses. */
const ROUTE_SPRING = {
  stiffness: 120,
  damping: 16,
  mass: 0.4,
  restDelta: 0.0001,
} as const;

/** Same light polish SectionNine puts on its native horizontal scroll. */
const PARALLAX_SPRING = {
  stiffness: 160,
  damping: 20,
  mass: 0.4,
  restDelta: 0.001,
} as const;

/**
 * One timeline. The route owns the scroll progress and the copy hangs off the
 * same value, so this reads as a single gesture rather than three components
 * each noticing the viewport on their own.
 *
 * Grey leads, yellow chases. Yellow is also only 68.5% of grey's length in the
 * artwork, so the signal trails permanently by geometry as well as by timing.
 */
const GREY: Range = [0.0, 0.72];
const YELLOW: Range = [0.13, 0.95];
const HEADLINE: Range = [0.55, 0.85];
const PARAGRAPH: Range = [0.68, 0.95];

/**
 * Where each station sits along the yellow polyline, measured from the path
 * data rather than eyeballed — so a stop lights up when the signal actually
 * reaches it. The last one is the path's own terminus, which is why it blooms
 * exactly as the line lands.
 */
const STOPS = [0.0564, 0.539, 1] as const;
const DWELL = 0.09;

/** Drift each way, in px. The layer is 120% wide, so a 297px card has 29.7px
 *  of slack per side — 5.7px more than the drift can ask for. */
const PARALLAX = 24;

function stopWindow([from, to]: Range, at: number): Range {
  const start = from + at * (to - from);
  return [start, Math.min(1, start + DWELL)];
}

const cardIn: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: EASE },
  },
};

const kenBurns: Variants = {
  hidden: { scale: 1.1 },
  show: { scale: 1, transition: { duration: 1.15, ease: EASE } },
};

const quoteIn: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE, delay: 0.18 },
  },
};

const nameIn: Variants = {
  hidden: { opacity: 0, y: 11 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: 0.3 },
  },
};

const paginationIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: 0.45 },
  },
};

/**
 * Draws a stroke on as progress moves through `range`.
 *
 * Linear on purpose — an ease here makes the line lurch away then crawl, which
 * reads as uneven when it is pinned to the wheel. The spring supplies the
 * smoothing. The opacity ramp matters too: these paths use round linecaps, so a
 * zero-length dash still paints a dot until the stroke is faded in.
 */
function useDraw(progress: MotionValue<number>, [from, to]: Range) {
  const pathLength = useTransform(progress, [from, to], [0, 1]);
  const opacity = useTransform(progress, [from, from + 0.01], [0, 1]);
  return { pathLength, opacity };
}

/**
 * A headline line rising out of its mask.
 *
 * The offset is built through a template rather than interpolating "110%" →
 * "0%" directly: a string output range resolves to useTransform's map overload
 * and hands back an object instead of a MotionValue.
 */
function useReveal(progress: MotionValue<number>, [from, to]: Range) {
  const opacity = useTransform(progress, [from, to], [0, 1], { ease: EASE });
  const offset = useTransform(progress, [from, to], [110, 0], { ease: EASE });
  const y = useMotionTemplate`${offset}%`;
  return { opacity, y };
}

/**
 * A station on the route.
 *
 * The scale rides a wrapping group so the `<circle>` keeps its own geometry and
 * its gradient keeps the userSpaceOnUse coordinates the artwork defines —
 * scaling the circle itself would drag the gradient with it.
 */
function Stop({
  cx,
  cy,
  gradient,
  progress,
  range,
}: {
  cx: number;
  cy: number;
  gradient: string;
  progress: MotionValue<number>;
  range: Range;
}) {
  const [from, to] = range;
  const opacity = useTransform(progress, [from, to], [0, 1], { ease: EASE });
  const scale = useTransform(progress, [from, to], [0.5, 1], { ease: EASE });

  return (
    <motion.g style={{ opacity, scale }}>
      <circle
        cx={cx}
        cy={cy}
        r="4"
        fill="white"
        stroke={`url(#${gradient})`}
        strokeWidth="2"
      />
    </motion.g>
  );
}

function StopGradient({ id, cy }: { id: string; cy: number }) {
  return (
    <linearGradient
      id={id}
      x1="0"
      y1={cy - 5}
      x2="0"
      y2={cy + 5}
      gradientUnits="userSpaceOnUse"
    >
      <stop stopColor="#FEBC22" />
      <stop offset="1" stopColor="#FFD400" />
    </linearGradient>
  );
}

const GREY_D =
  "M5.39163 19.9203L19.8635 20.4146L46.0201 20.3125L59.2239 22.0627L64.7983 24.2442L68.3994 21.4481L107.787 20.5661L114.019 24.4068L129.427 27.6328L133.875 44.7934L145.038 65.8955L162.263 79.6453L190.189 85.4925L251.929 88.2762L280.459 100.843L323.312 109.815L359.078 104.625L365.561 112.068L408.414 121.041L414.795 128.97";
const YELLOW_D =
  "M5.39163 19.9203L19.8635 20.4146L46.0201 20.3125L59.2239 22.0627L64.7983 24.2442L68.3994 21.4481L107.787 20.5661L114.019 24.4068L129.427 27.6328L133.875 44.7934L145.038 65.8955L162.263 79.6453L190.189 85.4925L251.929 88.2762L280.459 100.843";

/** The community route, inline so its two strokes and three stops can be
 *  drawn individually. Geometry, widths, caps and gradients are the artwork's. */
function CommunityRoute({ progress }: { progress: MotionValue<number> }) {
  const uid = useId().replace(/:/g, "");
  const a = `${uid}-a`;
  const b = `${uid}-b`;
  const c = `${uid}-c`;

  const grey = useDraw(progress, GREY);
  const yellow = useDraw(progress, YELLOW);

  return (
    <svg
      viewBox="0 0 423.646 132.371"
      preserveAspectRatio="none"
      overflow="visible"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 h-full w-full"
    >
      <motion.path
        d={GREY_D}
        stroke="#AFAFAF"
        strokeWidth="2"
        strokeLinecap="round"
        style={grey}
      />
      <motion.path
        d={YELLOW_D}
        stroke="#FFD400"
        strokeWidth="2"
        strokeLinecap="round"
        style={yellow}
      />

      {/* In route order — the signal passes 23 long before 146 or 281. */}
      <Stop
        cx={23}
        cy={20}
        gradient={c}
        progress={progress}
        range={stopWindow(YELLOW, STOPS[0])}
      />
      <Stop
        cx={146}
        cy={65}
        gradient={a}
        progress={progress}
        range={stopWindow(YELLOW, STOPS[1])}
      />
      <Stop
        cx={281}
        cy={101}
        gradient={b}
        progress={progress}
        range={stopWindow(YELLOW, STOPS[2])}
      />

      <defs>
        <StopGradient id={a} cy={65} />
        <StopGradient id={b} cy={101} />
        <StopGradient id={c} cy={20} />
      </defs>
    </svg>
  );
}

function StoryCard({
  story,
  viewportRef,
  sectionInView,
  reduce,
}: {
  story: Story;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  sectionInView: boolean;
  reduce: boolean;
}) {
  const cardRef = useRef<HTMLElement>(null);

  /**
   * Two latching gates, the same pair SectionNine settled on. The strip is the
   * intersection root so a card parked off to the right never counts as seen,
   * and the page viewport has to agree as well so card one waits for the
   * section instead of firing on mount. `amount: "some"` rather than a
   * fraction — a partly-peeking card is visible to the reader, and a threshold
   * leaves it rendering as a blank slot at some viewport widths.
   */
  const inStrip = useInView(cardRef, {
    root: viewportRef,
    amount: "some",
    once: true,
  });
  const show = reduce || (sectionInView && inStrip);

  // Straight from the container's own scroll position: 0 is the card fully off
  // to the right, 1 fully off to the left. The photo's offset rises with it, so
  // the image covers less ground than its frame — the slower background reads
  // as depth.
  const { scrollXProgress } = useScroll({
    container: viewportRef,
    target: cardRef,
    axis: "x",
    offset: ["start end", "end start"],
  });
  const smoothed = useSpring(scrollXProgress, PARALLAX_SPRING);
  const drift = useTransform(smoothed, [0, 1], [-PARALLAX, PARALLAX]);

  return (
    <motion.article
      ref={cardRef}
      variants={cardIn}
      initial={reduce ? "show" : "hidden"}
      animate={show ? "show" : "hidden"}
      className="relative h-[396px] w-[297px] shrink-0 snap-start overflow-hidden"
    >
      {/* Ken Burns and drift on separate layers — one transform each — and both
          beneath the scrim and figure, which stay pinned to the frame. */}
      <motion.div variants={kenBurns} className="absolute inset-0">
        <motion.div
          style={{ x: reduce ? 0 : drift }}
          className="absolute inset-y-0 -left-[10%] w-[120%]"
        >
          <Image
            fill
            src={story.src}
            alt={story.name}
            draggable={false}
            sizes="357px"
            className={`select-none object-cover ${story.position}`}
          />
        </motion.div>
      </motion.div>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: SCRIM }}
      />

      <figure className="relative flex h-full flex-col justify-between px-6 py-9">
        <motion.blockquote
          variants={quoteIn}
          className="font-departure text-sm leading-[1.1] text-white"
        >
          {story.quote}
        </motion.blockquote>
        <motion.figcaption
          variants={nameIn}
          className="font-sans text-[18px] font-semibold leading-5 tracking-[-0.18px] text-white"
        >
          {story.name}
        </motion.figcaption>
      </figure>
    </motion.article>
  );
}

export default function SectionTen() {
  const sectionRef = useRef<HTMLElement>(null);
  const routeRef = useRef<HTMLSpanElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();

  const sectionInView = useInView(sectionRef, { amount: 0.15, once: true });

  /**
   * The route's own crossing drives the whole opening: it starts as the line
   * noses in and closes with its tail above centre, which is also when the
   * headline has climbed to a comfortable reading height.
   */
  const { scrollYProgress } = useScroll({
    target: routeRef,
    offset: ["start 0.92", "end 0.55"],
  });
  const smoothed = useSpring(scrollYProgress, ROUTE_SPRING);
  const settled = useMotionValue(1);
  const progress = reduce ? settled : smoothed;

  const line1 = useReveal(progress, HEADLINE);
  const line2 = useReveal(progress, [
    HEADLINE[0] + 0.1,
    HEADLINE[1] + 0.1,
  ] as Range);
  const paraOpacity = useTransform(progress, [...PARAGRAPH], [0, 1], {
    ease: EASE,
  });
  const paraY = useTransform(progress, [...PARAGRAPH], [18, 0], {
    ease: EASE,
  });

  const [active, setActive] = useState(0);

  /**
   * Active dot = whichever card shows the most of itself. Taking the maximum
   * ratio rather than tripping a threshold keeps it stable on wide screens
   * where several cards are fully visible at once; state is written only when
   * the winner changes, so scrolling never re-renders the strip.
   */
  useEffect(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;

    const cards = Array.from(track.children) as HTMLElement[];
    const ratios = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        let best = 0;
        let bestRatio = -1;
        cards.forEach((card, i) => {
          const ratio = ratios.get(card) ?? 0;
          // Strict `>` leaves ties with the leftmost card.
          if (ratio > bestRatio + 0.001) {
            bestRatio = ratio;
            best = i;
          }
        });
        setActive((prev) => (prev === best ? prev : best));
      },
      { root: vp, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  // Native scrolling, so scroll-snap and scroll-padding-left both still apply.
  const goTo = useCallback(
    (i: number) => {
      const card = trackRef.current?.children[i] as HTMLElement | undefined;
      card?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        inline: "start",
        block: "nearest",
      });
    },
    [reduce],
  );

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-white pb-8 pt-48"
    >
      {/* Route line running in from the top-left corner */}
      <span
        ref={routeRef}
        aria-hidden
        className="pointer-events-none absolute -left-[11px] top-0 block h-[132.371px] w-[423.646px]"
      >
        <CommunityRoute progress={progress} />
      </span>

      {/* Two clips float over the copy, half off each edge. Figma exports these
          as empty layers because they carry video fills, so the frames are laid
          out here and stay empty until the clips are supplied. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[328px] top-[204px] h-[115px] w-[154px] overflow-hidden rounded-[9px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[106px] top-[281px] h-[115px] w-[154px] overflow-hidden rounded-[9px]"
      />

      <div className="relative mx-auto max-w-md">
        {/* Heading */}
        <div className="mx-auto flex w-[281px] max-w-full flex-col items-center gap-6 px-6 text-center text-navy-1">
          <h2 className="font-sans text-5xl font-semibold leading-[48px] tracking-1px">
            {/* Each line rises out of its own mask. The 4px of padding is what
                keeps the descender on "Trips" — the design's line box is 48px
                on 48px type, which cuts ~3px off the tail — and the matching
                negative margin hands that space straight back to the layout. */}
            <span className="block overflow-hidden pb-1 -mb-1">
              <motion.span style={reduce ? undefined : line1} className="block">
                9 Million
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-1 -mb-1">
              <motion.span style={reduce ? undefined : line2} className="block">
                Trips
              </motion.span>
            </span>
          </h2>
          <motion.p
            style={reduce ? undefined : { opacity: paraOpacity, y: paraY }}
            className="font-sans text-base font-normal leading-[126%] tracking-16"
          >
            Nearly nine million trips taken. Even more memories made along the
            way.
          </motion.p>
        </div>

        {/* Story strip — scroll-snaps horizontally */}
        <div className="mt-[106px]">
          {/* scroll-pl-6 so a snapped card rests against the page gutter
              rather than flush to the viewport edge, which would swallow the
              track's own left padding. */}
          <div
            ref={viewportRef}
            className="snap-x snap-mandatory scroll-pl-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div ref={trackRef} className="flex w-max gap-5 px-6">
              {STORIES.map((story) => (
                <StoryCard
                  key={story.src}
                  story={story}
                  viewportRef={viewportRef}
                  sectionInView={sectionInView}
                  reduce={reduce}
                />
              ))}
            </div>
          </div>

          {/* Pagination — the active dot rises and fades up in yellow */}
          <motion.div
            variants={paginationIn}
            initial={reduce ? "show" : "hidden"}
            animate={sectionInView || reduce ? "show" : "hidden"}
            className="mt-[42px] flex items-center gap-[8.76px] px-6"
          >
            {STORIES.map((story, i) => {
              const current = i === active;
              return (
                <motion.button
                  key={story.src}
                  type="button"
                  onClick={() => goTo(i)}
                  whileTap={reduce ? undefined : { scale: 0.88 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  aria-current={current}
                  aria-label={`Go to story ${i + 1}: ${story.name}`}
                  // before: opens the hit area without touching layout, which
                  // the 8.76px gap absorbs without neighbours overlapping.
                  className="relative grid h-3 w-3 place-items-center rounded-full before:absolute before:-inset-1 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2"
                >
                  <motion.span
                    animate={{ opacity: current ? 0 : 1 }}
                    transition={{ duration: reduce ? 0.12 : 0.3, ease: EASE }}
                    className="block h-[6.5px] w-[6.5px] rounded-full bg-[#E5E5E5]"
                  />
                  {/* Opacity resolves faster than the rise and scale:
                      crossfading both marks on one curve leaves a dip at the
                      midpoint where neither is opaque, which reads as a flash. */}
                  <motion.span
                    animate={{
                      opacity: current ? 1 : 0,
                      scale: reduce ? 1 : current ? 1 : 0.65,
                      y: reduce ? 0 : current ? 0 : 3,
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
        </div>
      </div>
    </section>
  );
}
