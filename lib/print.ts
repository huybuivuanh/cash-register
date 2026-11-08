/**
 * Prints only `el` and what's inside it; the rest of the page is left off the
 * paper (see the `html.printing` rules in globals.css). Works for A4 printers
 * and "Save as PDF".
 */
export function printElement(el: HTMLElement | null) {
  if (!el) return;
  const root = document.documentElement;
  const cleanup = () => {
    el.classList.remove("print-area");
    root.classList.remove("printing");
    window.removeEventListener("afterprint", cleanup);
  };
  el.classList.add("print-area");
  root.classList.add("printing");
  window.addEventListener("afterprint", cleanup);
  window.print();
}
