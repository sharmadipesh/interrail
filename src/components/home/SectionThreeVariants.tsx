"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

import SectionThreev3Unpinned from "./SectionThreev3Unpinned";

/**
 * Picks which SectionThree treatment to render from `?section_three=…`, so a
 * single link can show any one of the six without a rebuild.
 *
 * ── Why the default is imported statically and the rest are not ──────────────
 *
 * All six are heavy: each carries two videos, a scroll timeline and its own
 * motion system. Importing all six here would put five unused copies in the
 * bundle every real visitor downloads, to serve a query parameter almost none
 * of them will ever use. Only the default is a static import — so it is in the
 * prerendered HTML and costs a normal visitor nothing extra — and the other
 * five are fetched on demand, and only if the parameter actually asks for one.
 *
 * `ssr: false` is deliberate and legal here: this is a Client Component, and
 * the alternates can only ever be selected after hydration has read the URL.
 * There is nothing for the server to render for them.
 */
const SectionThree = dynamic(() => import("./SectionThree"), { ssr: false });
const SectionThreeV2 = dynamic(() => import("./SectionThreeV2"), {
  ssr: false,
});
const SectionThreev3 = dynamic(() => import("./SectionThreev3"), {
  ssr: false,
});
const SectionThreeUnpinned = dynamic(() => import("./SectionThreeUnpinned"), {
  ssr: false,
});
const SectionThreeV2Unpinned = dynamic(
  () => import("./SectionThreeV2Unpinned"),
  { ssr: false },
);

/** The query parameter that selects a treatment. */
export const SECTION_THREE_PARAM = "section_three";

/**
 * The six treatments, in the order they were built: the three pinned originals
 * first, then their unpinned counterparts.
 */
const VARIANTS = {
  "variation-1": SectionThree, // pinned — centre-split gather
  "variation-2": SectionThreeV2, // pinned — pop in place
  "variation-3": SectionThreev3, // pinned — opposing tracks
  "variation-4": SectionThreeUnpinned, // unpinned — centre-split gather
  "variation-5": SectionThreeV2Unpinned, // unpinned — pop in place
  "variation-6": SectionThreev3Unpinned, // unpinned — opposing tracks
} as const;

export type SectionThreeVariant = keyof typeof VARIANTS;

/**
 * What renders with no parameter, an unknown one, or before hydration.
 *
 * This is `variation-6`, which is what the page shipped before the switch
 * existed — so a plain visit to `/` is byte-for-byte what it was, and an
 * unrecognised value degrades to the real page rather than to an error or a
 * blank slot. A public URL should never be able to break the homepage by
 * carrying a typo.
 */
export const DEFAULT_VARIANT: SectionThreeVariant = "variation-6";
export const SectionThreeDefault = VARIANTS[DEFAULT_VARIANT];

const isVariant = (v: string | null): v is SectionThreeVariant =>
  v !== null && v in VARIANTS;

/**
 * Must be rendered inside a `<Suspense>` boundary.
 *
 * `useSearchParams()` opts its subtree out of static rendering, and Next throws
 * a bailout error during prerender if it is not wrapped — the build fails with
 * "should be wrapped in a suspense boundary at page". Wrapped, only this
 * component defers: the rest of the homepage stays statically prerendered, and
 * the boundary's fallback is what lands in the static HTML.
 */
export default function SectionThreeVariantSwitch() {
  const value = useSearchParams().get(SECTION_THREE_PARAM);
  const Chosen = isVariant(value) ? VARIANTS[value] : SectionThreeDefault;
  return <Chosen />;
}
