import type { ButtonHTMLAttributes } from "react";

const baseButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50";

/** Exported for elements that should look like a button but aren't one (e.g. links). */
export const primaryButtonClass = `${baseButtonClass} bg-foreground text-background hover:opacity-90`;
export const secondaryButtonClass = `${baseButtonClass} border border-foreground/20 text-foreground hover:bg-foreground/5`;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

/** Defaults to `type="button"` so it never submits a form by accident. */
export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const variantClass = variant === "primary" ? primaryButtonClass : secondaryButtonClass;
  return (
    <button
      type={type}
      className={className ? `${variantClass} ${className}` : variantClass}
      {...props}
    />
  );
}
