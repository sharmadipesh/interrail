"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import Navbar from "@/components/generic/Navbar";
import Loader, {
  LOADER_EXIT_MS,
  LOADER_REVEAL_MS,
} from "@/components/generic/Loader";
import { INTRO_KEY } from "@/components/generic/intro";
import Banner from "@/components/home/Banner";
import SectionTwo from "@/components/home/SectionTwo";
import SectionThree from "@/components/home/SectionThree";
import SectionFour from "@/components/home/SectionFour";
import SectionFive from "@/components/home/SectionFive";
import SectionSix from "@/components/home/SectionSix";
import SectionEight from "@/components/home/SectionEight";
import SectionNine from "@/components/home/SectionNine";
import SectionTen from "@/components/home/SectionTen";
import SectionEle from "@/components/home/SectionEle";
import SectionTwe from "@/components/home/SectionTwe";
import Footer from "@/components/home/Footer";

// Always show the bar within this many px of the top — the hero keeps its nav.
const TOP_ZONE = 80;
// Dead zone: ignore sub-pixel jitter so the bar doesn't flicker on tiny moves.
const DELTA = 6;
// How long scrolling must be idle before the bar slides back down.
const IDLE_MS = 180;

/* ------------------------------------------------------------------ *
 * Intro
 * ------------------------------------------------------------------ */

/**
 * "pending" is the frame before the client has read sessionStorage. The intro
 * is never server-rendered, so nothing is committed either way until the layout
 * effect below runs — which is what keeps a returning visitor from catching a
 * frame of it.
 */
type Intro = "pending" | "playing" | "revealing" | "done";

/**
 * Layout, not passive: this decides whether to cover the page, and it has to
 * land before the browser paints the first hydrated frame or a first-time
 * visitor sees the hero and then watches it get covered up. Falls back to
 * useEffect on the server, where neither one runs and React would otherwise
 * warn about the layout variant.
 */
const useIntroLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Home() {
  const [navHidden, setNavHidden] = useState(false);
  const [intro, setIntro] = useState<Intro>("pending");

  /**
   * Strict Mode runs this effect twice on one instance. Without the latch the
   * second pass reads back the flag the first pass just wrote, concludes the
   * intro has already been seen, and skips it. The ref survives the simulated
   * remount; the flag in sessionStorage cannot tell the two passes apart.
   */
  const decided = useRef(false);

  useIntroLayoutEffect(() => {
    if (decided.current) return;
    decided.current = true;

    // A throwing sessionStorage (private mode, blocked storage) resolves to
    // "already seen" — better to skip the intro than to risk repeating it.
    let seen = true;
    try {
      seen = window.sessionStorage.getItem(INTRO_KEY) !== null;
    } catch {
      seen = true;
    }

    // Read directly rather than through useReducedMotion: this needs an answer
    // in the same tick, before anything is committed.
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (seen || reduce) {
      setIntro("done");
      return;
    }

    // Marked as the intro begins, not as it finishes: a reload or a navigation
    // away part-way through must still count as spent.
    try {
      window.sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* nothing to do — the intro simply plays again next session */
    }

    // A genuine first visit starts at the top, whatever the browser restored.
    window.scrollTo(0, 0);
    setIntro("playing");
  }, []);

  /**
   * Hands the homepage back the moment the curtain starts to lift, releasing
   * the boot script's paint hold. A layout effect, not a passive one: if this
   * landed a frame late the curtain would already be moving over a page that
   * was still being held back, and the reveal would show white.
   *
   * Keyed on the phase rather than called from `onReveal`, so the fallback
   * timers unblock the page too if the intro's own callback never arrives.
   */
  useIntroLayoutEffect(() => {
    if (intro === "pending" || intro === "playing") return;
    delete document.documentElement.dataset.intro;
  }, [intro]);

  /** The overlay is over the page for both of these. */
  const introBlocking = intro === "playing" || intro === "revealing";
  /** The homepage's own entrance runs from the moment the curtain starts up. */
  const introReady = intro === "revealing" || intro === "done";

  /**
   * Scroll lock. Restores the exact inline values it found rather than clearing
   * them, and compensates for the scrollbar it removes so the page doesn't jump
   * sideways when the curtain lifts on desktop.
   */
  useEffect(() => {
    if (!introBlocking) return;

    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPadding = body.style.paddingRight;
    const gutter = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPadding;
    };
  }, [introBlocking]);

  /**
   * Two backstops, so a dropped animation callback can never leave the page
   * covered and unscrollable: one if the intro never asks to be revealed, one
   * if AnimatePresence never reports the curtain gone.
   */
  useEffect(() => {
    if (intro === "playing") {
      const t = window.setTimeout(
        () => setIntro("revealing"),
        LOADER_REVEAL_MS + 900,
      );
      return () => window.clearTimeout(t);
    }
    if (intro === "revealing") {
      const t = window.setTimeout(() => setIntro("done"), LOADER_EXIT_MS + 400);
      return () => window.clearTimeout(t);
    }
  }, [intro]);

  // Refs keep the scroll handler a stable, allocation-free closure and let it
  // short-circuit redundant state updates.
  const hiddenRef = useRef(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    lastYRef.current = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout>;

    const apply = (next: boolean) => {
      if (hiddenRef.current === next) return; // skip no-op renders
      hiddenRef.current = next;
      setNavHidden(next);
    };

    // Reads scroll state once per frame (scheduled from the scroll listener).
    const update = () => {
      tickingRef.current = false;
      const y = window.scrollY;
      const delta = y - lastYRef.current;

      if (y <= TOP_ZONE) {
        apply(false); // near the top → always visible
      } else if (delta > DELTA) {
        apply(true); // scrolling down → hide
      } else if (delta < -DELTA) {
        apply(false); // scrolling up → show
      }

      lastYRef.current = y;
    };

    const onScroll = () => {
      // Throttle DOM reads + state to one per animation frame.
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(update);
      }
      // Reveal again shortly after scrolling stops.
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => apply(false), IDLE_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(idleTimer);
    };
  }, []);

  return (
    <>
      {/* inert while the curtain is over the page: no pointer, no tab stops, no
          screen reader. Lifted the instant the handoff starts, so the hero is
          reachable as soon as it is on its way in. */}
      <main inert={introBlocking}>
        <Navbar hidden={navHidden} ready={introReady} />
        <Banner ready={introReady} />
        <SectionTwo />
        <SectionThree />
        <SectionFour />
        <SectionFive />
        <SectionSix />
        <SectionEight />
        <SectionNine />
        <SectionTen />
        <SectionEle />
        <SectionTwe />
        <Footer />
      </main>

      {/* Removing the Loader is what plays its exit; onExitComplete is what
          takes it out of the DOM and gives scrolling back. */}
      <AnimatePresence onExitComplete={() => setIntro("done")}>
        {intro === "playing" && (
          <Loader key="intro" onReveal={() => setIntro("revealing")} />
        )}
      </AnimatePresence>
    </>
  );
}
