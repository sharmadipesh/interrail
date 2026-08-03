"use client";
import React from "react";
import Image from "next/image";

const STACK = [
  "See the landmarks and<br />the places guidebooks skip.",
  "Plan your trip in advance<br />or make it up as you go.",
  "Skip the travel chaos and<br />enjoy the view from the train. ",
];

/**
 * A decorative route line from the section background.
 *
 * Both assets are exported at the 390px design width and come pre-clipped to
 * that frame, so they're drawn at their natural size and cropped by the
 * section's edges (`object-cover`) rather than scaled to fit. That keeps each
 * line's vertical relationship to the copy exact — and its dots circular — on
 * any phone. `max-w-md` caps the pattern from tablet up, matching the mobile
 * container the rest of the page uses.
 *
 * The caller owns the positioning box; this just fills it.
 */
function RouteLine({ src }: { src: string }) {
  return (
    <div className="relative mx-auto h-full w-full max-w-md">
      {/* unoptimized: the image optimizer rejects SVG unless dangerouslyAllowSVG
          is enabled — these are static vectors, so serve them as-is. */}
      <Image src={src} alt="" fill unoptimized className="object-cover" />
    </div>
  );
}

export default function SectionTwo() {
  return (
    // `relative z-0` opens a stacking context here so the lines' negative
    // z-index resolves inside the section: they paint above its white
    // background but behind all of the copy. (`isolate` alone is not enough —
    // the background still wins.)
    <div className="relative z-0 bg-white px-6">
      <div className="pt-[120px] text-navy-1 text-center font-sans text-5xl font-semibold tracking-1px leading-[105%]">
        One continent.
        <br />
        All yours to
        <br />
        figure out.
      </div>
      <div className="text-center text-navy-1 font-sans mt-2.5 text-base leading-[126%] tracking-[0.16px]">
        Get to know Europe on a deeper
        <br />
        level when you travel by rail.
      </div>
      {/* gap-[60px] */}
      <div className="relative mt-[100px] grid grid-cols-1 gap-20">
        {/* Upper line — enters at the subheading and sweeps down to the right,
            passing above the first two copy blocks. Anchored to the copy stack
            (not the section top) so it holds if the headline rewraps; -230px is
            the Figma gap between the line's frame and the first block. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-6 -right-6 -top-[230px] -z-10 h-[432px]"
        >
          <RouteLine src="/img/section-2.1.svg" />
        </div>

        {STACK.map((item, index) => {
          let align = "justify-self-start";
          if (index === 1) {
            align = "justify-self-center";
          }
          if (index === 2) {
            align = "justify-self-end";
          }
          return (
            <div
              key={index}
              dangerouslySetInnerHTML={{ __html: item }}
              className={`text-navy-1 font-sans text-base font-normal tracking-16 leading-[125%] ${align}`}
            />
          );
        })}
      </div>

      {/* Lower line — rises from the bottom-left to just under the last copy
          block and exits right. Kept in flow so it reserves the 210px the Figma
          leaves below the copy for it to sweep through, and so its bottom edge
          stays pinned to the section's, which is how the asset is cropped.
          -43px is the overlap its frame has with that block in the design. */}
      <div
        aria-hidden
        className="pointer-events-none relative -z-10 -mx-6 -mt-[43px] h-[253px]"
      >
        <RouteLine src="/img/section-2.2.svg" />
      </div>
    </div>
  );
}
