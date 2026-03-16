import { Text, useInput } from "ink";
import type { ReactElement } from "react";
import { useRef } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  isActive?: boolean;
  mask?: string;
  placeholder?: string;
}

/**
 * Minimal text-input component for Ink.
 *
 * Handles printable character input, backspace, Enter (submit), and
 * Escape (cancel).  Uses █ as cursor indicator when focused.
 *
 * A ref tracks the latest value so that rapid paste events (which fire
 * multiple useInput callbacks before React re-renders) each see the
 * most up-to-date string instead of a stale prop closure.
 */
export function TextInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  isActive = true,
  mask,
  placeholder
}: TextInputProps): ReactElement {
  // Keep a ref in sync so the useInput callback always reads the latest
  // value, even when multiple keystrokes arrive before the next render.
  const valueRef = useRef(value);
  valueRef.current = value;

  useInput(
    (input, key) => {
      if (key.return) {
        onSubmit?.();
        return;
      }
      if (key.escape) {
        onCancel?.();
        return;
      }
      if (key.backspace || key.delete) {
        const next = valueRef.current.slice(0, -1);
        valueRef.current = next;
        onChange(next);
        return;
      }
      // Accept only printable, non-control characters (filter newlines too)
      if (
        input &&
        !key.ctrl &&
        !key.meta &&
        !key.tab &&
        !key.upArrow &&
        !key.downArrow &&
        !key.leftArrow &&
        !key.rightArrow &&
        !/[\r\n]/.test(input)
      ) {
        const next = valueRef.current + input;
        valueRef.current = next;
        onChange(next);
      }
    },
    { isActive }
  );

  const display = mask ? mask.repeat(value.length) : value;

  // Always render display as a string (even empty) so the component
  // structure stays stable across renders and Ink doesn't produce layout
  // shifts when going from an empty to a non-empty value.
  return (
    <Text>
      <Text>{display}</Text>
      {!display && !isActive && placeholder && (
        <Text dimColor>{placeholder}</Text>
      )}
      {isActive && <Text color="cyan">█</Text>}
    </Text>
  );
}
