"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  cubicBezier,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);

const LINES = ["Download the app.", "Start exploring."];

/**
 * Light enough to track Lenis without trailing it — ratio 1.39, settling in
 * ~130ms. On a banner only 258px tall a heavier spring would read as the
 * photograph lagging the page rather than sitting behind it.
 */
const PARALLAX_SPRING = {
  stiffness: 140,
  damping: 22,
  mass: 0.45,
  restDelta: 0.001,
} as const;

/** Drift each way. The parallax layer is 24px oversized top and bottom. */
const DRIFT = 14;

/* ------------------------------------------------------------------ *
 * Timeline — one shared trigger, ordered by explicit delays
 * ------------------------------------------------------------------ */

const shell: Variants = { hidden: {}, show: {} };

/**
 * The photograph opens right to left, like a blind drawing back off a train
 * window. `inset(0 0 0 100%)` collapses the visible region against the right
 * edge; easing the left inset back to 0 sweeps it open across the frame.
 */
const maskIn: Variants = {
  hidden: { opacity: 0.8, clipPath: "inset(0% 0% 0% 100%)" },
  show: {
    opacity: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 1.1, ease: EASE },
  },
};

/**
 * Settles to 1.02 rather than 1 on purpose: the residual 2% is what guarantees
 * the entrance's 14px horizontal shift can never pull an edge into the frame,
 * and it costs nothing visually on a full-bleed crop.
 */
const settleIn: Variants = {
  hidden: { scale: 1.08, x: 14 },
  show: { scale: 1.02, x: 0, transition: { duration: 1.4, ease: EASE } },
};

// Each line rises out of its own mask, 100ms apart.
const lineIn: Variants = {
  hidden: { y: "110%", opacity: 0, filter: "blur(3px)" },
  show: (i: number) => ({
    y: "0%",
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.75, ease: EASE, delay: 0.2 + i * 0.1 },
  }),
};

const badgeIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.88 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: EASE, delay: 0.55 + i * 0.09 },
  }),
};

/**
 * Light passing over the badges on a loop, so the call to action keeps its
 * pull after the entrance is over.
 *
 * The long pause is what keeps it from nagging: 1.1s of travel, then 2.6s of
 * stillness. It rides inside each badge's own crop window rather than a
 * wrapper around the pair — the row must not clip anything, because the badges
 * sit 16px low while their entrance plays and a clipping row shears them.
 */
const SHEEN_LOOP = {
  duration: 1.1,
  ease: "easeInOut",
  repeat: Infinity,
  repeatDelay: 2.6,
} as const;

/** Waits for the entrance to land, then the pair sweeps left to right. */
const SHEEN_START = 1.15;
const SHEEN_STAGGER = 0.18;

/**
 * Both store badges come from one sprite — Google Play stacked above App
 * Store — so this crops the sprite to a single badge rather than shipping two
 * files.
 *
 * Every measurement is the original set scaled by exactly 11/9, which takes the
 * window from 72×27 to 88×33 without touching the aspect. That factor matters:
 * decoding the sprite puts Google Play at 6.17–46.33% of its height and the App
 * Store at 53.67–93.83%, so each window clears the other badge by 1.27px. Move
 * any one of these numbers on its own and the neighbouring badge bleeds in.
 */
function StoreBadge({
  store,
  sweeping,
  delay,
}: {
  store: "ios" | "android";
  sweeping: boolean;
  delay: number;
}) {
  return (
    <span className="relative block h-[33px] w-[88px] shrink-0 overflow-hidden">
      <span
        className="absolute left-[-3.667px] block h-[63.873px] w-[95.333px]"
        style={{ top: store === "ios" ? "-30.873px" : 0 }}
      >
        <Image
          src="/images/app-store-badges.png"
          alt={
            store === "ios"
              ? "Download on the App Store"
              : "Get it on Google Play"
          }
          fill
          sizes="96px"
          className="object-contain"
        />
      </span>

      {/* The sweep lives inside the badge's own crop, so it is clipped to the
          artwork and cannot touch the row's layout. Its own initial/animate
          keeps it out of the entrance variants, which would otherwise stop the
          loop dead the moment the timeline settled. 30% white is enough to
          catch the eye on a black badge without washing out the wordmark. */}
      <motion.span
        aria-hidden
        initial={{ x: "-140%" }}
        animate={sweeping ? { x: ["-140%", "340%"] } : { x: "-140%" }}
        transition={sweeping ? { ...SHEEN_LOOP, delay } : { duration: 0 }}
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)",
        }}
      />
    </span>
  );
}

export default function SectionTwe() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: bannerRef,
    offset: ["start end", "end start"],
  });
  const smoothed = useSpring(scrollYProgress, PARALLAX_SPRING);
  const drift = useTransform(smoothed, [0, 1], [-DRIFT, DRIFT]);

  // The loop runs only while the banner is on screen — no `once`, so it stops
  // again on the way out rather than sweeping an offscreen element forever.
  const bannerInView = useInView(bannerRef, { amount: 0.4 });
  const sweeping = !reduce && bannerInView;

  return (
    <section className="bg-white">
      <motion.div
        ref={bannerRef}
        variants={shell}
        initial={reduce ? "show" : "hidden"}
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative h-[258px] w-full overflow-hidden"
      >
        {/* Photo. The source is a video still, so its letterbox bars were
            trimmed off the asset — the design hides them with a hard-coded
            offset that only holds at 390px wide. object-position keeps the
            subject framed to the right the way the design has it.

            Four layers, one transform each, so none overwrites another: the
            mask sweeps, the middle settles, the inner drifts with the scroll,
            and only the last holds the image. The drift layer is 24px taller
            than the frame at both ends, comfortably more than the 14px it can
            travel. */}
        <motion.div variants={maskIn} className="absolute inset-0">
          <motion.div variants={settleIn} className="absolute inset-0">
            <motion.div
              style={{ y: reduce ? 0 : drift }}
              className="absolute inset-x-0 -inset-y-6"
            >
              <Image
                src="/images/app-banner.png"
                alt="A traveller checking the Interrail app on a train"
                fill
                priority={false}
                sizes="100vw"
                className="object-cover object-[6%_50%]"
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Copy — vertically centred in the banner, per the design */}
        <div className="relative flex h-full flex-col justify-center px-6 py-2.5">
          <div className="mx-auto w-full max-w-md">
            <p className="font-sans text-[18px] font-semibold leading-5 tracking-[-0.18px] text-white">
              {LINES.map((line, i) => (
                // 24px of mask against a 20px line, with the 4px handed back by
                // -mb-1, so the flow height stays the design's 20px while the
                // descenders on "app." and "exploring." keep their tails.
                <span
                  key={line}
                  className="block h-[24px] -mb-1 overflow-hidden"
                >
                  <motion.span
                    custom={i}
                    variants={lineIn}
                    className="block"
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </p>

            {/* No overflow on this row. The badges ride 16px low through their
                entrance, so anything clipping here shears their bottom edge —
                which is exactly what a wrapper-level sweep mask did. */}
            <div className="mt-[13px] flex items-center gap-3">
              {(["ios", "android"] as const).map((store, i) => (
                <motion.span
                  key={store}
                  custom={i}
                  variants={badgeIn}
                  className="block"
                >
                  <StoreBadge
                    store={store}
                    sweeping={sweeping}
                    delay={SHEEN_START + i * SHEEN_STAGGER}
                  />
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
