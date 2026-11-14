"use client";

import type { ReactNode } from "react";

/** Card around one group of settings. */
export const sectionClass = "space-y-4 rounded-xl border border-foreground/10 p-4 sm:p-6";

const smallButtonClass =
  "inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-foreground/15 px-2 text-sm font-medium text-foreground hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-30";

/** `ids` with the item at `index` moved one place up (-1) or down (+1). */
export function moveId(ids: string[], index: number, dir: -1 | 1): string[] {
  const next = [...ids];
  [next[index], next[index + dir]] = [next[index + dir], next[index]];
  return next;
}

/** A readable message from anything thrown. */
export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** One row in a settings list: content on the left, reorder / edit / on-off / delete on the right. */
export function SettingsRow({
  active,
  first,
  last,
  disabled,
  onMove,
  onEdit,
  onToggle,
  onDelete,
  children,
}: {
  active: boolean;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className={`min-w-0 flex-1 ${active ? "" : "opacity-50"}`}>{children}</div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" className={smallButtonClass} onClick={() => onMove(-1)} disabled={disabled || first} aria-label="Move up">
          ↑
        </button>
        <button type="button" className={smallButtonClass} onClick={() => onMove(1)} disabled={disabled || last} aria-label="Move down">
          ↓
        </button>
        <button type="button" className={smallButtonClass} onClick={onEdit} disabled={disabled}>
          Edit
        </button>
        <button type="button" className={`${smallButtonClass} w-20`} onClick={onToggle} disabled={disabled}>
          {active ? "Turn off" : "Turn on"}
        </button>
        <button
          type="button"
          className={`${smallButtonClass} text-red-600 dark:text-red-400`}
          onClick={onDelete}
          disabled={disabled}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

/** Grey "Off" tag next to a turned-off item. */
export function OffBadge() {
  return (
    <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/70">Off</span>
  );
}

