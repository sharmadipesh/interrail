"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";

// Premium ease-out — smooth, no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;

const HEADING = ["Excepteur sint", "cupidatat", "non proident"];
const VENIAM = "Veniam".split("");

// Parent that staggers its children into view.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// A line/letter that rises out of an overflow-hidden mask.
const rise: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.8, ease: EASE } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

// Character flick-in for the monospace tagline.
const flick: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// Photo reveals (opacity/scale — combine cleanly with the parallax on the
// same node; the Ken Burns child inherits the reveal via variant propagation).
const photoFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};
const photoPop: Variants = {
  hidden: { opacity: 0, scale: 1.12 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } },
};
const kenBurns: Variants = {
  hidden: { scale: 1.25 },
  show: { scale: 1, transition: { duration: 1.4, ease: EASE } },
};

export default function SectionTwo() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Scroll-linked parallax on the big word for a layered, alive composition.
  // (Kept off the photos: a continuously-animating transform on/above an
  // element suppresses its own whileInView IntersectionObserver.)
  const veniamX = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <section
      ref={ref}
      className="overflow-hidden bg-white px-8 pt-[105px] pb-[200px]"
    >
      <div className="mx-auto max-w-xl">
        {/* Heading — each line rises out of its own mask */}
        <motion.h2
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="text-center font-molitor text-hero font-bold uppercase leading-[43px] tracking-27px text-navy-deep"
        >
          {HEADING.map((line) => (
            <span key={line} className="block overflow-hidden pb-[2px]">
              <motion.span variants={rise} className="block">
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h2>

        {/* Body — two columns, staggered fade-up */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="mt-8 grid grid-cols-2 gap-7 font-molitor font-normal text-black"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm leading-[110%] tracking-lead"
          >
            Lorem ipsum dolor sit amet consectetur. Unt in culpa qui officia.
          </motion.p>
          <div className="flex flex-col gap-5">
            <motion.p
              variants={fadeUp}
              className="text-sm leading-[110%] tracking-lead"
            >
              Nemo enim ipsam qui voluptatem quia sit eos aspernatur aut odit.
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="text-sm leading-[110%] tracking-lead"
            >
              Sed quia consequuntur magni dolores eos qui ratione voluptatem.
            </motion.p>
          </div>
        </motion.div>

        {/* Train photo — fixed ~194px wide (per the reference), centered;
            clip/overflow keeps the Ken Burns zoom cropped to the frame */}
        <div className="mt-[136px] flex justify-end mr-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            variants={photoFade}
            viewport={{ once: true, amount: 0.2 }}
            className="w-[194px] max-w-full overflow-hidden rounded-[2px]"
          >
            <motion.div variants={kenBurns}>
              <Image
                width={194}
                height={109}
                className="h-auto w-full"
                src="/images/section-2.2.png"
                alt="Friends together on a train"
                sizes="194px"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Veniam block — big word, overlapping bike photo, mono tagline */}
        {/* VENIAM — each letter rises out of a mask, whole word parallaxes */}
        <div className="relative mt-4">
          <motion.h3
            style={{ x: veniamX }}
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            className="relative z-10 flex font-molitor text-[105px] font-bold leading-[102px] tracking-85px text-brand-yellow-1"
          >
            {VENIAM.map((ch, i) => (
              <span key={i} className="inline-block overflow-hidden">
                <motion.span variants={rise} className="inline-block">
                  {ch}
                </motion.span>
              </span>
            ))}
          </motion.h3>

          {/* SINCE 1972 — monospace, spread wide, chars flick in */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.8 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.04 } },
            }}
            className="relative z-10 mt-4 flex justify-between gap-5 pl-4 font-departure text-base tracking-144% text-navy-deep"
          >
            <span className="flex z-10">
              {"SINCE".split("").map((c, i) => (
                <motion.span
                  key={i}
                  variants={flick}
                  className={`${i >= 1 && i <= 4 ? "text-white" : ""}`}
                >
                  {c}
                </motion.span>
              ))}
            </span>
            <span className="flex z-10">
              {"1972".split("").map((c, i) => (
                <motion.span key={i} variants={flick}>
                  {c}
                </motion.span>
              ))}
            </span>
          </motion.div>

          {/* Bike photo — overlaps the word, parallax + bottom-up reveal on one node */}
          <motion.div
            variants={photoPop}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="absolute left-[34px] top-[64px] z-0 w-[40%] overflow-hidden "
          >
            <Image
              width={140}
              height={170}
              className="h-auto w-full"
              src="/images/section-2.1.png"
              sizes="(max-width: 640px) 40vw, 200px"
              alt="A traveller with a bike at golden hour"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
