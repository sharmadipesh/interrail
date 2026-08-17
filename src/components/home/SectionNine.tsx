"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import ArrowCta from "@/components/generic/ArrowCta";
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

/**
 * Opacity only — the card must never carry a transform.
 *
 * This used to reveal with `y: 34` and `scale: 0.985`. Both are transforms on
 * the element that holds the photo, and the reveal is triggered by scroll
 * position, so the card was translating *against* the page at the exact moment
 * the page was moving under it. Measured, the frame's document anchor
 * (`top + scrollY`, which is fixed for anything that only moves with the page)
 * swung 37.7px while it played.
 *
 * That is the jump: not the photo drifting inside the card, but the whole card
 * — photo, scrim and name together — lurching against the scroll. It shows only
 * when the strip is partly on screen because that is when the trigger fires; by
 * the time the strip is fully in view the transform has already resolved to 0,
 * and offscreen it has not started.
 *
 * A fade has no such failure mode: opacity does not move anything, so the card
 * now holds exactly the position the document gives it at every scroll offset.
 */
const cardIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.8, ease: EASE },
  },
};

/** Sits over the photo, so it fades rather than slides for the same reason. */
const nameIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.55, ease: EASE, delay: 0.18 },
  },
};

/**
 * No `y` here either. A downward transform on a card's child counts toward the
 * strip's scrollable overflow, which is what made the strip scrollable on an
 * axis it has no business scrolling on. It would also be the one thing the
 * strip's new `overflow-y: hidden` could clip.
 */
const quoteIn: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)" },
  show: {
    opacity: 1,
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
      className="flex w-[297px] shrink-0 snap-start flex-col gap-5"
    >
      <div className="relative flex h-[396px] flex-col justify-end overflow-hidden px-[27.415px] py-[36.554px]">
        {/* One layer, carrying one transform: the horizontal drift.

            There used to be a Ken Burns layer above this one settling the photo
            from scale 1.1 to 1 over the entrance. A uniform scale inside a
            fixed frame is vertical movement as much as horizontal — it sat the
            photo 19.5px high in its 396px frame and walked it back down — and
            because the entrance is gated on the section being 20% on screen, it
            ran while the strip itself was still climbing into view. The photo
            drifted against its own frame at exactly the moment the frame was
            moving, which read as the image sliding inside the card.

            The drift below is horizontal only and is driven by the strip's own
            scrollLeft, never the page's scrollY, so the photo now holds its
            vertical position in the frame no matter where the card sits. */}
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

        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: SCRIM }}
        />
        <motion.p
          variants={nameIn}
          className="relative font-sans text-[20px] font-semibold leading-[22px] tracking-[-0.2px] text-white"
        >
          {story.name}
        </motion.p>
      </div>

      <motion.blockquote
        variants={quoteIn}
        className="font-sans text-[20px] font-semibold leading-[22px] tracking-[-0.2px] text-navy-1"
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
      className="bg-white pb-11 pt-[60px]"
    >
      {/* Story strip — scroll-snaps horizontally; scroll-pl-6 keeps a snapped
          card against the page gutter rather than the viewport edge. */}
      {/* overflow-y-hidden is load-bearing, not tidying.

          `overflow-x: auto` on its own leaves `overflow-y: visible`, and CSS
          does not allow that pairing: a `visible` axis computes to `auto` when
          the other axis is not visible. So this strip was silently a *vertical*
          scroll container as well, with ~20px of scrollable range coming from
          the not-yet-revealed cards' downward `y` transforms — transformed
          boxes count toward scrollable overflow.

          With the pointer over the strip, the browser scrolls the innermost
          scrollable ancestor on that axis first, so a page scroll was being
          spent sliding the cards up inside the strip before the page moved at
          all, and giving it back on the way up. That is the image sliding up
          and down, and it only showed while the strip was under the cursor —
          i.e. while it was partly on screen.

          Pinning the axis means a page scroll can never be absorbed here. */}
      <div
        ref={viewportRef}
        className="snap-x snap-mandatory scroll-pl-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      <div className="mt-6 flex flex-col items-center gap-6">
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

        {/* The only host that makes the button its own entrance target, and the
            only one a size apart: 1.5 of gap against the others' 1, and the
            design's 1.4 leading rather than 160%. */}
        <ArrowCta
          label="View Their Trips"
          variants={ctaIn}
          className="gap-1.5 font-sans text-base font-semibold leading-[1.4] text-navy-1"
        />
      </div>
    </motion.section>
  );
}
