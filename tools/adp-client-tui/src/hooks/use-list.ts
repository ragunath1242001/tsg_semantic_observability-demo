import { useInput } from "ink";
import { useEffect, useRef, useState } from "react";

/**
 * Hook for managing a scrollable list with keyboard navigation.
 *
 * Returns the current cursor position, a setter, and the visible range
 * for rendering.  Arrow keys / j/k move the cursor; the visible window
 * scrolls automatically to keep the cursor in view.
 */
export function useList(
  itemCount: number,
  viewportHeight: number,
  isActive: boolean = true
) {
  const [cursor, setCursor] = useState(0);
  const offsetRef = useRef(0);

  // Clamp cursor when item count shrinks
  useEffect(() => {
    if (itemCount === 0) {
      setCursor(0);
      offsetRef.current = 0;
    } else {
      setCursor((c) => Math.min(c, itemCount - 1));
    }
  }, [itemCount]);

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        setCursor((c) => Math.max(0, c - 1));
      }
      if (key.downArrow || input === "j") {
        setCursor((c) => Math.min(itemCount - 1, c + 1));
      }
    },
    { isActive }
  );

  // Compute scroll offset (derived, not state – avoids extra re-renders)
  let off = offsetRef.current;
  if (cursor < off) off = cursor;
  if (cursor >= off + viewportHeight) off = cursor - viewportHeight + 1;
  off = Math.max(0, Math.min(off, Math.max(0, itemCount - viewportHeight)));
  offsetRef.current = off;

  return {
    cursor,
    setCursor,
    visibleStart: off,
    visibleEnd: Math.min(itemCount, off + viewportHeight)
  };
}
