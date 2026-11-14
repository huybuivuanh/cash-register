import { create } from "zustand";
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { bizCollection, bizDoc } from "@/lib/business";

type TaxInput = Omit<Tax, "id">;

interface TaxesState {
  taxes: Tax[];
  loading: boolean;
  error: string | null;
  /** Starts a live listener; returns a function that stops it. */
  listen: () => Unsubscribe;
  addTax: (tax: TaxInput) => Promise<void>;
  updateTax: (id: string, patch: Partial<TaxInput>) => Promise<void>;
  /** Removes it for good. Past sales keep their own copy, so they don't change. */
  deleteTax: (id: string) => Promise<void>;
  /** Saves a new order: the first id gets order 1, the next 2, and so on. */
  setOrder: (ids: string[]) => Promise<void>;
  /** Clear cache on logout */
  reset: () => void;
}

export const useTaxesStore = create<TaxesState>((set) => ({
  taxes: [],
  loading: false,
  error: null,

  reset: () => {
    set({ taxes: [], loading: false, error: null });
  },

  listen: () => {
    set({ loading: true, error: null });
    return onSnapshot(
      bizCollection("taxes"),
      (snapshot) => {
        const taxes: Tax[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: (data.name as string) ?? "",
            label: (data.label as string) ?? "",
            rateBps: (data.rateBps as number) ?? 0,
            order: (data.order as number) ?? 0,
            active: (data.active as boolean) ?? true,
          };
        });
        taxes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
        set({ taxes, loading: false, error: null });
      },
      (err) => set({ error: err.message || "Failed to fetch taxes", loading: false }),
    );
  },

  addTax: async (tax) => {
    set({ error: null });
    try {
      await addDoc(bizCollection("taxes"), tax);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to add tax" });
      throw err;
    }
  },

  updateTax: async (id, patch) => {
    set({ error: null });
    try {
      await updateDoc(bizDoc("taxes", id), patch);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update tax" });
      throw err;
    }
  },

  deleteTax: async (id) => {
    set({ error: null });
    try {
      await deleteDoc(bizDoc("taxes", id));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete tax" });
      throw err;
    }
  },

  setOrder: async (ids) => {
    set({ error: null });
    try {
      const batch = writeBatch(db);
      ids.forEach((id, i) => batch.update(bizDoc("taxes", id), { order: i + 1 }));
      await batch.commit();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to reorder taxes" });
      throw err;
    }
  },
}));
