"use client";

import { useEffect, useId, type ReactNode } from "react";

type ModalSize = "md" | "lg" | "3xl" | "4xl";

const SIZE_CLASS: Record<ModalSize, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** While true (e.g. saving), Escape, the backdrop and the × button don't close it. */
  busy?: boolean;
  size?: ModalSize;
  /**
   * - `form`: padded card with the title on top; the whole card scrolls. For short forms.
   * - `panel`: fixed header with a × button; children fill the rest and handle their
   *   own scrolling (use `ModalToolbar`, `ModalBody`, `ModalFooter`). For long lists.
   */
  layout?: "form" | "panel";
};

export function Modal({
  open,
  onClose,
  title,
  children,
  busy = false,
  size = "md",
  layout = "form",
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  function requestClose() {
    if (!busy) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0" onClick={requestClose} aria-hidden="true" />
      {layout === "form" ? (
        <div
          className={`relative w-full ${SIZE_CLASS[size]} max-h-[90dvh] overflow-y-auto rounded-xl border border-foreground/10 bg-background p-6 shadow-lg`}
        >
          <h2 id={titleId} className="mb-4 text-lg font-semibold text-foreground">
            {title}
          </h2>
          {children}
        </div>
      ) : (
        <div
          className={`relative flex w-full ${SIZE_CLASS[size]} max-h-[85dvh] flex-col rounded-2xl border border-foreground/10 bg-background shadow-xl`}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-foreground/10 px-6 py-4">
            <h2 id={titleId} className="truncate text-lg font-semibold text-foreground">
              {title}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              disabled={busy}
              className="shrink-0 rounded p-1 text-foreground/70 hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

/** Class for a `<form>` that wraps the toolbar/body/footer of a panel modal. */
export const panelFormClass = "flex min-h-0 flex-1 flex-col";

/** Non-scrolling area under a panel modal's header (search box, hints, errors). */
export function ModalToolbar({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-col gap-2 px-6 pb-3 pt-4">{children}</div>;
}

/** Scrolling middle of a panel modal. */
export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">{children}</div>;
}

/** Bottom action bar of a panel modal. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 justify-end gap-3 border-t border-foreground/10 px-6 py-4">
      {children}
    </div>
  );
}
