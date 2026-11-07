import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export const inputClass =
  "w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20";

/** Rounder, smaller-text box used for search fields on pages and in pickers. */
export const searchInputClass =
  "w-full rounded-xl border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20";

export const fileInputClass =
  "w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-foreground/20 file:bg-foreground/5 file:px-3 file:py-2 file:text-sm";

export const checkboxClass =
  "rounded border-foreground/30 text-foreground focus:ring-foreground/20";

function withClass(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={withClass(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={withClass(`${inputClass} resize-none`, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={withClass(inputClass, className)} {...props} />;
}

/** Checkbox with its label to the right. */
export function CheckboxField({
  label,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={withClass("flex cursor-pointer items-center gap-3", className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-foreground/30" {...props} />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </label>
  );
}

/** Label (with optional required star and hint) above a form control. */
export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-foreground/60">{hint}</p>}
    </div>
  );
}

/** Red error line; renders nothing when there's no message. */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
      {message}
    </p>
  );
}

/** Cancel + submit buttons at the bottom of a form. */
export function FormActions({
  onCancel,
  submitting,
  submitLabel = "Save",
  submittingLabel = "Saving…",
  submitDisabled = false,
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onClick={onCancel} disabled={submitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={submitting || submitDisabled}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </div>
  );
}
