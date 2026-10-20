"use client";

import Link from "next/link";
import { useTranslations } from "@/lib/use-translations";

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M12 8v13" />
      <path d="M3 12h18" />
      <path d="M12 8H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Z" />
      <path d="M12 8h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8Z" />
    </svg>
  );
}

export default function RewardsPage() {
  const t = useTranslations();

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label={t.common.back}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)] transition active:scale-[0.95]"
          >
            <ArrowLeftIcon />
          </Link>

          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.035em] text-[var(--app-foreground)]">
              {t.rewards.title}
            </h1>
          </div>
        </div>

        {/* Main card */}
        <section className="mt-6 rounded-[30px] border border-[var(--brand-border)] bg-white p-6 text-center shadow-[0_16px_38px_rgba(37,51,43,0.07)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[21px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
            <GiftIcon />
          </div>

          <h2 className="mt-5 text-[21px] font-bold tracking-[-0.03em] text-[var(--app-foreground)]">
            {t.rewards.comingTitle}
          </h2>

          <p className="mx-auto mt-4 max-w-[300px] text-[13px] leading-6 text-[var(--text-muted)]">
            {t.rewards.description}
          </p>

          <div className="mt-6 rounded-[19px] bg-[var(--app-background)] px-4 py-3">
            <p className="text-[11px] font-bold text-[var(--brand-primary)]">
              {t.rewards.availableSoon}
            </p>
          </div>
        </section>

        <p className="mt-7 text-center text-[10px] font-medium text-[var(--tone-light)]">
          VegItPTP · {t.navigation.tagline}
        </p>
      </div>
    </main>
  );
}