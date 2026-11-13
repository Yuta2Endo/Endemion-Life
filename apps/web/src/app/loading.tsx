export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-16">
      <div role="status" aria-live="polite" className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-gold-300" aria-hidden="true" />
        <p className="mt-4 text-sm text-bone-400">Загрузка… / Loading…</p>
      </div>
    </main>
  );
}
