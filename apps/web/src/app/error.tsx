"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Не отправляем текст ошибки на сервер: в нём могут быть данные игрока
    console.error("Route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-display text-4xl text-gilded">Что-то пошло не так</h1>
      <p className="mt-4 text-sm leading-relaxed text-bone-400">
        Страница не загрузилась. Проверьте связь и попробуйте ещё раз. / The page failed to load. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-gold-400/70 px-6 py-3 text-gold-100 transition hover:border-gold-300"
      >
        Повторить / Retry
      </button>
    </main>
  );
}
