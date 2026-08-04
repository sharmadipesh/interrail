"use client";

import { motion, type Variants } from "framer-motion";
import { TbWorld } from "react-icons/tb";
import { LuSearch, LuUser } from "react-icons/lu";
import type { IconType } from "react-icons";
import Logo2 from "./Logo2";

// Premium easing — smooth ease-out, no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;
const NAVY = "#242438";

// The whole bar drops in from the top on mount.
const barVariants: Variants = {
  hidden: { y: -80, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
  // Slides fully up out of view while the user scrolls down. -120% clears the
  // bar and its drop shadow; opacity stays 1 so it slides rather than fades.
  scrolledHidden: {
    y: "-120%",
    opacity: 1,
    transition: { duration: 0.4, ease: EASE },
  },
};

// Right-hand action group orchestrates a staggered reveal of its children.
const groupVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.45 },
  },
};

// Each control drops down and fades in.
const itemVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const ACTIONS: { Icon: IconType; label: string }[] = [
  { Icon: TbWorld, label: "Currancy" },
  { Icon: LuSearch, label: "Search" },
  // { Icon: LuBookmark, label: "Saved" },
  { Icon: LuUser, label: "Account" },
  // { Icon: LuShoppingBag, label: "Bag" },
];

/** Circular icon button with a hover pill, scale, and tap feedback. */
function IconButton({ Icon, label }: { Icon: IconType; label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      variants={itemVariants}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="flex items-center justify-center rounded-full text-[#242438] transition-colors duration-200 hover:bg-neutral-100"
    >
      <Icon size={20} strokeWidth={1.75} />
    </motion.button>
  );
}

/** Animated hamburger — the lines retract on hover for a subtle flourish. */
function Hamburger() {
  // rounded-full
  const line = "block h-[2px] w-[18px] origin-left bg-current";
  return (
    <motion.button
      type="button"
      aria-label="Menu"
      variants={itemVariants}
      whileHover="hover"
      whileTap={{ scale: 0.9 }}
      className="-ml-2 flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-full text-[#242438] transition-colors duration-200 hover:bg-neutral-100 sm:-ml-2.5"
    >
      <motion.span
        className={line}
        variants={{ hover: { scaleX: 0.7 } }}
        transition={{ duration: 0.3, ease: EASE }}
      />
      <motion.span className={line} />
      <motion.span
        className={line}
        variants={{ hover: { scaleX: 0.55 } }}
        transition={{ duration: 0.3, ease: EASE, delay: 0.04 }}
      />
    </motion.button>
  );
}

export default function Navbar({
  hidden = false,
  /**
   * Held back while the intro covers the page, so the bar drops in during the
   * handoff rather than finishing behind the curtain. Defaults to true, so
   * anywhere that doesn't orchestrate an intro behaves exactly as before.
   */
  ready = true,
}: {
  hidden?: boolean;
  ready?: boolean;
}) {
  return (
    <motion.header
      variants={barVariants}
      initial="hidden"
      // Drops in once `ready` ("hidden" → "visible"); thereafter `hidden`
      // toggles the scroll slide. Children (icons) don't define
      // "scrolledHidden", so they hold their revealed state instead of
      // re-staggering on each show.
      animate={hidden ? "scrolledHidden" : ready ? "visible" : "hidden"}
      style={{ color: NAVY }}
      // Floating overlay: out of flow (fixed) so the banner stays a true 100vh
      // hero, with breathing room on the top/left/right.
      className="fixed inset-x-0 top-0 z-50 px-5 pt-4 sm:px-6 sm:pt-5"
    >
      {/*  */}
      <nav className="mx-auto flex h-[52px] max-w-7xl items-center justify-between  border border-white/60 bg-white px-3 shadow-xl shadow-black/10 backdrop-blur-xl sm:px-5">
        {/* Left: menu + logo */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Hamburger />
          <motion.a
            href="/"
            aria-label="interrail home"
            variants={itemVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="-ml-1.5 inline-flex sm:-ml-2"
          >
            <Logo2 className="h-[26px] w-auto sm:h-9" />
          </motion.a>
        </div>

        {/* Right: actions, staggered in */}
        <motion.div
          variants={groupVariants}
          className="flex items-center gap-3"
        >
          {ACTIONS.map(({ Icon, label }) => (
            <IconButton key={label} Icon={Icon} label={label} />
          ))}
        </motion.div>
      </nav>
    </motion.header>
  );
}
