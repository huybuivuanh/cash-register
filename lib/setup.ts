/** One-time setup for a new account: its business and store info. */
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { STORE_SETTINGS_DEFAULTS } from "@/stores/storeSettingsStore";

export type StoreInfo = Pick<
  StoreSettings,
  "name" | "address" | "phone" | "receiptHeader" | "receiptFooter"
>;

/** Trims every field. */
export function cleanStoreInfo(info: StoreInfo): StoreInfo {
  return {
    name: info.name.trim(),
    address: info.address.trim(),
    phone: info.phone.trim(),
    receiptHeader: info.receiptHeader.trim(),
    receiptFooter: info.receiptFooter.trim(),
  };
}

/** Error message for missing required fields (name, address, phone), or null. */
export function storeInfoError(info: StoreInfo): string | null {
  if (!info.name.trim()) return "Enter the business name.";
  if (!info.address.trim()) return "Enter the address.";
  if (!info.phone.trim()) return "Enter the phone number.";
  return null;
}

/**
 * Saves the store info, making the account the admin of a new business first
 * if it doesn't have one. A new business's id is the founder's user id, which
 * is also what the security rules require.
 */
export async function setUpBusiness(
  uid: string,
  existing: Member | null,
  info: StoreInfo,
): Promise<Member> {
  let member = existing;
  if (!member) {
    member = { businessId: uid, role: "admin" };
    await setDoc(doc(db, "members", uid), member);
  }
  await setDoc(doc(db, "businesses", member.businessId), {
    ...STORE_SETTINGS_DEFAULTS,
    ...cleanStoreInfo(info),
  });
  return member;
}
