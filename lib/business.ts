/**
 * The signed-in staff member's business. Every collection lives under
 * businesses/{businessId}/..., so one business never sees another's data.
 *
 * members/{uid} = { businessId } links a login to its business. AuthContext
 * reads it after sign-in and calls `setBusinessId` before any data loads.
 */
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

let currentBusinessId: string | null = null;

export function setBusinessId(id: string | null) {
  currentBusinessId = id;
}

function businessId(): string {
  if (!currentBusinessId) throw new Error("No business is loaded. Sign out and sign in again.");
  return currentBusinessId;
}

/** The current business's own document, which holds its settings (store info, counters, GT). */
export function businessDoc() {
  return doc(db, "businesses", businessId());
}

/** A collection of the current business, e.g. bizCollection("taxes"). */
export function bizCollection(name: string) {
  return collection(db, "businesses", businessId(), name);
}

/** A document of the current business, e.g. bizDoc("batches", id). */
export function bizDoc(name: string, id: string) {
  return doc(db, "businesses", businessId(), name, id);
}

/** A login's member record, or null if it isn't linked to a business yet. */
export async function loadMember(uid: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, "members", uid));
  const data = snap.data();
  if (typeof data?.businessId !== "string" || !data.businessId) return null;
  return { businessId: data.businessId, role: data.role === "admin" ? "admin" : "staff" };
}

/** True once the business's one-time setup (store info) has been saved. */
export async function isBusinessSetUp(businessId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "businesses", businessId));
  return snap.exists();
}
