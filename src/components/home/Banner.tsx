"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const HEADLINE = ["Next stop:", "Somewhere", "in Europe"];

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
};

const line: Variants = {
  hidden: { opacity: 0, y: 48, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE_OUT },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};

export default function Banner({
  /**
   * Held back while the intro covers the page, so the hero's entrance plays
   * into the handoff instead of running out of sight behind the curtain. The
   * image itself still loads throughout — only the motion waits. Defaults to
   * true, so anywhere that doesn't orchestrate an intro behaves as before.
   */
  ready = true,
}: {
  ready?: boolean;
} = {}) {
  const show = ready ? "show" : "hidden";

  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black">
      {/* Background image with a slow, continuous Ken Burns drift */}
      <motion.div
        initial={{ scale: 1.18 }}
        animate={{ scale: ready ? 1.04 : 1.18 }}
        transition={{ duration: 12, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <Image
          src="/images/banner.png"
          alt="A traveller watching the sunset from a moving European train"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      {/* Legibility gradients — darker at the left/bottom where the copy sits */}
      {/* <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" /> */}

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-14 pt-24 sm:px-10 sm:pb-16 lg:px-16">
          {/* Headline + subheading, vertically centered in the remaining space */}
          <div className="flex flex-1 flex-col justify-center mb-10">
            {/* Headline */}
            <motion.h1
              variants={container}
              initial="hidden"
              animate={show}
              className="text-hero leading-hero tracking-1px font-semibold text-white sm:text-7xl sm:leading-hero lg:text-8xl lg:leading-hero"
            >
              {HEADLINE.map((word, i) => (
                <span key={word} className="block overflow-hidden">
                  <motion.span
                    variants={line}
                    className="inline-flex items-center"
                  >
                    {word}
                    {/* Accent — shaded disc with a center dot and a sweeping arc */}
                    {i === HEADLINE.length - 1 && (
                      <motion.span
                        aria-hidden
                        initial={{ scale: 0, opacity: 0 }}
                        animate={
                          ready
                            ? { scale: 1, opacity: 1 }
                            : { scale: 0, opacity: 0 }
                        }
                        transition={{
                          delay: 1.3,
                          duration: 0.6,
                          ease: EASE_OUT,
                        }}
                        className="relative ml-4 inline-block h-6 w-6 shrink-0 align-middle mt-3"
                      >
                        {/* Static disc + center dot */}
                        <svg viewBox="0 0 100 100" className="h-full w-full">
                          <defs>
                            <radialGradient
                              id="discShade"
                              cx="42%"
                              cy="36%"
                              r="72%"
                            >
                              <stop
                                offset="0%"
                                stopColor="#c4c4c4"
                                stopOpacity="0.38"
                              />
                              <stop
                                offset="55%"
                                stopColor="#a3a3a3"
                                stopOpacity="0.32"
                              />
                              <stop
                                offset="100%"
                                stopColor="#7f7f7f"
                                stopOpacity="0.25"
                              />
                            </radialGradient>
                          </defs>
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="url(#discShade)"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="17"
                            className="fill-brand-yellow"
                          />
                        </svg>

                        {/* Sweeping arc, layered on top and rotating */}
                        <motion.svg
                          viewBox="0 0 100 100"
                          className="absolute inset-0 h-full w-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="none"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray="118 159"
                            className="stroke-brand-yellow"
                          />
                        </motion.svg>
                      </motion.span>
                    )}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={show}
              transition={{ delay: 1.05, duration: 0.7, ease: EASE_OUT }}
              className="mt-6 max-w-md text-lead font-normal leading-lead tracking-2px text-white"
            >
              Go country to country with
              <br />
              one rail Pass. See everything
              <br />
              in between along the way.
            </motion.p>
          </div>

          {/* Actions — pinned to the bottom. */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={show}
            transition={{ delay: 1.25, duration: 0.7, ease: EASE_OUT }}
            className="flex w-full max-w-lg flex-nowrap gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex-1 whitespace-nowrap rounded-[3px] bg-brand-yellow px-6 py-3.5 text-base font-semibold uppercase text-navy-1 transition-colors hover:bg-brand-yellow-hover"
            >
              Plan your trip
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
