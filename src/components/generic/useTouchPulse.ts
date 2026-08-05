"use client";

import { useEffect, useState } from "react";
import { useInView } from "framer-motion";

/**
 * The rest is much longer than the hold on purpose: the control should read as
 * announcing itself now and then, not as something blinking.
 */
const HOLD_MS = 1200;
const REST_MS = 2600;

/**
 * Plays a link's hover cue on a timer for readers who cannot hover.
 *
 * The underline and arrow on these CTAs are CSS transitions gated behind
 * `(hover: hover)`, which is right for a pointer but leaves a touch screen with
 * no affordance at all — the yellow underline is what says the label is a
 * control. Returning a flag lets the caller drive the *same* transitions from a
 * `data-pulse` attribute, so movement, duration and easing stay the hover
 * treatment exactly; only the trigger differs.
 *
 * Deliberately narrow:
 *   - `(hover: none)` only. Anywhere real hover works this never runs, and the
 *     query is watched, so switching input device (or toggling responsive mode)
 *     takes effect without a reload.
 *   - Paused unless the element is actually on screen, so an offscreen section
 *     never holds a timer.
 *   - Off entirely under reduced motion.
 *
 * Nothing is read during render, so there is no hydration mismatch: the server
 * and the first client paint both show the resting state, and the cycle only
 * begins once the effect has confirmed the device.
 */
export function useTouchPulse(
  ref: React.RefObject<HTMLElement | null>,
  reduce: boolean,
) {
  const [pulse, setPulse] = useState(false);
  const inView = useInView(ref, { amount: 0.6 });

  useEffect(() => {
    if (reduce || !inView) {
      setPulse(false);
      return;
    }

    const query = window.matchMedia("(hover: none)");
    let timer: number | undefined;

    const stop = () => {
      window.clearTimeout(timer);
      timer = undefined;
      setPulse(false);
    };

    const start = () => {
      if (!query.matches || timer !== undefined) return;
      let on = false;
      const tick = () => {
        on = !on;
        setPulse(on);
        timer = window.setTimeout(tick, on ? HOLD_MS : REST_MS);
      };
      timer = window.setTimeout(tick, REST_MS);
    };

    const onChange = () => (query.matches ? start() : stop());
    query.addEventListener("change", onChange);
    start();

    return () => {
      query.removeEventListener("change", onChange);
      stop();
    };
  }, [inView, reduce]);

  return pulse;
}
