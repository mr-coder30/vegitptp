"use client";

import { useRouter } from "next/navigation";
import CustomerAuth from "@/components/customer/customer-auth";
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

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations();

  function handleAuthenticated() {
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[var(--app-background)] px-4 pb-10 pt-5 text-[var(--app-foreground)]">
      <div className="mx-auto w-full max-w-md">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-[var(--border-default)] bg-white text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(37,51,43,0.05)] transition active:scale-[0.95]"
        >
          <ArrowLeftIcon />
        </button>

        {/* Header */}
        <div className="mt-8 rounded-[30px] border border-[var(--border-default)] bg-white p-5 shadow-[0_16px_38px_rgba(37,51,43,0.07)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
            <LockIcon />
          </div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
            VegItPTP
          </p>

          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.035em] text-[var(--app-foreground)]">
            {t.login.title}
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {t.login.description}
          </p>

          <div className="mt-6">
            <CustomerAuth
              onAuthenticated={handleAuthenticated}
            />
          </div>
        </div>
      </div>
    </main>
  );
}