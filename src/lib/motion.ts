// Scrolling that respects "reduce motion". CSS already turns smooth scrolling off for it, but a script's
// `behavior: "smooth"` overrides CSS, so every scripted scroll asks here first.

/** "auto" (instant) when the person prefers reduced motion, otherwise "smooth". Reads window: call only in event handlers or effects. */
export const scrollMotion = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
