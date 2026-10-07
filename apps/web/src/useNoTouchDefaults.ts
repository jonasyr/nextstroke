import { type RefObject, useEffect } from "react";

/**
 * Stops iOS from turning a press-and-drag on a drawing surface into text selection, the
 * magnifier or the callout menu. CSS alone does not always suppress them (WebKit 231161), so a
 * non-passive touchstart cancels the default; pointer events still arrive for the drag itself.
 */
export function useNoTouchDefaults(target: RefObject<HTMLElement | null> | HTMLElement | null) {
  useEffect(() => {
    const el = target && "current" in target ? target.current : target;
    if (!el) return;
    const cancel = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    el.addEventListener("touchstart", cancel, { passive: false });
    el.addEventListener("selectstart", cancel);
    return () => {
      el.removeEventListener("touchstart", cancel);
      el.removeEventListener("selectstart", cancel);
    };
  }, [target]);
}
