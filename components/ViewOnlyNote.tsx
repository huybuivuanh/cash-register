/** Shown to staff, who can see everything but not change anything. */
export function ViewOnlyNote() {
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 print:hidden">
      View only. Your account can see everything but can&apos;t make changes. Ask an admin.
    </p>
  );
}
