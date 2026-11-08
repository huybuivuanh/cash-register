import { create } from "zustand";
import { onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { businessDoc } from "@/lib/business";

interface StoreSettingsState {
  settings: StoreSettings | null;
  loading: boolean;
  error: string | null;
  /** Starts a live listener; returns a function that stops it. */
  listen: () => Unsubscribe;
  updateSettings: (patch: Partial<StoreSettings>) => Promise<void>;
  reset: () => void;
}

/** Settings live on the current business's own document. */
const settingsDoc = () => businessDoc();

/** Used until the settings doc is first saved. */
export const STORE_SETTINGS_DEFAULTS: StoreSettings = {
  name: "",
  address: "",
  phone: "",
  receiptHeader: "",
  receiptFooter: "THANK YOU, CALL AGAIN",
  timezone: "America/Regina",
  nextSeqNumber: 1,
  nextZNumber: 1,
  grandTotal: 0,
  openBatchId: null,
  autoPrint: false,
};

export const useStoreSettingsStore = create<StoreSettingsState>((set) => ({
  settings: null,
  loading: false,
  error: null,

  reset: () => {
    set({ settings: null, loading: false, error: null });
  },

  listen: () => {
    set({ loading: true, error: null });
    return onSnapshot(
      settingsDoc(),
      (snapshot) => {
        set({
          settings: snapshot.exists()
            ? ({ ...STORE_SETTINGS_DEFAULTS, ...snapshot.data() } as StoreSettings)
            : STORE_SETTINGS_DEFAULTS,
          loading: false,
          error: null,
        });
      },
      (err) => set({ error: err.message || "Failed to fetch store settings", loading: false }),
    );
  },

  updateSettings: async (patch) => {
    set({ error: null });
    try {
      await setDoc(settingsDoc(), patch, { merge: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      set({ error: message });
      throw err;
    }
  },
}));
