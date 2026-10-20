"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/use-translations";

export default function NotFound() {
  const t = useTranslations();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--app-background)] px-5 py-12 text-[var(--app-foreground)]">
      <section className="w-full max-w-md rounded-[30px] border border-[var(--border-default)] bg-white p-7 text-center shadow-[0_16px_38px_rgba(37,51,43,0.07)]">
        <p className="text-[72px] font-extrabold leading-none tracking-[-0.07em] text-[var(--brand-primary)]">
          404
        </p>
        <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">
          {t.errors.notFoundTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {t.errors.notFoundDescription}
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--brand-primary)] px-6 text-sm font-bold text-white transition active:scale-[0.98]"
        >
          {t.errors.backHome}
        </Link>
      </section>
    </main>
  );
}
