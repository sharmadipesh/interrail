"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/generic/Navbar";
import Banner from "@/components/home/Banner";
import SectionTwo from "@/components/home/SectionTwo";
import SectionThree from "@/components/home/SectionThree";
import SectionFour from "@/components/home/SectionFour";

// Always show the bar within this many px of the top — the hero keeps its nav.
const TOP_ZONE = 80;
// Dead zone: ignore sub-pixel jitter so the bar doesn't flicker on tiny moves.
const DELTA = 6;
// How long scrolling must be idle before the bar slides back down.
const IDLE_MS = 180;

export default function Home() {
  const [navHidden, setNavHidden] = useState(false);

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
    <main>
      <Navbar hidden={navHidden} />
      <Banner />
      <SectionTwo />
      <SectionThree />
      <SectionFour />
    </main>
  );
}
