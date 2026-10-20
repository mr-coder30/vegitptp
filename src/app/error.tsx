"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/use-translations";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-background)] px-5 py-12 text-[var(--app-foreground)]">
      <section className="w-full max-w-md rounded-[30px] border border-[var(--border-default)] bg-white p-7 text-center shadow-[0_16px_38px_rgba(37,51,43,0.07)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--danger-soft)] text-2xl font-bold text-[var(--brand-primary)]">
          !
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">
          {t.errors.unexpectedTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {t.errors.unexpectedDescription}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--brand-primary)] px-6 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            {t.errors.retry}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[var(--border-default)] bg-white px-6 text-sm font-bold text-[var(--brand-primary)] transition active:scale-[0.98]"
          >
            {t.errors.backHome}
          </Link>
        </div>
      </section>
    </main>
  );
}
