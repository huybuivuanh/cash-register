import { create } from "zustand";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type TaxButtonInput = Omit<TaxButton, "id">;

interface TaxButtonsState {
  taxButtons: TaxButton[];
  loading: boolean;
  error: string | null;
  /** Starts a live listener; returns a function that stops it. */
  listen: () => Unsubscribe;
  addTaxButton: (button: TaxButtonInput) => Promise<void>;
  updateTaxButton: (id: string, patch: Partial<TaxButtonInput>) => Promise<void>;
  /** Clear cache on logout */
  reset: () => void;
}

export const useTaxButtonsStore = create<TaxButtonsState>((set) => ({
  taxButtons: [],
  loading: false,
  error: null,

  reset: () => {
    set({ taxButtons: [], loading: false, error: null });
  },

  listen: () => {
    set({ loading: true, error: null });
    return onSnapshot(
      collection(db, "taxButtons"),
      (snapshot) => {
        const taxButtons: TaxButton[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            label: (data.label as string) ?? "",
            taxIds: (data.taxIds as string[]) ?? [],
            order: (data.order as number) ?? 0,
            active: (data.active as boolean) ?? true,
          };
        });
        taxButtons.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
        set({ taxButtons, loading: false, error: null });
      },
      (err) => set({ error: err.message || "Failed to fetch tax buttons", loading: false }),
    );
  },

  addTaxButton: async (button) => {
    set({ error: null });
    try {
      await addDoc(collection(db, "taxButtons"), button);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to add tax button" });
      throw err;
    }
  },

  updateTaxButton: async (id, patch) => {
    set({ error: null });
    try {
      await updateDoc(doc(db, "taxButtons", id), patch);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update tax button" });
      throw err;
    }
  },
}));
