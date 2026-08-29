import { useEffect, RefObject } from "react";

/**
 * Custom hook to ensure horizontal carousel elements do not trap vertical wheel scrolling.
 */
export function useWheelPassThrough(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Allow Shift+Wheel to scroll horizontally
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey && Math.abs(e.deltaY) > 0) {
        element.scrollLeft += e.deltaY;
      }
    };

    element.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [ref]);
}

