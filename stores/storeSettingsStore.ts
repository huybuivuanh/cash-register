import { create } from "zustand";
import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface StoreSettingsState {
  settings: StoreSettings | null;
  loading: boolean;
  error: string | null;
  /** Starts a live listener; returns a function that stops it. */
  listen: () => Unsubscribe;
  updateSettings: (patch: Partial<StoreSettings>) => Promise<void>;
  reset: () => void;
}

const SETTINGS_DOC = doc(db, "settings", "store");

/** Used until the settings doc is first saved. */
const DEFAULTS: StoreSettings = {
  name: "",
  address: "",
  phone: "",
  receiptHeader: "",
  receiptFooter: "THANK YOU, CALL AGAIN",
  timezone: "America/Regina",
  businessDayCutoff: "04:00",
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
      SETTINGS_DOC,
      (snapshot) => {
        set({
          settings: snapshot.exists()
            ? ({ ...DEFAULTS, ...snapshot.data() } as StoreSettings)
            : DEFAULTS,
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
      await setDoc(SETTINGS_DOC, patch, { merge: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      set({ error: message });
      throw err;
    }
  },
}));
