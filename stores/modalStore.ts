import { create } from "zustand";

type ModalKind = "confirm" | "alert";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type AlertOptions = {
  title?: string;
  confirmLabel?: string;
};

interface ModalState {
  open: boolean;
  kind: ModalKind;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: ((value: boolean) => void) | null;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, options?: AlertOptions) => Promise<void>;
  resolveModal: (value: boolean) => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  open: false,
  kind: "alert",
  title: "",
  message: "",
  confirmLabel: "OK",
  cancelLabel: "Cancel",
  danger: false,
  resolve: null,

  confirm: (message, options = {}) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        kind: "confirm",
        title: options.title ?? "",
        message,
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        danger: options.danger ?? false,
        resolve,
      });
    }),

  alert: (message, options = {}) =>
    new Promise<void>((resolve) => {
      set({
        open: true,
        kind: "alert",
        title: options.title ?? "",
        message,
        confirmLabel: options.confirmLabel ?? "OK",
        cancelLabel: "",
        danger: false,
        resolve: () => resolve(),
      });
    }),

  resolveModal: (value) => {
    get().resolve?.(value);
    set({ open: false, resolve: null });
  },
}));

export function confirmDialog(message: string, options?: ConfirmOptions) {
  return useModalStore.getState().confirm(message, options);
}

export function alertDialog(message: string, options?: AlertOptions) {
  return useModalStore.getState().alert(message, options);
}
