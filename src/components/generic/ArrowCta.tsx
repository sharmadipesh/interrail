"use client";

import { useRef } from "react";
import {
  cubicBezier,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { RiArrowRightLine } from "react-icons/ri";

import { useTouchPulse } from "./useTouchPulse";

/** The page's premium ease-out, the same curve every host section uses. */
const EASE = cubicBezier(0.22, 1, 0.36, 1);

/**
 * The parts that do not vary between hosts.
 *
 * `group` and `relative` are load-bearing rather than decorative: both cues
 * below are CSS descendant selectors keyed off `group-hover`/`group-data`, and
 * the underline is absolutely positioned against this box.
 */
const BASE =
  "group relative flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-4";

/**
 * Type, colour and gap for the two sections that present this CTA identically.
 * SectionNine's is a size apart by design, so it passes its own.
 */
const TYPE = "gap-1 font-sans text-base font-semibold leading-[160%] text-navy";

/**
 * Arrow motion. No colour class on purpose — react-icons draws with
 * `fill="currentColor"`, so the arrow inherits the button's own text colour and
 * cannot drift from the label it sits beside.
 *
 * The hover half is CSS and gated to devices that actually hover, so it cannot
 * stick on a touch screen after a tap. The `data-pulse` half is the same move on
 * the same transition, for the touch screens that query deliberately excludes.
 */
const ARROW =
  "h-6 transition-transform duration-300 ease-out [@media(hover:hover)]:group-hover:translate-x-[5px] group-data-[pulse=on]:translate-x-[5px] motion-reduce:transition-none motion-reduce:[@media(hover:hover)]:group-hover:translate-x-0";

/** The page's shared underline idiom, on the same hover/pulse pair. */
const UNDERLINE =
  "absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-brand-yellow transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-x-100 group-data-[pulse=on]:scale-x-100";

/**
 * The page's arrow CTA — a text label, a nudging arrow and a yellow underline
 * that wipes in.
 *
 * It owns its own ref and touch pulse because the two are useless apart: the
 * pulse needs the element to know when it is on screen, and the element needs
 * the flag to render `data-pulse`. Leaving that wiring to each host is what let
 * three copies of it drift.
 *
 * Reduced motion is read here rather than passed in, so a host can never hand
 * this control a different answer from the one its own animations are using.
 */
export default function ArrowCta({
  label,
  className = TYPE,
  variants,
}: {
  label: string;
  /**
   * Type, colour and gap. Replaces `TYPE` rather than appending to it — two
   * competing `gap-*` or `text-*` classes in one string resolve by CSS order,
   * not by string order, so merging them would be a coin toss.
   */
  className?: string;
  /**
   * Only for a host that makes the button itself the entrance target. Where the
   * entrance lives on a wrapping element instead, leave this off: the button
   * still receives the parent's variant state and simply passes it through.
   */
  variants?: Variants;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = !!useReducedMotion();
  const pulse = useTouchPulse(ref, reduce);

  return (
    <motion.button
      ref={ref}
      type="button"
      variants={variants}
      // Present only on hover-less devices, and only while the button is on
      // screen. Everywhere else it is absent and the selectors above never
      // match, so a pointer keeps the plain hover behaviour.
      data-pulse={pulse ? "on" : undefined}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={`${BASE} ${className}`}
    >
      <span>{label}</span>
      <RiArrowRightLine aria-hidden className={ARROW} />
      <span aria-hidden className={UNDERLINE} />
    </motion.button>
  );
}
