/** Pages without a section sidebar: a single centered column. */
export default function StandardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 min-w-0">
      {children}
    </main>
  );
}
