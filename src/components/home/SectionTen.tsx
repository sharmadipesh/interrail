import Image from "next/image";

/**
 * Scrim over each photo so the quote and name stay legible — darkest at the
 * top where the quote sits, clearing to almost nothing by the midpoint.
 */
const SCRIM =
  "linear-gradient(180deg, rgba(15,20,28,0.55) 0%, rgba(15,20,28,0.4) 30.769%, rgba(255,255,255,0.05) 51.923%, rgba(255,255,255,0.05) 100%)";

type Story = {
  src: string;
  /** Per-card framing — the design crops a few of these off-centre. */
  position: string;
  quote: string;
  name: string;
};

const STORIES: Story[] = [
  {
    src: "/images/community-1.jpg",
    position: "object-right",
    quote: "“The pleasure of moving slowly, by train and by foot, still lingers.”",
    name: "Maya",
  },
  {
    src: "/images/community-2.jpg",
    position: "object-center",
    quote:
      "“We no longer think of the journey as the thing standing between us and the holiday. The journey has become a ritual.”",
    name: "Seth Amstrong",
  },
  {
    src: "/images/community-3.jpg",
    position: "object-center",
    quote:
      "“The time spent with my friends became even more intense and special”",
    name: "Anna & her Friends",
  },
  {
    src: "/images/community-4.jpg",
    position: "object-bottom",
    quote:
      "“Interrail encourages you to bond together as a family in a way that makes the average package holiday seem rather dull.”",
    name: "Seth Amstrong",
  },
  {
    src: "/images/community-5.jpg",
    position: "object-right",
    quote:
      "“Our family enjoyed exploring new places we’ve never been before and being able to find the right balance.”",
    name: "Seth Amstrong",
  },
  {
    src: "/images/community-6.jpg",
    position: "object-center",
    quote:
      "“Our route took us over thousands of miles. Every part of it was worth it.”",
    name: "Seth Amstrong",
  },
];

function StoryCard({ story }: { story: Story }) {
  return (
    <article className="relative h-[396px] w-[297px] shrink-0 snap-start overflow-hidden">
      <Image
        src={story.src}
        alt={story.name}
        fill
        sizes="297px"
        className={`object-cover ${story.position}`}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: SCRIM }}
      />

      <figure className="relative flex h-full flex-col justify-between px-6 py-9">
        <blockquote className="font-departure text-sm leading-[1.1] text-white">
          {story.quote}
        </blockquote>
        <figcaption className="font-sans text-[18px] font-semibold leading-5 tracking-[-0.18px] text-white">
          {story.name}
        </figcaption>
      </figure>
    </article>
  );
}

export default function SectionTen() {
  return (
    <section className="relative overflow-hidden bg-white pb-24 pt-48">
      {/* Route line running in from the top-left corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-[11px] top-0 block h-[132.371px] w-[423.646px]"
      >
        <Image
          src="/images/community-route.svg"
          alt=""
          fill
          unoptimized
          className="object-contain"
        />
      </span>

      {/* Two clips float over the copy, half off each edge. Figma exports these
          as empty layers because they carry video fills, so the frames are laid
          out here and stay empty until the clips are supplied. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[328px] top-[204px] h-[115px] w-[154px] overflow-hidden rounded-[9px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[106px] top-[281px] h-[115px] w-[154px] overflow-hidden rounded-[9px]"
      />

      <div className="relative mx-auto max-w-md">
        {/* Heading */}
        <div className="mx-auto flex w-[281px] max-w-full flex-col items-center gap-6 px-6 text-center text-navy-1">
          <h2 className="font-sans text-5xl font-semibold leading-[48px] tracking-1px">
            9 Million
            <br />
            Trips
          </h2>
          <p className="font-sans text-base font-normal leading-[126%] tracking-16">
            Nearly nine million trips taken. Even more memories made along the
            way.
          </p>
        </div>

        {/* Story strip — scroll-snaps horizontally; the drag carousel and the
            reveal animations land later. */}
        <div className="mt-[106px]">
          {/* scroll-pl-6 so a snapped card rests against the page gutter
              rather than flush to the viewport edge, which would swallow the
              track's own left padding. */}
          <div className="snap-x snap-mandatory scroll-pl-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-5 px-6">
              {STORIES.map((story) => (
                <StoryCard key={story.src} story={story} />
              ))}
            </div>
          </div>

          {/* Pagination — static until the strip is wired up */}
          <div
            aria-hidden
            className="mt-[42px] flex items-center gap-[8.76px] px-6"
          >
            <span className="block h-[6.5px] w-[6.5px] rounded-full border-2 border-brand-yellow" />
            {STORIES.slice(1).map((story) => (
              <span
                key={story.src}
                className="block h-[6.5px] w-[6.5px] rounded-full bg-[#E5E5E5]"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
