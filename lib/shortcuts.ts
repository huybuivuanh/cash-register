/**
 * Keyboard shortcuts for tax buttons. A shortcut is saved as the physical key
 * (`KeyboardEvent.code`, e.g. "NumpadDivide", "KeyQ"), so the numpad "-" and
 * the main "-" are different keys and Shift / Caps Lock don't matter.
 */

/** Keys the register already uses, plus keys that would break the page. */
const RESERVED = new Set([
  "Enter", "NumpadEnter", // ENTER
  "ShiftLeft", "ShiftRight", // SUBTOTAL
  "Backspace", "Delete", // CLR
  "Escape", // cancel sale
  "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight", "OSLeft", "OSRight",
  "Tab", "CapsLock", "NumLock", "ContextMenu",
  "F5", "F11", "F12", // refresh, full screen, developer tools
]);

/** Why a key can't be a shortcut, or null if it can. */
export function reservedKeyReason(code: string): string | null {
  if (/^(Digit|Numpad)\d$/.test(code)) return "Number keys type amounts.";
  if (RESERVED.has(code)) return `${keyLabel(code)} is already used by the register or the browser.`;
  return null;
}

const NAMES: Record<string, string> = {
  NumpadDivide: "Numpad /",
  NumpadMultiply: "Numpad *",
  NumpadSubtract: "Numpad -",
  NumpadAdd: "Numpad +",
  NumpadDecimal: "Numpad .",
  NumpadComma: "Numpad ,",
  NumpadEqual: "Numpad =",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  AltLeft: "Alt",
  AltRight: "Alt",
  NumpadEnter: "Enter",
};

/** Short name for a key: "KeyQ" → "Q", "NumpadDivide" → "Numpad /", "F1" → "F1". */
export function keyLabel(code: string): string {
  if (NAMES[code]) return NAMES[code];
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1];
  return code;
}
