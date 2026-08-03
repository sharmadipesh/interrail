import Image from "next/image";

/**
 * Scrim under the traveller's name — the design stacks a 180°-rotated gradient
 * over each photo, which is this read bottom-up. Only the darkest end lands in
 * the padded box where the name sits.
 */
const SCRIM =
  "linear-gradient(0deg, rgba(15,20,28,0.55) 0%, rgba(15,20,28,0.29) 30.769%, rgba(255,255,255,0.05) 51.923%, rgba(255,255,255,0.05) 100%)";

type Story = {
  src: string;
  /** Per-card framing — a couple of these are cropped well off centre. */
  position: string;
  name: string;
  quote: string;
};

const STORIES: Story[] = [
  {
    src: "/images/effect-1.jpg",
    position: "object-bottom",
    name: "Anna Kwan",
    quote:
      "“We made new friends on the train and said ‘see you soon’ instead of ‘goodbye.’”",
  },
  {
    src: "/images/effect-2.jpg",
    position: "object-bottom",
    name: "Francesco Sercia",
    quote:
      "“Solo travel through Europe wasn’t always easy. But it was always worth it.”",
  },
  {
    src: "/images/effect-3.jpg",
    position: "object-bottom",
    name: "Jide Maduako",
    quote: "“Stopped checking my phone. Started checking the view.”",
  },
  {
    src: "/images/effect-4.jpg",
    position: "object-bottom",
    name: "Matt Phipps",
    quote:
      "“Staring out the train window that makes you feel like the main character.”",
  },
  {
    src: "/images/effect-5.jpg",
    position: "object-center",
    name: "Austin Aughinbaugh",
    quote:
      "“I always thought I’d catch my first wave somewhere tropical. Not in Austria.”",
  },
  {
    src: "/images/effect-6.jpg",
    position: "object-bottom",
    name: "Ellie",
    quote: "“If I had taken a plane, I wouldn’t have had any of these experiences.”",
  },
  {
    src: "/images/effect-7.jpg",
    position: "object-[60%_50%]",
    name: "Micheal Motamedi",
    quote:
      "“Somewhere along the way, the train started to feel like a metaphor for life.”",
  },
];

function StoryCard({ story }: { story: Story }) {
  return (
    <article className="flex w-[297px] shrink-0 snap-start flex-col gap-[21.704px]">
      <div className="relative flex h-[396px] flex-col justify-end overflow-hidden px-[27.415px] py-[36.554px]">
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
        <p className="relative font-sans text-[20px] font-semibold leading-[22.846px] tracking-[-0.2px] text-white">
          {story.name}
        </p>
      </div>

      <blockquote className="font-sans text-[20px] font-semibold leading-[22.846px] tracking-[-0.2px] text-navy-1">
        {story.quote}
      </blockquote>
    </article>
  );
}

export default function SectionNine() {
  return (
    // pt is the gap the design leaves between this and the hero above.
    <section className="bg-white pb-[30px] pt-[60px]">
      {/* Story strip — scroll-snaps horizontally; scroll-pl-6 keeps a snapped
          card against the page gutter rather than the viewport edge. */}
      <div className="snap-x snap-mandatory scroll-pl-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-5 px-6">
          {STORIES.map((story) => (
            <StoryCard key={story.src} story={story} />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        {/* Pagination — static until the strip is wired up */}
        <div aria-hidden className="flex items-center gap-[9px]">
          <span className="block h-[6.5px] w-[6.5px] rounded-full border-2 border-brand-yellow" />
          {STORIES.slice(1).map((story) => (
            <span
              key={story.src}
              className="block h-[6.5px] w-[6.5px] rounded-full bg-[#E5E5E5]"
            />
          ))}
        </div>

        <button
          type="button"
          className="group flex items-center gap-1.5 font-sans text-base font-semibold leading-[1.4] text-[#0F141C]"
        >
          Explore Their Trips
          <Image
            src="/images/effect-arrow.svg"
            alt=""
            aria-hidden
            width={8}
            height={7}
            unoptimized
            className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </section>
  );
}
