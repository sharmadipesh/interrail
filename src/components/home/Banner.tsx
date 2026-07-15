"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const HEADLINE = ["GO", "BEFORE", "YOU", "DON'T"];

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

export default function Banner() {
  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black">
      {/* Background image with a slow, continuous Ken Burns drift */}
      <motion.div
        initial={{ scale: 1.18 }}
        animate={{ scale: 1.04 }}
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-12 pt-24 sm:px-10 sm:pb-16 lg:px-16">
          {/* Headline + subheading, vertically centered in the remaining space */}
          <div className="flex flex-1 flex-col justify-center">
            {/* Headline */}
            <motion.h1
              variants={container}
              initial="hidden"
              animate="show"
              className="text-6xl font-black uppercase leading-[0.86] tracking-tight text-white sm:text-7xl lg:text-8xl"
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
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 1.3,
                          duration: 0.6,
                          ease: EASE_OUT,
                        }}
                        className="relative ml-4 inline-block h-11 w-11 shrink-0 align-middle sm:ml-6 sm:h-16 sm:w-16"
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
                                stopOpacity="0.65"
                              />
                              <stop
                                offset="55%"
                                stopColor="#a3a3a3"
                                stopOpacity="0.6"
                              />
                              <stop
                                offset="100%"
                                stopColor="#7f7f7f"
                                stopOpacity="0.5"
                              />
                            </radialGradient>
                          </defs>
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            fill="url(#discShade)"
                          />
                          <circle cx="50" cy="50" r="17" fill="#FBC626" />
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
                            stroke="#FBC626"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray="118 159"
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
              animate="show"
              transition={{ delay: 1.05, duration: 0.7, ease: EASE_OUT }}
              className="mt-7 max-w-md text-lg font-medium leading-snug text-white/90 sm:text-xl"
            >
              The deeper you go into Europe.
              <br />
              The deeper it goes into you.
            </motion.p>
          </div>

          {/* Actions — pinned to the bottom */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 1.25, duration: 0.7, ease: EASE_OUT }}
            className="flex w-full max-w-lg flex-nowrap gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex-1 whitespace-nowrap rounded-[3px] bg-[#FBC626] px-6 py-4 text-xs font-bold uppercase tracking-widest text-black shadow-lg shadow-black/20 transition-colors hover:bg-[#f2c65f]"
            >
              Find your trip
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="flex-1 whitespace-nowrap rounded-[3px] border border-[#FBC626] bg-transparent px-6 py-4 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white/10"
            >
              I know my trip
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
