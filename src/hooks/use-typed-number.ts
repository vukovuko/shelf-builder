import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useState,
} from "react";

/**
 * Props for a number field people can type into. Clamping on every keystroke
 * made typing impossible ("1" on the way to "150" snapped to the minimum), so
 * the field keeps the raw text while focused, applies numbers that are already
 * in range right away and clamps the rest on blur or Enter.
 */
export function useTypedNumber({
  value,
  min,
  max,
  onValue,
}: {
  value: number;
  min: number;
  max: number;
  onValue: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return {
    type: "number" as const,
    inputMode: "numeric" as const,
    value: draft ?? value,
    min,
    max,
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      setDraft(String(value));
      e.target.select();
    },
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDraft(raw);
      const typed = Number(raw);
      if (raw !== "" && typed >= min && typed <= max) onValue(typed);
    },
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const typed = Number(raw);
      if (raw.trim() !== "" && Number.isFinite(typed)) {
        onValue(Math.max(min, Math.min(max, Math.round(typed))));
      }
      setDraft(null);
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") e.currentTarget.blur();
    },
  };
}
