"use client";

import { useEffect } from "react";
import { useModalStore } from "@/stores/modalStore";

export function AppModal() {
  const { open, kind, title, message, confirmLabel, cancelLabel, danger, resolveModal } =
    useModalStore();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") resolveModal(kind !== "confirm");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, kind, resolveModal]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="app-modal-title"
      aria-describedby="app-modal-message"
    >
      <div
        className="absolute inset-0"
        onClick={() => kind === "alert" && resolveModal(true)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-xl bg-background border border-foreground/10 shadow-lg p-6">
        {title && (
          <h2 id="app-modal-title" className="text-lg font-semibold text-foreground mb-2">
            {title}
          </h2>
        )}
        <p id="app-modal-message" className="text-sm text-foreground/80 whitespace-pre-line mb-6">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          {kind === "confirm" && (
            <button
              type="button"
              onClick={() => resolveModal(false)}
              className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => resolveModal(true)}
            autoFocus
            className={`rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/20"
                : "bg-foreground text-background hover:opacity-90 focus:ring-foreground/20"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
