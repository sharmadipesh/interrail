"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  cubicBezier,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";

/**
 * Scrim under the traveller's name — the design stacks a 180°-rotated gradient
 * over each photo, which is this read bottom-up. Only the darkest end lands in
 * the padded box where the name sits.
 */
const SCRIM =
  "linear-gradient(0deg, rgba(15,20,28,0.55) 0%, rgba(15,20,28,0.29) 30.769%, rgba(255,255,255,0.05) 51.923%, rgba(255,255,255,0.05) 100%)";

type Story = {
  src: string;
  /** Per-card framing — a couple of these are cropped well off centre. */
  position: string;
  name: string;
  quote: string;
};

const STORIES: Story[] = [
  {
    src: "/images/effect-1.jpg",
    position: "object-bottom",
    name: "Anna Kwan",
    quote:
      "“We made new friends on the train and said ‘see you soon’ instead of ‘goodbye.’”",
  },
  {
    src: "/images/effect-2.jpg",
    position: "object-bottom",
    name: "Francesco Sercia",
    quote:
      "“Solo travel through Europe wasn’t always easy. But it was always worth it.”",
  },
  {
    src: "/images/effect-3.jpg",
    position: "object-bottom",
    name: "Jide Maduako",
    quote: "“Stopped checking my phone. Started checking the view.”",
  },
  {
    src: "/images/effect-4.jpg",
    position: "object-bottom",
    name: "Matt Phipps",
    quote:
      "“Staring out the train window that makes you feel like the main character.”",
  },
  {
    src: "/images/effect-5.jpg",
    position: "object-center",
    name: "Austin Aughinbaugh",
    quote:
      "“I always thought I’d catch my first wave somewhere tropical. Not in Austria.”",
  },
  {
    src: "/images/effect-6.jpg",
    position: "object-bottom",
    name: "Ellie",
    quote:
      "“If I had taken a plane, I wouldn’t have had any of these experiences.”",
  },
  {
    src: "/images/effect-7.jpg",
    position: "object-[60%_50%]",
    name: "Micheal Motamedi",
    quote:
      "“Somewhere along the way, the train started to feel like a metaphor for life.”",
  },
];

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);

/**
 * How far the photo drifts against its own frame, in px each way.
 *
 * The layer is 120% wide offset -10%, so on a 297px card there is 29.7px of
 * slack on each side — 5.7px more than the drift can ever ask for, which is
 * what keeps an edge from creeping into the frame.
 */
const PARALLAX = 24;

/**
 * Light polish on the native scroll signal, mostly to take the step out of a
 * scroll-snap landing.
 *
 * Damping is below the range the brief suggested on purpose: at 28–34 with this
 * stiffness the ratio lands near 2.0 and the photo visibly trails its own frame,
 * which is the one thing a parallax must not do. At 20 the ratio is 1.25 — still
 * incapable of overshooting — and it settles in ~100ms, so the drift reads as
 * depth rather than lag.
 */
const PARALLAX_SPRING = {
  stiffness: 160,
  damping: 20,
  mass: 0.4,
  restDelta: 0.001,
} as const;

const cardIn: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: EASE },
  },
};

// Slow settle out of the frame, cropped by the card's overflow-hidden box.
const kenBurns: Variants = {
  hidden: { scale: 1.1 },
  show: { scale: 1, transition: { duration: 1.2, ease: EASE } },
};

const nameIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: 0.18 },
  },
};

const quoteIn: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: EASE, delay: 0.28 },
  },
};

const paginationIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay: 0.55 },
  },
};

const ctaIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE, delay: 0.7 },
  },
};

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
   * Two gates, both latching.
   *
   * The strip is the intersection root, so a card parked off to the right is
   * not "in view" however far down the page you are — that is what stops all
   * seven finishing their entrance before you have scrolled to them. But the
   * strip alone would call card one visible the moment it mounts, so the page
   * viewport has to agree too: the first card then reveals as the section
   * arrives, and the rest as you reach them horizontally.
   *
   * `amount: "some"` — any sliver counts — and that is deliberate rather than
   * lazy. A fractional threshold leaves a dead band: at a 436px viewport the
   * second card occupies 32% of the strip, so a 0.35 threshold rendered it as
   * a blank slot next to the first. How much of a card happens to be showing
   * is not the question; whether the reader can see it is, and the moment any
   * edge clears the scrollport the answer is yes.
   */
  const inStrip = useInView(cardRef, {
    root: viewportRef,
    amount: "some",
    once: true,
  });
  const show = reduce || (sectionInView && inStrip);

  /**
   * Progress of this card across the strip's scrollport, straight from the
   * browser's own scroll position — framer listens to the container, so there
   * is no window listener and nothing kept in React state.
   *
   * 0 is the card fully off to the right, 1 fully off to the left. As it rises
   * the card travels left, so the photo's offset rises with it (drifting
   * right): the image covers less ground than its frame, which is the slower
   * background that reads as depth.
   */
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
      className="flex w-[297px] shrink-0 snap-start flex-col gap-[21.704px]"
    >
      <div className="relative flex h-[396px] flex-col justify-end overflow-hidden px-[27.415px] py-[36.554px]">
        {/* Ken Burns and drift sit on separate layers so neither has to share a
            transform with the other, and both sit under the scrim and the name,
            which stay pinned to the frame. */}
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
        <motion.p
          variants={nameIn}
          className="relative font-sans text-[20px] font-semibold leading-[22.846px] tracking-[-0.2px] text-white"
        >
          {story.name}
        </motion.p>
      </div>

      <motion.blockquote
        variants={quoteIn}
        className="font-sans text-[20px] font-semibold leading-[22.846px] tracking-[-0.2px] text-navy-1"
      >
        {story.quote}
      </motion.blockquote>
    </motion.article>
  );
}

export default function SectionNine() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();

  // Gates the first card so it waits for the section rather than firing while
  // SectionEight is still the thing being looked at.
  const sectionInView = useInView(sectionRef, { amount: 0.2, once: true });

  const [active, setActive] = useState(0);

  /**
   * Active dot = whichever card is showing the most of itself.
   *
   * Picking the maximum ratio rather than tripping a single threshold is what
   * keeps this stable on wide screens, where several cards are fully visible at
   * once and a fixed threshold would let the last observer callback win. State
   * is written only when the winner actually changes, so scrolling does not
   * re-render the strip.
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
          // Strict `>` leaves ties with the leftmost card, which is the one a
          // reader would call current.
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
    // pt is the gap the design leaves between this and the hero above.
    <motion.section
      ref={sectionRef}
      initial={reduce ? "show" : "hidden"}
      animate={sectionInView || reduce ? "show" : "hidden"}
      className="bg-white pb-12 pt-[60px]"
    >
      {/* Story strip — scroll-snaps horizontally; scroll-pl-6 keeps a snapped
          card against the page gutter rather than the viewport edge. */}
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

      <div className="mt-8 flex flex-col items-center gap-6">
        {/* Pagination — the active dot rises and fades up in yellow */}
        <motion.div
          variants={paginationIn}
          className="flex items-center gap-[9px]"
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
                aria-label={`Go to story ${i + 1}`}
                // before: opens the hit area to 22.5px without touching layout,
                // which the 9px gap absorbs without neighbours overlapping.
                className="relative grid h-3 w-3 place-items-center rounded-full before:absolute before:-inset-1 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2"
              >
                <motion.span
                  animate={{ opacity: current ? 0 : 1 }}
                  transition={{ duration: reduce ? 0.12 : 0.3, ease: EASE }}
                  className="block h-[6.5px] w-[6.5px] rounded-full bg-[#E5E5E5]"
                />
                {/* Opacity resolves faster than the rise and scale: crossfading
                    both marks on one curve leaves a dip at the midpoint where
                    neither is opaque, which reads as a flash. */}
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

        <motion.button
          variants={ctaIn}
          type="button"
          whileHover={reduce ? undefined : { y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="group relative flex items-center gap-1.5 font-sans text-base font-semibold leading-[1.4] text-[#0F141C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-4"
        >
          Explore Their Trips
          {/* Hover motion is CSS and gated to devices that actually hover, so it
              cannot stick on a touch screen after a tap. */}
          <Image
            src="/images/effect-arrow.svg"
            alt=""
            aria-hidden
            width={8}
            height={7}
            unoptimized
            className="transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover:translate-x-[5px] motion-reduce:transition-none motion-reduce:[@media(hover:hover)]:group-hover:translate-x-0"
          />
          <span
            aria-hidden
            className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand-yellow transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-x-100"
          />
        </motion.button>
      </div>
    </motion.section>
  );
}
