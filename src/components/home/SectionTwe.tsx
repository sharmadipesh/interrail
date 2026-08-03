"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

// Parent that staggers its children into view.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const contentUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

// Slow zoom-out on reveal, cropped by the banner's overflow-hidden frame.
const kenBurns: Variants = {
  hidden: { scale: 1.12 },
  show: { scale: 1, transition: { duration: 1.4, ease: EASE } },
};

/**
 * Both store badges come from one sprite — Google Play stacked above App
 * Store — so this crops the sprite to a single badge rather than shipping two
 * files. The inner layer is sized to the design's 108.33%/193.55% scale, and
 * `top` picks which half of the sprite shows through the 72×27 window.
 */
function StoreBadge({ store }: { store: "ios" | "android" }) {
  return (
    <span className="relative block h-[27px] w-[72px] shrink-0 overflow-hidden">
      <span
        className="absolute left-[-3px] block h-[52.26px] w-[78px]"
        style={{ top: store === "ios" ? "-25.26px" : 0 }}
      >
        <Image
          src="/images/app-store-badges.png"
          alt={store === "ios" ? "Download on the App Store" : "Get it on Google Play"}
          fill
          sizes="78px"
          className="object-contain"
        />
      </span>
    </span>
  );
}

export default function SectionTwe() {
  return (
    <section className="bg-white">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative h-[258px] w-full overflow-hidden"
      >
        {/* Photo. The source is a video still, so its letterbox bars were
            trimmed off the asset — the design hides them with a hard-coded
            offset that only holds at 390px wide. object-position keeps the
            subject framed to the right the way the design has it. */}
        <motion.div variants={kenBurns} className="absolute inset-0">
          <Image
            src="/images/app-banner.png"
            alt="A traveller checking the Interrail app on a train"
            fill
            priority={false}
            sizes="100vw"
            className="object-cover object-[6%_50%]"
          />
        </motion.div>

        {/* Copy — vertically centred in the banner, per the design */}
        <div className="relative flex h-full flex-col justify-center px-6 py-2.5">
          <div className="mx-auto w-full max-w-md">
            <motion.p
              variants={contentUp}
              className="font-sans text-[18px] font-semibold leading-5 tracking-[-0.18px] text-white"
            >
              Download the app.
              <br />
              Start exploring.
            </motion.p>

            <motion.div
              variants={contentUp}
              className="mt-[13px] flex items-center gap-2.5"
            >
              <StoreBadge store="ios" />
              <StoreBadge store="android" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
