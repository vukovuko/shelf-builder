"use client";

import type React from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

const FIRST_REPEAT_MS = 400;
const FASTEST_REPEAT_MS = 40;

/**
 * Props for a +/− button that keeps stepping while it is held: one step on
 * press, then repeats that speed up the longer the button is held. People were
 * clicking "+" dozens of times to move a size centimetre by centimetre.
 * Keyboard activation (Enter/Space) still steps once per press.
 */
export function useRepeatPress(action: () => void, disabled = false) {
  const actionRef = useRef(action);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopRef = useRef<() => void>(() => {});

  // The action closes over the value at render time; keep the newest one.
  useLayoutEffect(() => {
    actionRef.current = action;
  });

  useEffect(() => {
    if (disabled) stopRef.current();
  }, [disabled]);
  useEffect(() => () => stopRef.current(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    stopRef.current();
    actionRef.current();

    let delay = FIRST_REPEAT_MS;
    const tick = () => {
      actionRef.current();
      delay = Math.max(FASTEST_REPEAT_MS, delay * 0.75);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);

    // A disabled button (limit reached mid-hold) gets no pointer events, so
    // the release is caught on the window.
    const stop = () => {
      clearTimeout(timer.current);
      timer.current = undefined;
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      stopRef.current = () => {};
    };
    stopRef.current = stop;
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  return {
    onPointerDown,
    onPointerLeave: () => stopRef.current(),
    // Pointer presses already stepped; detail 0 means Enter or Space.
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0 && !disabled) actionRef.current();
    },
    // A long press on a phone would otherwise open the context menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    disabled,
  };
}
