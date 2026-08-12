"use client";

import { useId, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  cubicBezier,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = cubicBezier(0.22, 1, 0.36, 1);
/** The same curve for the handful of interactions CSS drives rather than JS. */
const EASE_CSS = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/** The footer's own background, reused for focus-ring offsets. */
const SHELL = "#0F141C";

// Every destination is a placeholder until routes exist — swap the hrefs, the
// markup already carries the right semantics.
const HREF = "#";

const LINK_GROUPS: { title: string; links: string[] }[] = [
  {
    title: "About Interrail",
    links: [
      "About us",
      "Careers",
      "Press room",
      "Become our partner",
      "Sponsored & branded content",
      "Interrail Impact Report",
    ],
  },
  {
    title: "Get Started",
    links: [
      "What is Interrail",
      "How to use your Pass",
      "Magazine",
      "Community",
      "Sustainable tourism",
      "Support",
    ],
  },
  {
    title: "Terms & Conditions",
    links: [
      "Booking conditions",
      "Refunds and exchanges",
      "Interrail Pass conditions of use",
      "Rail planner app privacy policy",
      "Website terms of use",
    ],
  },
];

const POLICY_LINKS = [
  "Privacy Policy",
  "Cookie Policy",
  "Cookie Preferences",
  "Accessibility Statement",
];

// Widths come from the design — the marks aren't all the same aspect.
const SOCIALS = [
  {
    name: "Pinterest",
    src: "/images/social-pinterest.svg",
    w: 14.97,
    h: 13.85,
  },
  { name: "Facebook", src: "/images/social-facebook.svg", w: 14.93, h: 14.37 },
  {
    name: "Instagram",
    src: "/images/social-instagram.svg",
    w: 14.93,
    h: 14.37,
  },
  { name: "YouTube", src: "/images/social-youtube.svg", w: 19.9, h: 14.37 },
  { name: "X", src: "/images/social-x.svg", w: 16, h: 14.46 },
];

/** The closing line, split into its two semantic phrases. */
const SIGNOFF = ["Take the trip.", "Bring back a story."];

/** Shared field chrome for the newsletter inputs. */
const FIELD =
  `h-[61px] w-full border border-[#4B4B4B] bg-transparent px-2 py-2.5 font-sans text-sm leading-[1.4] text-white outline-none transition-[border-color,background-color] duration-300 ${EASE_CSS} placeholder:text-[#777] focus:border-brand-yellow focus:bg-white/[0.03]`;

/* ------------------------------------------------------------------ *
 * Motion system
 *
 * The footer is far too tall for one stagger — content near the sign-off
 * would have finished animating long before a reader ever reached it. So it
 * is cut into six zones, each its own viewport trigger, all speaking the same
 * motion language. Motion also gets progressively calmer on the way down:
 * the logo rises out of a mask, the sign-off simply settles.
 * ------------------------------------------------------------------ */

/** A zone container: no visual state of its own, just the timing for its children. */
const shell = (staggerChildren: number, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

const ZONE_LOGO = shell(0);
const ZONE_ACCORDION = shell(0.07);
const ZONE_NEWSLETTER = shell(0.09);
const ZONE_SOCIAL = shell(0.06);
const ZONE_POLICY = shell(0.06);
const ZONE_SIGNOFF = shell(0.12, 0.1);

/** Standard content reveal — text blocks. */
const riseIn: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, ease: EASE },
  },
};

/** The same reveal without the blur — used on anything holding a form control,
 *  where a filter on the ancestor would soften the caret while it animates. */
const riseSoft: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/**
 * An accordion row. `delayChildren` is what lets the divider draw itself just
 * after the row has arrived rather than travelling up alongside it.
 */
const rowIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE, delayChildren: 0.12 },
  },
};

/** Every rule in the footer draws itself on from the left. */
const drawX: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.65, ease: EASE } },
};

const drawXSlow: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
};

const socialIn: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.8 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: EASE },
  },
};

const policyIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const copyrightIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** The logo rises into its frame out of the wrapper's clip. */
/**
 * The mark is revealed in two parts rather than as one block.
 *
 * `/images/interrail-white.svg` is an SVG only on the outside — inside it is a
 * single base64 PNG behind a `<pattern>`, with no paths, circles or groups to
 * animate. So this borrows the approach Logo2 already uses on the navbar's
 * artwork for the same reason: paint the one image twice, clip each copy to a
 * region, and stagger the two.
 *
 * The split is measured, not guessed. Decoding the artwork and scanning it by
 * column, the emblem's ink ends at 21.7% and the gap before the wordmark runs
 * to 24.8%, centred on 23.2% — which is where Logo2 independently puts it.
 */
const SPLIT = 23.2;

/** Shared artwork. Painted as a background so each copy can be clipped. */
const LOGO_ART = {
  backgroundImage: "url('/images/interrail-white.svg')",
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left center",
} as const;

/**
 * The logo gets its own curve rather than the footer's EASE.
 *
 * EASE is cubicBezier(0.22, 1, 0.36, 1) — a hard ease-out whose slope at t=0 is
 * 1 / 0.22 = 4.55. On a half-second reveal that front-loads almost everything
 * into the first few frames: measured, the emblem was 97.8% of the way through
 * its scale by 0.32s, so it snapped rather than arrived, and then a 0.85s wipe
 * followed it. A pop chased by a slow curtain is two gestures, not one, which
 * is what read as odd. This is gentle at both ends, so the two halves move at
 * comparable speeds and hand over to each other.
 */
const EASE_LOGO = cubicBezier(0.42, 0, 0.58, 1);

/**
 * The emblem irises open from its own centre.
 *
 * A circular reveal for a circular mark, and — unlike the scale it replaces —
 * one that cannot desynchronise from the wordmark: nothing is transformed, so
 * both halves are always at their true size no matter where the timeline is.
 *
 * The three numbers are measured off the artwork, not chosen. Scanning the
 * emblem's ink puts its centre at (30.61, 28.86) in the 247×59 box, with the
 * farthest lit pixel 24.27px away — so the iris must reach 25px to cover the
 * mark, and may not exceed 30.6px or it starts uncovering the wordmark early.
 * 27px sits in the middle of that band.
 *
 * The circle also does the region clipping the old `inset()` did, which is why
 * there is only one clip-path here: an element gets one, and the iris is
 * strictly inside the emblem's own territory anyway.
 */
const EMBLEM = { x: 30.61, y: 28.86, r: 27 } as const;

const emblemIn: Variants = {
  hidden: {
    opacity: 0,
    clipPath: `circle(0px at ${EMBLEM.x}px ${EMBLEM.y}px)`,
  },
  show: {
    opacity: 1,
    clipPath: `circle(${EMBLEM.r}px at ${EMBLEM.x}px ${EMBLEM.y}px)`,
    transition: {
      duration: 0.55,
      ease: EASE_LOGO,
      // Resolves early so the iris is uncovering a solid mark rather than a
      // ghost — otherwise the growing circle reads as a fade with a shape.
      opacity: { duration: 0.22, ease: EASE_LOGO },
    },
  },
};

/**
 * The wordmark is then written out, left to right.
 *
 * Opens at 0.4, while the iris is still finishing, so the two overlap and read
 * as one continuous move across the lockup. That overlap is only safe because
 * neither half is scaled: when the emblem was scaling, anything starting before
 * it landed put a full-size wordmark beside a smaller mark.
 *
 * Both states keep the left inset pinned at the split, so only the right edge
 * travels — the letters are uncovered rather than sliding, and nothing is ever
 * painted over the emblem's region.
 */
const wordmarkIn: Variants = {
  hidden: { clipPath: `inset(0% ${100 - SPLIT}% 0% ${SPLIT}%)` },
  show: {
    clipPath: `inset(0% 0% 0% ${SPLIT}%)`,
    transition: { duration: 0.7, ease: EASE_LOGO, delay: 0.4 },
  },
};

/** One pass of light across the wordmark, once the wordmark has landed. */
const sheenIn: Variants = {
  hidden: { x: "-140%" },
  show: {
    x: "340%",
    transition: { duration: 0.7, ease: "easeInOut", delay: 1 },
  },
};

/** Each closing phrase out of its own mask. */
const phraseIn: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.85, ease: EASE },
  },
};

/**
 * Restrained and overdamped on purpose. Critical damping for k=320, m=0.5 is
 * 2·√(k·m) = 25.3, so 28 settles without ever crossing the target — no elastic
 * bounce on a control the reader may toggle repeatedly.
 */
const ICON_SPRING = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.5,
} as const;

/** A touch livelier for the social marks, still short of a bounce. */
const HOVER_SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 26,
  mass: 0.5,
} as const;

/** Written out in full — Tailwind's scanner only sees literal class strings,
 *  so the offset colour cannot be interpolated from SHELL. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F141C]";

/**
 * One zone of the footer. Reduced motion starts every zone in its resting
 * state, so the whole footer is simply present — no travel, no blur, no draw,
 * and no dependence on the viewport ever firing.
 */
function Zone({
  variants,
  amount,
  reduce,
  className,
  children,
}: {
  variants: Variants;
  amount: number;
  reduce: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={variants}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Accordion
 * ------------------------------------------------------------------ */

/** Title colour and nudge on hover. The slot is fixed-width, so nothing moves. */
const titleHover: Variants = {
  rest: { x: 0, color: "#FFFFFF" },
  hover: { x: 4, color: "#FFD400" },
};

/**
 * Panel timing. Opening is the slower half and its links follow the height in;
 * closing is quicker and sheds the links in reverse, so a reader who toggles
 * rapidly never waits on the animation.
 *
 * Plain targets rather than named variants, with the link stagger spelled out
 * per index instead of left to `staggerChildren`. The panel sits inside the
 * accordion zone, which is a variant tree driven by `whileInView` — keeping the
 * disclosure on explicit targets means its timing is its own and cannot be
 * caught up in the zone's reveal, whose labels it does not share.
 */
const PANEL_CLOSED = { height: 0, opacity: 0 } as const;

const PANEL_OPEN = {
  height: "auto",
  opacity: 1,
  transition: {
    height: { duration: 0.46, ease: EASE },
    opacity: { duration: 0.28, ease: EASE },
  },
} as const;

const PANEL_CLOSED_OUT = {
  height: 0,
  opacity: 0,
  transition: {
    height: { duration: 0.34, ease: EASE },
    opacity: { duration: 0.2, ease: EASE },
  },
} as const;

/** Reduced motion keeps the disclosure all but instant. */
const PANEL_OPEN_INSTANT = {
  height: "auto",
  opacity: 1,
  transition: { duration: 0.12 },
} as const;

const PANEL_CLOSED_INSTANT = {
  height: 0,
  opacity: 0,
  transition: { duration: 0.12 },
} as const;

const LINK_CLOSED = { opacity: 0, y: -6 };

/** Links follow the height in, 40ms apart. */
const linkOpen = (i: number, reduce: boolean) => ({
  opacity: 1,
  y: 0,
  transition: reduce
    ? { duration: 0.12 }
    : { duration: 0.35, ease: EASE, delay: 0.08 + i * 0.04 },
});

/** And shed in reverse on the way out, quickly — `i` arrives already flipped. */
const linkClose = (i: number, reduce: boolean) => ({
  opacity: 0,
  y: -6,
  transition: reduce
    ? { duration: 0.1 }
    : { duration: 0.16, ease: EASE, delay: i * 0.02 },
});

/**
 * A collapsible footer column. Closed by default, which is the state the design
 * shows; the toggle exists because the design gives these a minus affordance.
 *
 * The icon is two 20×1.875px bars in the brand yellow — the exported asset is
 * a single straight line of exactly those dimensions, so drawing it in CSS is
 * identical and lets the vertical bar retract to turn the plus into a minus.
 */
function FooterAccordion({
  title,
  links,
  reduce,
}: {
  title: string;
  links: string[];
  reduce: boolean;
}) {
  const [open, setOpen] = useState(false);
  /**
   * The panel is clipped only while its height is in flight. Left on
   * permanently it would shear the focus ring off the last link in the column.
   *
   * Driven by the panel's own animation lifecycle rather than by the click, so
   * it is self-correcting: a burst of rapid toggles that nets out to no state
   * change runs no animation at all, and a click-driven clip would have nothing
   * left to hand it back.
   */
  const [clipped, setClipped] = useState(true);
  const panelId = `footer-${title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    // border-b stays in the box, transparent, so the row keeps its exact
    // height; the visible rule is the span below, which can draw itself on.
    <motion.div
      variants={rowIn}
      className="relative w-full border-b border-transparent py-6 pl-1 pr-[18px]"
    >
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        initial={false}
        animate="rest"
        // Framer's hover gesture ignores touch pointers, so the nudge is a
        // pointer-device affordance only and never fires on a tap.
        whileHover={reduce ? undefined : "hover"}
        className={`flex w-full max-w-[323px] items-start justify-between rounded-sm text-left ${FOCUS_RING}`}
      >
        {/* nowrap: "Terms & Conditions" is wider than the 168px title slot and
            the design lets it run on rather than wrap to a second line. */}
        <motion.span
          variants={titleHover}
          transition={{ duration: 0.3, ease: EASE }}
          className="w-[168px] whitespace-nowrap font-sans text-[18px] font-semibold capitalize leading-5 text-white"
        >
          {title}
        </motion.span>
        <span
          aria-hidden
          className="relative grid size-[30px] shrink-0 place-items-center"
        >
          {/* A half turn: the bar starts and lands horizontal, so the minus is
              always level, and the sweep between is what sells the toggle. */}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : ICON_SPRING}
            className="block h-[1.875px] w-5 rounded-full bg-brand-yellow"
          />
          <motion.span
            animate={{ scaleY: open ? 0 : 1 }}
            transition={reduce ? { duration: 0 } : ICON_SPRING}
            className="absolute block h-5 w-[1.875px] rounded-full bg-brand-yellow"
          />
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={PANEL_CLOSED}
            animate={reduce ? PANEL_OPEN_INSTANT : PANEL_OPEN}
            exit={reduce ? PANEL_CLOSED_INSTANT : PANEL_CLOSED_OUT}
            onAnimationStart={() => setClipped(true)}
            onAnimationComplete={() => setClipped(false)}
            className={clipped ? "overflow-hidden" : undefined}
          >
            <ul className="flex w-[212px] flex-col gap-3 pt-[18px]">
              {links.map((link, i) => (
                <motion.li
                  key={link}
                  initial={LINK_CLOSED}
                  animate={linkOpen(i, reduce)}
                  exit={linkClose(links.length - 1 - i, reduce)}
                >
                  {/* block so the row is the link's own 1.4 leading rather
                      than the list item's inherited strut; nowrap because the
                      design lets the longest entries run past the 212px
                      column instead of wrapping them. */}
                  <a
                    href={HREF}
                    className={`inline-block whitespace-nowrap rounded-sm font-sans text-sm font-normal leading-[1.4] text-white transition-colors duration-300 ${EASE_CSS} hover:text-brand-yellow ${FOCUS_RING}`}
                  >
                    {link}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.span
        aria-hidden
        variants={drawX}
        className="absolute inset-x-0 -bottom-px block h-px origin-left bg-white"
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Footer
 * ------------------------------------------------------------------ */

export default function Footer() {
  const reduce = !!useReducedMotion();
  const uid = useId();
  const emailId = `${uid}-email`;
  const nameId = `${uid}-name`;
  const countryId = `${uid}-country`;

  const [countryFocused, setCountryFocused] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <footer className="relative bg-[#0F141C] px-6 py-12">
      {/* A hairline drawing left to right as the footer arrives — the seam
          between the app banner and the dark chapter that follows it. The
          background itself stays put: sliding the footer would open a gap
          under SectionTwe. */}
      <motion.span
        aria-hidden
        initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE }}
        className="pointer-events-none absolute inset-x-0 top-0 block h-px origin-left bg-brand-yellow"
      />

      <div className="mx-auto flex w-full max-w-md flex-col gap-[38px]">
        {/* Logo + link columns */}
        <div className="flex w-full flex-col items-center gap-11">
          {/* Zone 1 — the logo. Three layers: the wrapper clips, the middle
              rises, the overlay carries the one-time sheen. */}
          <Zone
            variants={ZONE_LOGO}
            amount={0.5}
            reduce={reduce}
            className="relative h-[59px] w-[247px] overflow-hidden"
          >
            {/* One name for the pair. The two copies below are the same
                artwork painted twice and clipped to complementary regions, so
                each is decoration; announcing either would say "Interrail"
                twice. Variants still reach them through this plain wrapper. */}
            <span
              role="img"
              aria-label="Interrail"
              className="absolute inset-0 block"
            >
              {/* No clip-path or transform-origin here: the iris in emblemIn
                  is the clip, and there is nothing left to transform. */}
              <motion.span
                aria-hidden
                variants={emblemIn}
                className="absolute inset-0 block"
                style={LOGO_ART}
              />

              <motion.span
                aria-hidden
                variants={wordmarkIn}
                className="absolute inset-0 block"
                style={LOGO_ART}
              />
            </span>

            {/* Low enough not to recolour the wordmark, and clipped to the
                wrapper so it can never touch the layout. Reduced motion drops
                the layer entirely rather than animating it to nowhere. */}
            {!reduce && (
              <motion.span
                aria-hidden
                variants={sheenIn}
                className="pointer-events-none absolute inset-y-0 left-0 block w-1/3 -skew-x-12"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
                }}
              />
            )}
          </Zone>

          {/* Zone 2 — accordion navigation */}
          <Zone
            variants={ZONE_ACCORDION}
            amount={0.15}
            reduce={reduce}
            className="flex w-full flex-col"
          >
            {LINK_GROUPS.map((group) => (
              <FooterAccordion key={group.title} {...group} reduce={reduce} />
            ))}
          </Zone>
        </div>

        {/* Zone 3 — newsletter */}
        <Zone
          variants={ZONE_NEWSLETTER}
          amount={0.2}
          reduce={reduce}
          className="flex w-full flex-col gap-[23px]"
        >
          <div className="flex w-full flex-col gap-[15px]">
            <div className="font-sans text-white">
              <motion.p
                variants={riseIn}
                className="text-base font-semibold leading-[1.4] text-brand-yellow"
              >
                Stay Updated
              </motion.p>
              <motion.p variants={riseIn} className="text-sm leading-[1.4]">
                Join our Newsletter for exclusive discounts, inspirational
                travel content And a change to win{" "}
                <a
                  href={HREF}
                  className={`rounded-sm underline decoration-solid transition-colors duration-300 ${EASE_CSS} hover:text-brand-yellow ${FOCUS_RING}`}
                >
                  2x Eurail Passes
                </a>
                .
              </motion.p>
            </div>

            <div className="flex w-full flex-col gap-[15px]">
              {/* The design labels these with placeholders only, so the real
                  labels are here and visually hidden rather than absent. */}
              <motion.div variants={riseSoft} className="w-full">
                <label htmlFor={emailId} className="sr-only">
                  Email
                </label>
                <input
                  id={emailId}
                  type="email"
                  placeholder="Email"
                  className={FIELD}
                />
              </motion.div>

              <motion.div
                variants={riseSoft}
                className="flex w-full items-center gap-0.5"
              >
                <div className="min-w-0 flex-1">
                  <label htmlFor={nameId} className="sr-only">
                    First name
                  </label>
                  <input
                    id={nameId}
                    type="text"
                    placeholder="First Name"
                    className={FIELD}
                  />
                </div>

                {/* Country — appearance-none so the design's own chevron shows */}
                <div className="relative min-w-0 flex-1">
                  <label htmlFor={countryId} className="sr-only">
                    Country
                  </label>
                  <select
                    id={countryId}
                    defaultValue=""
                    onFocus={() => setCountryFocused(true)}
                    onBlur={() => setCountryFocused(false)}
                    className={`${FIELD} appearance-none pr-9`}
                  >
                    <option value="" disabled>
                      Country
                    </option>
                  </select>
                  {/* Centring lives on the outer span so Framer's transform on
                      the inner one has nothing to overwrite. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 block -translate-y-1/2"
                  >
                    <motion.span
                      animate={{ y: countryFocused && !reduce ? 2 : 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="block"
                    >
                      <Image
                        src="/images/footer-chevron.svg"
                        alt=""
                        width={13}
                        height={8}
                        unoptimized
                        className="block"
                      />
                    </motion.span>
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.label
            variants={riseSoft}
            className="flex w-full cursor-pointer items-center gap-[17px]"
          >
            {/* The native checkbox stays the control — it keeps the box, the
                keyboard and the accessibility tree. The tick is a decoration
                painted over it. */}
            <span className="relative grid size-[25px] shrink-0 place-items-center">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className={`size-[25px] appearance-none border border-[#4B4B4B] bg-transparent transition-colors duration-300 ${EASE_CSS} checked:border-brand-yellow checked:bg-brand-yellow ${FOCUS_RING}`}
              />
              <motion.svg
                aria-hidden
                width="14"
                height="11"
                viewBox="0 0 14 11"
                fill="none"
                initial={false}
                animate={{ scale: agreed ? 1 : 0.4, opacity: agreed ? 1 : 0 }}
                transition={reduce ? { duration: 0.12 } : ICON_SPRING}
                className="pointer-events-none absolute block"
              >
                <path
                  d="M1.5 5.6 5.1 9.2 12.5 1.6"
                  stroke={SHELL}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </span>
            <span className="w-[298px] font-sans text-sm leading-[1.4] text-[#777]">
              By signing up for our newsletter you agree to our{" "}
              <span className="font-semibold text-white">
                terms and conditions
              </span>
            </span>
          </motion.label>
        </Zone>

        {/* Socials + legal */}
        <div className="flex w-full flex-col items-center gap-9">
          {/* Zone 4 — social bar. box-border plus the fixed 81px height means
              the transparent borders hold the row's exact geometry while the
              two rules draw themselves on. */}
          <Zone
            variants={ZONE_SOCIAL}
            amount={0.4}
            reduce={reduce}
            className="relative flex h-[81px] w-full items-center justify-center gap-[29px] border-y border-transparent p-2.5"
          >
            <motion.span
              aria-hidden
              variants={drawXSlow}
              className="absolute inset-x-0 -top-px block h-px origin-left bg-white"
            />
            <motion.span
              aria-hidden
              variants={drawXSlow}
              className="absolute inset-x-0 -bottom-px block h-px origin-left bg-white"
            />

            {SOCIALS.map((s, i) => (
              <motion.a
                key={s.name}
                href={HREF}
                aria-label={s.name}
                variants={socialIn}
                // Alternating tilt so the row reads as playful rather than
                // mechanical. Touch pointers never reach the hover gesture.
                whileHover={
                  reduce
                    ? undefined
                    : { y: -3, scale: 1.1, rotate: i % 2 === 0 ? 4 : -4 }
                }
                whileTap={reduce ? undefined : { scale: 0.94 }}
                transition={HOVER_SPRING}
                // before: opens a 44px-ish tap target around a 15px mark
                // without touching layout — the 29px gap absorbs it.
                className={`relative block shrink-0 rounded-sm before:absolute before:-inset-3 before:content-[''] ${FOCUS_RING}`}
              >
                <Image
                  src={s.src}
                  alt=""
                  width={s.w}
                  height={s.h}
                  unoptimized
                  className="block"
                />
              </motion.a>
            ))}
          </Zone>

          <div className="flex w-full flex-col items-center gap-[61px] text-center">
            {/* Zone 5 — policy links */}
            <Zone
              variants={ZONE_POLICY}
              amount={0.3}
              reduce={reduce}
              className="w-[187px]"
            >
              <ul className="flex w-full flex-col items-center gap-[19px]">
                {POLICY_LINKS.map((link) => (
                  <motion.li key={link} variants={policyIn}>
                    <a
                      href={HREF}
                      className={`group relative inline-block rounded-sm font-sans text-sm font-semibold leading-[1.2] text-white transition-colors duration-300 ${EASE_CSS} hover:text-brand-yellow ${FOCUS_RING}`}
                    >
                      {link}
                      {/* Out of flow, so the label never shifts as it draws.
                          Interaction feedback stays on under reduced motion. */}
                      <span
                        aria-hidden
                        className={`absolute -bottom-0.5 left-0 block h-px w-full origin-left scale-x-0 bg-brand-yellow transition-transform duration-300 ${EASE_CSS} group-hover:scale-x-100 group-focus-visible:scale-x-100`}
                      />
                    </a>
                  </motion.li>
                ))}
              </ul>
            </Zone>

            {/* Zone 6 — copyright, then the sign-off */}
            <Zone
              variants={ZONE_SIGNOFF}
              amount={0.3}
              reduce={reduce}
              className="flex w-full flex-col items-center gap-3.5 uppercase"
            >
              <motion.p
                variants={copyrightIn}
                className="w-full font-departure text-xs leading-[18px] tracking-[0.72px] text-brand-yellow"
              >
                © 2026 Interrail, All Rights Reserved
              </motion.p>

              {/* Each phrase rises out of its own mask. They are block-level
                  because a mask needs a block box — and at every width this
                  column reaches, the line already broke after "Take the trip.",
                  so the design's wrapping is unchanged. The 6px of padding is
                  descender room (Poppins overshoots a 47px line box by ~2px);
                  the matching negative margin hands it straight back to flow. */}
              <p className="w-full font-sans text-[45px] font-semibold normal-case leading-[47px] tracking-1px text-white">
                {SIGNOFF.map((phrase) => (
                  <span
                    key={phrase}
                    className="block overflow-hidden pb-1.5 -mb-1.5"
                  >
                    <motion.span variants={phraseIn} className="block">
                      {phrase}
                    </motion.span>
                  </span>
                ))}
              </p>
            </Zone>
          </div>
        </div>
      </div>
    </footer>
  );
}
