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

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function PackageIcon() {
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
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.5 7.5 7.5 4 7.5-4" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function TruckIcon() {
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
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="1.8" />
      <circle cx="18" cy="19" r="1.8" />
    </svg>
  );
}

function UserIcon() {
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
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5" />
    </svg>
  );
}

function PhoneIcon() {
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
      <path d="M7.2 4h2.1l1.3 4-2 1.6a14.5 14.5 0 0 0 5.8 5.8l1.6-2 4 1.3v2.1c0 1.1-.9 2-2 2C11.4 20.8 3.2 12.6 3.2 2c0-1.1.9-2 2-2h2Z" />
    </svg>
  );
}

function HelpRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-4 transition hover:bg-[var(--surface-warm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[var(--app-foreground)]">
          {title}
        </p>

        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
          {subtitle}
        </p>
      </div>

      <ArrowRightIcon />
    </Link>
  );
}

export default function HelpPage() {
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
              {t.help.title}
            </h1>
          </div>
        </div>

        {/* Intro */}
        <section className="mt-6 rounded-[30px] border border-[var(--brand-border)] bg-white p-5 shadow-[0_16px_38px_rgba(37,51,43,0.07)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-[var(--brand-soft)] text-[var(--brand-primary)]">
            <UserIcon />
          </div>

          <h2 className="mt-4 text-[20px] font-bold tracking-[-0.025em] text-[var(--app-foreground)]">
            {t.help.introTitle}
          </h2>

          <p className="mt-3 text-[13px] leading-6 text-[var(--text-muted)]">
            {t.help.introDescription}
          </p>
        </section>

        {/* Help options */}
        <section className="mt-6">
          <p className="mb-3 text-[17px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
            {t.help.topics}
          </p>

          <div className="overflow-hidden rounded-[26px] border border-[var(--border-default)] bg-white shadow-[0_12px_30px_rgba(37,51,43,0.055)]">
            <HelpRow
              icon={<PackageIcon />}
              title={t.help.orderTitle}
              subtitle={t.help.orderDescription}
              href="/orders"
            />

            <div className="mx-4 h-px bg-[var(--border-default)]" />

            <HelpRow
              icon={<TruckIcon />}
              title={t.help.deliveryTitle}
              subtitle={t.help.deliveryDescription}
              href="/orders"
            />

            <div className="mx-4 h-px bg-[var(--border-default)]" />

            <HelpRow
              icon={<UserIcon />}
              title={t.help.accountTitle}
              subtitle={t.help.accountDescription}
              href="/profile"
            />
          </div>
        </section>

        {/* Frequently asked questions */}
        <section className="mt-6">
          <h2 className="mb-3 text-[17px] font-bold tracking-[-0.02em] text-[var(--app-foreground)]">
            {t.help.faqTitle}
          </h2>
          <div className="divide-y divide-[var(--border-default)] overflow-hidden rounded-[26px] border border-[var(--border-default)] bg-white shadow-[0_12px_30px_rgba(37,51,43,0.055)]">
            {[
              [t.help.orderQuestion, t.help.orderAnswer],
              [t.help.deliveryQuestion, t.help.deliveryAnswer],
              [t.help.paymentQuestion, t.help.paymentAnswer],
              [t.help.accountQuestion, t.help.accountAnswer],
            ].map(([question, answer]) => (
              <details key={question} className="group px-4 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-bold text-[var(--app-foreground)] marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]">
                  <span>{question}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg leading-none text-[var(--brand-primary)] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 pr-6 text-[12px] leading-5 text-[var(--text-muted)]">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mt-6 rounded-[26px] border border-[var(--border-default)] bg-white p-5 shadow-[0_12px_30px_rgba(37,51,43,0.055)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--danger-soft)] text-[var(--danger-text)]">
              <PhoneIcon />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-[var(--app-foreground)]">
                {t.help.contactTitle}
              </p>

              <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
                {t.help.contactDescription}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href="tel:+919182279226"
                  className="flex min-h-11 items-center justify-center rounded-[16px] bg-[var(--brand-primary)] px-4 text-[12px] font-bold text-white transition active:scale-[0.98]"
                >
                  {t.help.contactCall}
                </a>
                <a
                  href={`https://wa.me/919182279226?text=${encodeURIComponent(
                    t.help.whatsappMessage
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center rounded-[16px] border border-[var(--brand-border)] bg-[var(--brand-soft)] px-4 text-[12px] font-bold text-[var(--brand-primary)] transition active:scale-[0.98]"
                >
                  {t.help.contactWhatsApp}
                </a>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-7 pb-2 text-center text-[10px] font-medium text-[var(--tone-light)]">
          VegItPTP · {t.navigation.tagline}
        </p>
      </div>
    </main>
  );
}