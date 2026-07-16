"use client";

import { motion, type Variants } from "framer-motion";
import { LuSearch, LuUser, LuShoppingBag } from "react-icons/lu";
import type { IconType } from "react-icons";
import Logo2 from "./Logo2";

// Premium easing — smooth ease-out, no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;
const NAVY = "#242438";

// The whole bar drops in from the top on mount.
const barVariants: Variants = {
  hidden: { y: -80, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
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
  { Icon: LuSearch, label: "Search" },
  { Icon: LuUser, label: "Account" },
  { Icon: LuShoppingBag, label: "Bag" },
];

/** Circular icon button with a glassy hover pill, scale, and tap feedback. */
function IconButton({ Icon, label }: { Icon: IconType; label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      variants={itemVariants}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="flex h-10 w-10 items-center justify-center rounded-full text-navy transition-colors duration-200 hover:bg-white/50"
    >
      <Icon size={20} strokeWidth={1.75} />
    </motion.button>
  );
}

/** Animated hamburger — the lines retract on hover for a subtle flourish. */
function Hamburger() {
  const line = "block h-[2px] w-[18px] origin-left rounded-full bg-current";
  return (
    <motion.button
      type="button"
      aria-label="Menu"
      variants={itemVariants}
      whileHover="hover"
      whileTap={{ scale: 0.9 }}
      className="-ml-2 flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-full text-navy transition-colors duration-200 hover:bg-white/50 sm:-ml-2.5"
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

export default function NavbarV2() {
  return (
    <motion.header
      variants={barVariants}
      initial="hidden"
      animate="visible"
      style={{ color: NAVY }}
      // Floating overlay: out of flow (fixed) so the banner stays a true 100vh
      // hero, with breathing room on the top/left/right.
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5"
    >
      {/* Frosted-glass bar: translucent + real backdrop blur/saturation, so the
          scene behind shows through with a premium glassy tint. */}
      <nav className="relative mx-auto flex h-14 max-w-7xl items-center justify-between overflow-hidden rounded-2xl border border-white/50 bg-white/50 px-3 shadow-xl shadow-black/10 backdrop-blur-xl backdrop-saturate-150 sm:h-16 sm:px-5">
        {/* Soft top highlight — light catching the glass edge */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
        />
        {/* Subtle inner glow from the top for depth */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
        />
        {/* One-time light sheen sweeping across the glass on mount */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-0 block w-1/3 -skew-x-12"
          initial={{ x: "-160%" }}
          animate={{ x: "460%" }}
          transition={{ delay: 0.85, duration: 1.1, ease: "easeInOut" }}
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          }}
        />

        {/* Left: menu + logo */}
        <div className="relative z-10 flex items-center gap-1 sm:gap-2">
          <Hamburger />
          <motion.a
            href="/"
            aria-label="interrail home"
            variants={itemVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="-ml-1.5 inline-flex sm:-ml-2"
          >
            <Logo2 className="h-7 w-auto sm:h-9" />
          </motion.a>
        </div>

        {/* Right: actions, staggered in */}
        <motion.div
          variants={groupVariants}
          className="relative z-10 flex items-center gap-1.5"
        >
          {ACTIONS.map(({ Icon, label }) => (
            <IconButton key={label} Icon={Icon} label={label} />
          ))}
        </motion.div>
      </nav>
    </motion.header>
  );
}
