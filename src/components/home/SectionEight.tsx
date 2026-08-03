import Image from "next/image";

/**
 * Filmstrip running down the left of the hero. Four of the five frames are
 * video fills in Figma and don't export, so they fall back to the #E5E5E5
 * plate the design already sits behind each one — drop a `src` in as the
 * clips arrive.
 */
const STRIP_FRAMES: { src?: string; alt?: string }[] = [
  {},
  {},
  { src: "/images/effect-strip-3.jpg", alt: "Brussels in spring" },
  {},
  {},
];

// Frame pitch down the strip, from the design.
const FRAME_PITCH = 154.458;

export default function SectionEight() {
  return (
    <section className="relative h-[694px] w-full overflow-hidden bg-white">
      {/* Hero photo. object-position reproduces the design's framing, which
          sits the crop left of centre. */}
      <Image
        src="/images/effect-hero.jpg"
        alt="A train crossing open countryside"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[41%_50%]"
      />
      <div aria-hidden className="absolute inset-0 bg-black/10" />

      {/* Filmstrip */}
      <div className="absolute left-8 top-px h-[692.5px] w-[137.07px] overflow-hidden bg-navy-1">
        {/* Strip backing photo, rotated a quarter turn as in the design. Only
            the ~9px gutters either side of the frames ever show it. */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[562.61px] w-[795.8px] -translate-x-1/2 -translate-y-1/2 -rotate-90"
        >
          <Image
            src="/images/effect-strip-bg.jpg"
            alt=""
            fill
            sizes="796px"
            className="object-cover"
          />
        </div>

        {STRIP_FRAMES.map((frame, i) => (
          <div
            key={i}
            className="absolute left-[9.21px] h-[147.3px] w-[116.61px] overflow-hidden bg-[#E5E5E5]"
            style={{ top: `${-9.21 + i * FRAME_PITCH}px` }}
          >
            {frame.src && (
              <Image
                src={frame.src}
                alt={frame.alt ?? ""}
                fill
                sizes="117px"
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {/* Copy */}
      <div className="absolute left-[112px] right-[14px] top-[74px] flex flex-col gap-1">
        <p className="font-departure text-xs uppercase leading-[18px] tracking-[0.72px] text-brand-yellow">
          traveller routes
        </p>
        <h2 className="font-sans text-[48px] font-semibold leading-[49.099px] tracking-[-1.0229px] text-white">
          Stories from the tracks
        </h2>
      </div>

      {/* Carriage number, tucked against the left edge */}
      <span className="absolute left-[2px] top-[203.5px] font-departure text-[14.321px] uppercase leading-[18px] tracking-[0.8592px] text-[#0F141C]">
        24
      </span>
    </section>
  );
}
