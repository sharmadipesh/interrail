"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

// Parent that staggers its children into view.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const blurUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

// The arrow lands last, sweeping in from the top of its own curve.
const arrowIn: Variants = {
  hidden: { opacity: 0, y: -10, rotate: -8 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { duration: 0.6, ease: EASE, delay: 0.15 },
  },
};

export default function SectionEle() {
  return (
    <section className="bg-white px-6 py-24">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        // `relative` anchors the arrow, which the design hangs off the right of
        // the badge rather than placing it in flow.
        className="relative mx-auto flex max-w-[342px] flex-col items-center"
      >
        {/* Badge — logo over its star row, both locked to a 165px column */}
        <div className="flex w-[165px] flex-col items-start gap-3">
          <motion.div
            variants={blurUp}
            className="relative aspect-[1864/452] w-full"
          >
            <Image
              src="/images/trustpilot-logo.png"
              alt="Trustpilot"
              fill
              sizes="165px"
              className="object-contain"
            />
          </motion.div>

          <motion.div
            variants={blurUp}
            className="relative aspect-[2000/376] w-full"
          >
            <Image
              src="/images/trustpilot-stars.png"
              alt="Rated five stars"
              fill
              sizes="165px"
              className="object-contain"
            />
          </motion.div>
        </div>

        {/* Rating line. whitespace-pre-wrap keeps the design's wide spacing
            between the score and the review count. */}
        <motion.p
          variants={blurUp}
          className="mt-[25px] whitespace-pre-wrap text-center text-base capitalize leading-[1.1] tracking-16 text-[#0F141C]"
        >
          <span className="text-[#0F141C]/50">Trustpilot</span>
          {`  4.7 i  5    72K reviews`}
        </motion.p>

        {/* Hand-drawn arrow, pointing down at the score */}
        <motion.span
          aria-hidden
          variants={arrowIn}
          className="absolute left-[280px] top-[35px] block h-[56.25px] w-[15.88px]"
        >
          <Image
            src="/images/trustpilot-arrow.svg"
            alt=""
            fill
            unoptimized
            className="object-contain"
          />
        </motion.span>
      </motion.div>
    </section>
  );
}
