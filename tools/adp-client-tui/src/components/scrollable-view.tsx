import { Box, Text, useInput, useStdout } from "ink";
import { useEffect, useRef, useState } from "react";

interface ScrollableViewProps {
  /** The text content to display (newline-separated) */
  content: string;
  /** Title shown in the header bar */
  title: string;
  /** Optional secondary label next to the title */
  label?: string;
  /** Whether this view handles keyboard input */
  isActive?: boolean;
  /** Called when the user presses esc/b/q to close */
  onClose: () => void;
  /** Extra hint text appended to the default help line */
  helpExtra?: string;
  /** When true, auto-scroll to the bottom as content grows (streaming) */
  follow?: boolean;
}

/**
 * A scrollable text viewer for logs, file previews, and similar content.
 *
 * - Arrow up/down (or j/k): scroll vertically
 * - Arrow left/right (or h/l): scroll horizontally
 * - No word-wrap: long lines are clipped to the viewport and panned with left/right
 * - Line numbers are displayed in a gutter
 */
export function ScrollableView({
  content,
  title,
  label,
  isActive = true,
  onClose,
  helpExtra,
  follow: followProp = false
}: ScrollableViewProps) {
  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;

  const lines = content.split("\n");
  const totalLines = lines.length;

  // Gutter width: line-number digits + " │ "
  const gutterDigits = Math.max(3, String(totalLines).length);
  const gutterWidth = gutterDigits + 3; // digits + " │ "
  // Available width for line content (account for 1-char padding each side)
  const contentWidth = Math.max(10, termCols - 2 - gutterWidth);

  // Reserve: header(1) + separator(1) + help(1) = 3
  const viewportHeight = Math.max(4, termRows - 3);

  const [scrollY, setScrollY] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [wrap, setWrap] = useState(false);
  const [follow, setFollow] = useState(followProp);

  useEffect(() => {
    setFollow(followProp);
  }, [followProp]);

  const linesWithLineNumber: [number, boolean, string][] = wrap
    ? lines.flatMap((line, idx) => {
        // If wrapping is enabled, we need to split long lines into multiple visual lines.
        if (line.length <= contentWidth) {
          return [[idx, true, line]];
        }
        const wrapped: [number, boolean, string][] = [];
        for (let start = 0; start < line.length; start += contentWidth) {
          wrapped.push([
            idx,
            start === 0,
            line.slice(start, start + contentWidth)
          ]);
        }
        return wrapped;
      })
    : lines.map((line, idx) => [idx, true, line]);

  const prevTotalRef = useRef(linesWithLineNumber.length);

  // Auto-scroll when follow mode is active and new content arrives
  useEffect(() => {
    if (follow && linesWithLineNumber.length > prevTotalRef.current) {
      const maxY = Math.max(0, linesWithLineNumber.length - viewportHeight);
      setScrollY(maxY);
    }
    prevTotalRef.current = linesWithLineNumber.length;
  }, [follow, linesWithLineNumber.length, viewportHeight]);

  // ── Input handling ──────────────────────────────────────────────────────

  useInput(
    (input, key) => {
      const maxY = Math.max(0, linesWithLineNumber.length - viewportHeight);

      if (key.upArrow || input === "k") {
        setFollow(false);
        setScrollY((y) => Math.max(0, y - 1));
      } else if (key.downArrow || input === "j") {
        setFollow(false);
        setScrollY((y) => Math.min(maxY, y + 1));
      } else if (key.leftArrow || input === "h") {
        setFollow(false);
        setScrollX((x) => Math.max(0, x - 4));
      } else if (key.rightArrow || input === "l") {
        setFollow(false);
        setScrollX((x) => x + 4);
      } else if (key.pageDown) {
        setFollow(false);
        setScrollY((y) => Math.min(maxY, y + viewportHeight));
      } else if (key.pageUp) {
        setFollow(false);
        setScrollY((y) => Math.max(0, y - viewportHeight));
      } else if (input === "f") {
        setFollow((f) => !f);
        if (!follow) setScrollY(maxY);
      } else if (input === "t") {
        setFollow(false);
        setScrollY(0);
        setScrollX(0);
      } else if (input === "e") {
        setScrollY(maxY);
      } else if (input === "0") {
        setScrollX(0);
      } else if (input === "w") {
        setWrap((w) => !w);
      } else if (key.escape || input === "b" || input === "q") {
        onClose();
      }
    },
    { isActive }
  );

  // ── Derived values ──────────────────────────────────────────────────────

  const visibleLines = linesWithLineNumber.slice(
    scrollY,
    scrollY + viewportHeight
  );
  const separator = "─".repeat(termCols - 2);

  const endLine = Math.min(
    scrollY + viewportHeight,
    linesWithLineNumber.length
  );

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1}>
        <Text dimColor>{title} </Text>
        {label && <Text bold>{label}</Text>}
        <Text dimColor>
          {" "}
          ({scrollY + 1}–{endLine}/{linesWithLineNumber.length}
          {scrollX > 0 ? ` col+${scrollX}` : ""})
        </Text>
        {follow && <Text color="green"> [FOLLOWING]</Text>}
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" paddingX={1}>
        {visibleLines.map((line, i) => {
          const lineNum = line[0];
          const numStr = line[1]
            ? String(lineNum).padStart(gutterDigits)
            : " ".repeat(gutterDigits);
          // Horizontal slice: skip scrollX chars, take contentWidth chars
          const sliced =
            line[2].length > scrollX
              ? line[2].slice(scrollX, scrollX + contentWidth)
              : "";
          return (
            <Text key={scrollY + i} wrap="truncate">
              <Text dimColor>{numStr} │ </Text>
              {sliced}
            </Text>
          );
        })}
      </Box>

      {/* Help */}
      <Box paddingX={1}>
        <Text dimColor>
          ↑↓ scroll · ←→ pan · t top · e end · 0 col0 · w wrap · f follow ·
          b/esc close
          {helpExtra ? ` · ${helpExtra}` : ""}
        </Text>
      </Box>
    </Box>
  );
}
