/**
 * Shared between the boot script in the layout, the stylesheet, and the
 * page-level orchestration — all three have to agree on one key.
 *
 * Versioned so a reworked intro can be shown again without stale opt-outs.
 */
export const INTRO_KEY = "interrail-intro-seen-v1";

/**
 * Runs before the first paint, at the top of <body>, so it executes while the
 * rest of the document is still being parsed.
 *
 * This exists because the homepage is server-rendered: the browser paints the
 * hero as soon as the HTML arrives, and React only mounts the loader once it
 * hydrates. A layout effect is too late — it runs after that first paint, which
 * is why the banner flashed before the intro appeared. Setting the attribute
 * here lets the stylesheet hide the page in the very first frame instead.
 *
 * It only ever reads. Writing the flag here would leave React's own decision
 * reading "already seen" a moment later, and the intro would never play.
 *
 * The timeout is the escape hatch: if the bundle fails and React never
 * hydrates, nothing else would ever clear the attribute and the page would sit
 * blank. Without JS at all the attribute is never set and nothing is hidden.
 */
export const INTRO_BOOT_SCRIPT = `(function(){try{
if(sessionStorage.getItem(${JSON.stringify(INTRO_KEY)})!==null)return;
if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var e=document.documentElement;e.dataset.intro="play";
setTimeout(function(){if(e.dataset.intro==="play"){delete e.dataset.intro}},4000)
}catch(_){}})()`;
