"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { keyLabel } from "@/lib/shortcuts";
import type { TaxKey } from "./Keypad";

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-foreground/25 bg-foreground/5 px-1.5 font-mono text-xs font-semibold">
      {children}
    </kbd>
  );
}

/** How to use the register. Tapping anywhere closes it. */
export function RegisterHelp({
  open,
  onClose,
  taxKeys,
}: {
  open: boolean;
  onClose: () => void;
  taxKeys: TaxKey[];
}) {
  const keys: [ReactNode, string][] = [
    [<Kbd key="d">0–9</Kbd>, "Type an amount"],
    ...taxKeys
      .filter((k) => k.button.shortcut)
      .map(
        (k): [ReactNode, string] => [
          <Kbd key={k.button.id}>{keyLabel(k.button.shortcut!)}</Kbd>,
          `${k.button.label} tax button`,
        ],
      ),
    [<Kbd key="s">Shift</Kbd>, "SUBTOTAL"],
    [<Kbd key="e">Enter</Kbd>, "ENTER"],
    [<Kbd key="b">Backspace</Kbd>, "CLR"],
    [<Kbd key="x">Esc</Kbd>, "CANCEL SALE"],
  ];

  return (
    <Modal open={open} onClose={onClose} title="How to use the register" dismissOnClick>
      <div className="space-y-4 text-sm text-foreground/80">
        <section>
          <h3 className="mb-1 font-semibold text-foreground">Ring up a sale</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Type the amount. Digits fill from the right: 1 2 5 0 → 12.50.</li>
            <li>Press a tax button to add the line. Repeat for more lines.</li>
            <li>Press SUBTOTAL to see the total due.</li>
            <li>Type the cash given and press ENTER, or just ENTER for the exact amount.</li>
          </ol>
          <p className="mt-1">ENTER right after a tax button saves the sale as paid exactly.</p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Other keys</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>CLR removes the last digit you typed; with nothing typed, removes the last line.</li>
            <li>CANCEL SALE throws the current sale away. Nothing is saved.</li>
            <li>
              REFUND switches to refund mode (red). Ring it up like a sale; ENTER pays it out.
              Press REFUND again before adding a line to leave refund mode.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Keyboard</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {keys.map(([key, action], i) => (
              <div key={i} className="contents">
                <dt>{key}</dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose} autoFocus>
          Dismiss
        </Button>
      </div>
    </Modal>
  );
}
