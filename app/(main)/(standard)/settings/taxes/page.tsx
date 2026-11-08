"use client";

import { ViewOnlyNote } from "@/components/ViewOnlyNote";
import { TaxButtonsEditor } from "@/components/settings/TaxButtonsEditor";
import { useAuth } from "@/contexts/AuthContext";
import { TaxesEditor } from "@/components/settings/TaxesEditor";
import { useTaxButtonsStore } from "@/stores/taxButtonsStore";
import { useTaxesStore } from "@/stores/taxesStore";

export default function TaxSettingsPage() {
  const { loading: taxesLoading, error: taxesError } = useTaxesStore();
  const { loading: buttonsLoading, error: buttonsError } = useTaxButtonsStore();
  const { isAdmin } = useAuth();

  if (taxesLoading || buttonsLoading) return <p className="text-foreground/60">Loading…</p>;
  const error = taxesError || buttonsError;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isAdmin && <ViewOnlyNote />}
      <TaxesEditor />
      <TaxButtonsEditor />
    </div>
  );
}
