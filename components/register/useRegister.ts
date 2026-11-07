"use client";

import { useCallback, useRef, useState } from "react";
import {
  initialRegisterState,
  reduceRegister,
  type RegisterAction,
  type RegisterState,
} from "@/lib/register-machine";
import { saveTransaction } from "@/lib/transactions";

/**
 * Register state plus `press(key)`. When a key moves the sale into "saving",
 * this saves it to Firestore and reports back with the receipt number.
 */
export function useRegister() {
  const [state, setState] = useState<RegisterState>(initialRegisterState);
  // Latest state, so quick key presses never act on a stale copy.
  const stateRef = useRef(state);

  const press = useCallback(function press(action: RegisterAction) {
    const prev = stateRef.current;
    const next = reduceRegister(prev, action);
    if (next === prev) return;
    stateRef.current = next;
    setState(next);

    if (prev.phase !== "saving" && next.phase === "saving" && next.payment) {
      saveTransaction({ type: next.mode, lines: next.lines, ...next.payment })
        .then(({ seq }) => press({ type: "saved", seq }))
        .catch((err: unknown) => {
          const reason = err instanceof Error ? err.message : String(err);
          press({ type: "saveFailed", message: `Not saved (${reason}). Check the internet and press ENTER again.` });
        });
    }
  }, []);

  return { state, press };
}
