/**
 * The one place that lists every data store. AuthContext calls `listenToAllStores`
 * after login / session restore and stops the listeners + `resetAllStores` on logout.
 * Register new stores here.
 */
import { useStoreSettingsStore } from "@/stores/storeSettingsStore";
import { useTaxesStore } from "@/stores/taxesStore";
import { useTaxButtonsStore } from "@/stores/taxButtonsStore";

type DataStore = {
  getState: () => { listen: () => () => void; reset: () => void };
};

const stores: DataStore[] = [useStoreSettingsStore, useTaxesStore, useTaxButtonsStore];

/**
 * Starts a live Firestore listener for every store, so each one stays in sync with
 * the database. Returns a function that stops them all.
 */
export function listenToAllStores(): () => void {
  const stops = stores.map((store) => store.getState().listen());
  return () => {
    for (const stop of stops) stop();
  };
}

/** Clears every store's cached data (on logout). */
export function resetAllStores() {
  for (const store of stores) store.getState().reset();
}
