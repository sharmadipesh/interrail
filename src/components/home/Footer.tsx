"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

// Premium ease-out — smooth, no bounce. Matches the rest of the page.
const EASE = [0.22, 1, 0.36, 1] as const;

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
  { name: "Pinterest", src: "/images/social-pinterest.svg", w: 14.97, h: 13.85 },
  { name: "Facebook", src: "/images/social-facebook.svg", w: 14.93, h: 14.37 },
  { name: "Instagram", src: "/images/social-instagram.svg", w: 14.93, h: 14.37 },
  { name: "YouTube", src: "/images/social-youtube.svg", w: 19.9, h: 14.37 },
  { name: "X", src: "/images/social-x.svg", w: 16, h: 14.46 },
];

/** Shared field chrome for the newsletter inputs. */
const FIELD =
  "h-[61px] w-full border border-[#4B4B4B] bg-transparent px-2 py-2.5 font-sans text-sm leading-[1.4] text-white outline-none placeholder:text-[#777] focus:border-brand-yellow";

/**
 * A collapsible footer column. Open by default, which is the state the design
 * shows; the toggle exists because the design gives these a minus affordance.
 *
 * The icon is two 20×1.875px bars in the brand yellow — the exported asset is
 * a single straight line of exactly those dimensions, so drawing it in CSS is
 * identical and lets the vertical bar retract to turn the plus into a minus.
 */
function FooterAccordion({ title, links }: { title: string; links: string[] }) {
  const [open, setOpen] = useState(true);
  const panelId = `footer-${title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="w-full border-b border-white py-6 pl-1 pr-[18px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full max-w-[323px] items-start justify-between text-left"
      >
        {/* nowrap: "Terms & Conditions" is wider than the 168px title slot and
            the design lets it run on rather than wrap to a second line. */}
        <span className="w-[168px] whitespace-nowrap font-sans text-[18px] font-semibold capitalize leading-5 text-white">
          {title}
        </span>
        <span
          aria-hidden
          className="relative grid size-[30px] shrink-0 place-items-center"
        >
          <span className="block h-[1.875px] w-5 rounded-full bg-brand-yellow" />
          <span
            className={`absolute block h-5 w-[1.875px] rounded-full bg-brand-yellow transition-transform duration-300 ease-out ${
              open ? "scale-y-0" : "scale-y-100"
            }`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <ul className="flex w-[212px] flex-col gap-3 pt-[18px]">
              {links.map((link) => (
                <li key={link}>
                  {/* block so the row is the link's own 1.4 leading rather
                      than the list item's inherited strut; nowrap because the
                      design lets the longest entries run past the 212px
                      column instead of wrapping them. */}
                  <a
                    href={HREF}
                    className="block whitespace-nowrap font-sans text-sm font-normal leading-[1.4] text-white transition-colors hover:text-brand-yellow"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#0F141C] px-6 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-[38px]">
        {/* Logo + link columns */}
        <div className="flex w-full flex-col items-center gap-11">
          <div className="relative h-[59px] w-[247px]">
            <Image
              src="/images/footer-logo.png"
              alt="Interrail"
              fill
              sizes="247px"
              className="object-contain"
            />
          </div>

          <div className="flex w-full flex-col">
            {LINK_GROUPS.map((group) => (
              <FooterAccordion key={group.title} {...group} />
            ))}
          </div>
        </div>

        {/* Newsletter */}
        <div className="flex w-full flex-col gap-[23px]">
          <div className="flex w-full flex-col gap-[15px]">
            <div className="font-sans text-white">
              <p className="text-base font-semibold leading-[1.4] text-brand-yellow">
                Stay Updated
              </p>
              <p className="text-sm leading-[1.4]">
                Join our Newsletter for exclusive discounts, inspirational travel
                content And a change to win{" "}
                <a href={HREF} className="underline decoration-solid">
                  2x Eurail Passes
                </a>
                .
              </p>
            </div>

            <div className="flex w-full flex-col gap-[15px]">
              <input type="email" placeholder="Email" className={FIELD} />

              <div className="flex w-full items-center gap-0.5">
                <input
                  type="text"
                  placeholder="First Name"
                  className={`${FIELD} min-w-0 flex-1`}
                />

                {/* Country — appearance-none so the design's own chevron shows */}
                <div className="relative min-w-0 flex-1">
                  <select
                    defaultValue=""
                    aria-label="Country"
                    className={`${FIELD} appearance-none pr-9`}
                  >
                    <option value="" disabled>
                      Country
                    </option>
                  </select>
                  <Image
                    src="/images/footer-chevron.svg"
                    alt=""
                    aria-hidden
                    width={13}
                    height={8}
                    unoptimized
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                  />
                </div>
              </div>
            </div>
          </div>

          <label className="flex w-full cursor-pointer items-center gap-[17px]">
            <input
              type="checkbox"
              className="size-[25px] shrink-0 appearance-none border border-[#4B4B4B] bg-transparent checked:bg-brand-yellow"
            />
            <span className="w-[298px] font-sans text-sm leading-[1.4] text-[#777]">
              By signing up for our newsletter you agree to our{" "}
              <span className="font-semibold text-white">
                terms and conditions
              </span>
            </span>
          </label>
        </div>

        {/* Socials + legal */}
        <div className="flex w-full flex-col items-center gap-9">
          <div className="flex h-[81px] w-full items-center justify-center gap-[29px] border-y border-white p-2.5">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={HREF}
                aria-label={s.name}
                className="block shrink-0 transition-opacity hover:opacity-70"
              >
                <Image
                  src={s.src}
                  alt=""
                  width={s.w}
                  height={s.h}
                  unoptimized
                  className="block"
                />
              </a>
            ))}
          </div>

          <div className="flex w-full flex-col items-center gap-[61px] text-center">
            <ul className="flex w-[187px] flex-col items-center gap-[19px]">
              {POLICY_LINKS.map((link) => (
                <li key={link}>
                  <a
                    href={HREF}
                    className="block font-sans text-sm font-semibold leading-[1.2] text-white transition-colors hover:text-brand-yellow"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex w-full flex-col items-center gap-3.5 uppercase">
              <p className="w-full font-departure text-xs leading-[18px] tracking-[0.72px] text-brand-yellow">
                © 2026 Interrail, All Rights Reserved
              </p>
              <p className="w-full font-sans text-[45px] font-semibold normal-case leading-[47px] tracking-1px text-white">
                Take the trip. Bring back a story.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
